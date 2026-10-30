"""Synthetic accounting fixtures; these are not evidence of OCR accuracy."""
import base64
import copy
import json
import os
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from receipt import cents, normalize, extract, ReceiptError
from server import Handler, ThreadingHTTPServer

BASE = {'store': 'Synthetic Grocery', 'date': '2026-10-29',
        'items': [{'name': 'Apples 2 lb', 'originalPrice': 6, 'finalPrice': 4.5},
                  {'name': 'Cereal 2 packs', 'originalPrice': 10, 'finalPrice': 7}],
        'discount': 1.5, 'tax': .60, 'total': 10.60}


class ReceiptTests(unittest.TestCase):
    def test_unknown_and_malformed_tax_status_stay_unknown(self):
        for status in [None, 'false', 'true', 0, 1, [], {}]:
            data=copy.deepcopy(BASE)
            data['items'][0]['taxable']=status
            self.assertIsNone(normalize(data)['items'][0]['taxable'])

    def test_discount_targets_are_explicit_and_bounded(self):
        data=copy.deepcopy(BASE)
        self.assertTrue(all(i['orderDiscountEligible'] is None for i in normalize(data)['items']))
        data['discountTargets']=[1]
        self.assertEqual([i['orderDiscountEligible'] for i in normalize(data)['items']], [False,True])
        for targets in [[2],[-1],[True],[0,0],'all']:
            data['discountTargets']=targets
            self.assertTrue(all(i['orderDiscountEligible'] is None for i in normalize(data)['items']))

    def test_tax_groups_preserve_overlapping_membership(self):
        data=copy.deepcopy(BASE)
        data.update(taxMode='groups',taxGroups=[{'amount':.2,'itemIndexes':[0]}, {'amount':.4,'itemIndexes':[0,1]}])
        result=normalize(data)
        self.assertEqual(result['taxMode'],'groups')
        self.assertEqual(len(result['taxGroups']),2)

    def test_invalid_tax_groups_require_review(self):
        for groups in [[{'amount':.59,'itemIndexes':[0]}], [{'amount':.60,'itemIndexes':[2]}], [{'amount':.60,'itemIndexes':[0,0]}], None]:
            data=copy.deepcopy(BASE)
            data.update(taxMode='groups',taxGroups=groups)
            result=normalize(data)
            self.assertEqual(result['taxMode'],'review')
            self.assertEqual(result['taxGroups'],[])

    def test_no_tax_pool_inferred_from_product_or_store(self):
        data=copy.deepcopy(BASE)
        data['store']='Whole Foods'
        data['items'][0]['name']='ROTI CKN PLN'
        self.assertEqual(normalize(data)['taxMode'],'review')

    def test_missing_date_warning_not_duplicated(self):
        data = copy.deepcopy(BASE)
        data.update(date='', warnings=['Date not visible on receipt'])
        result = normalize(data)
        self.assertEqual(result['date'], '')
        self.assertEqual(sum('date' in w.lower() for w in result['warnings']), 1)

    def test_impossible_calendar_date_not_accepted(self):
        data = copy.deepcopy(BASE)
        data['date'] = '2026-02-30'
        self.assertEqual(normalize(data)['date'], '')

    def test_clear_tax_markers_need_no_generic_warning(self):
        data = copy.deepcopy(BASE)
        for line in data['items']: line['taxable'] = True
        self.assertFalse(any('Taxable labels' in w for w in normalize(data)['warnings']))

    def test_whole_foods_transcribed_line_totals(self):
        amounts = [699,199,399,499,799,299,99,120,298,349,91,299,316,77,250,169]
        data = {'items': [{'name': f'Row {i+1}', 'originalPrice': v/100, 'finalPrice': v/100, 'taxable': i == 4} for i,v in enumerate(amounts)], 'tax': .71, 'total': 50.33}
        result = normalize(data)
        self.assertEqual(sum(cents(i['finalPrice']) for i in result['items']), 4962)
        self.assertTrue(result['reconciliation']['balanced'])
        self.assertEqual(len(result['items']), 16)

    def test_item_and_order_discounts(self):
        result = normalize(BASE)
        self.assertTrue(result['reconciliation']['balanced'])
        self.assertEqual(result['items'][0]['discount'], 1.5)
        self.assertEqual(result['discount'], 1.5)

    def test_weighted_lines_are_not_multiplied(self):
        data = copy.deepcopy(BASE)
        data['items'][0]['quantity'] = 2
        self.assertEqual(normalize(data)['items'][0]['quantity'], 1)

    def test_free_item(self):
        data = {'items': [{'name': 'BOGO free', 'originalPrice': 5, 'finalPrice': 0}], 'tax': 0, 'total': 0}
        self.assertEqual(normalize(data)['items'][0]['discount'], 5)

    def test_summary_savings_do_not_deduct_twice(self):
        data = {'items': [{'name': 'Member price', 'originalPrice': 7, 'finalPrice': 7}],
                'savingsSummary': 3, 'tax': 0, 'total': 7}
        self.assertTrue(normalize(data)['reconciliation']['balanced'])

    def test_mismatch_is_not_silently_adjusted(self):
        data = copy.deepcopy(BASE)
        data['total'] = 11.60
        result = normalize(data)
        self.assertFalse(result['reconciliation']['balanced'])
        self.assertEqual(result['reconciliation']['difference'], 1)

    def test_unknown_total_rejected(self):
        data = copy.deepcopy(BASE)
        data['total'] = None
        with self.assertRaises(ReceiptError): normalize(data)

    def test_missing_tax_not_invented_as_zero(self):
        data=copy.deepcopy(BASE)
        del data['tax']
        with self.assertRaises(ReceiptError): normalize(data)

    def test_nonfinite_rejected(self):
        for x in ['NaN', 'Infinity', True, None]:
            with self.assertRaises(ReceiptError): cents(x)

    def test_return_rejected(self):
        data = copy.deepcopy(BASE)
        data['items'][0]['finalPrice'] = -3
        with self.assertRaises(ReceiptError): normalize(data)

    def test_decimal_rounding(self):
        self.assertEqual(cents('1.005'), 101)

    def test_missing_key(self):
        with patch.dict(os.environ, {'RECEIPT_PROVIDER': 'gemini', 'GEMINI_API_KEY': ''}):
            with self.assertRaisesRegex(ReceiptError, 'API key'):
                extract({'mimeType': 'image/png', 'imageBase64': base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()})

    def test_invalid_image(self):
        with self.assertRaises(ReceiptError): extract({'mimeType': 'image/png', 'imageBase64': 'bad'})

    def test_mocked_model_response(self):
        from io import BytesIO
        response = {'candidates': [{'content': {'parts': [{'text': json.dumps(BASE)}]}}]}
        with patch.dict(os.environ, {'RECEIPT_PROVIDER': 'gemini', 'GEMINI_API_KEY': 'test-not-real'}), patch('receipt.urlopen', return_value=BytesIO(json.dumps(response).encode())):
            result = extract({'mimeType': 'image/png', 'imageBase64': base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()})
        self.assertTrue(result['reconciliation']['balanced'])

    def test_kimi_request_and_discount_response(self):
        from io import BytesIO
        response = {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(BASE)}}]}
        with patch.dict(os.environ, {'RECEIPT_PROVIDER': 'kimi', 'KIMI_API_KEY': 'test-not-real', 'KIMI_BASE_URL': 'https://api.moonshot.cn/v1'}), patch('receipt.urlopen', return_value=BytesIO(json.dumps(response).encode())) as send:
            result = extract({'mimeType': 'image/png', 'imageBase64': base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()})
            req = send.call_args.args[0]
            self.assertEqual(req.full_url, 'https://api.moonshot.cn/v1/chat/completions')
            self.assertEqual(req.get_header('Authorization'), 'Bearer test-not-real')
            body = json.loads(req.data)
            self.assertEqual(body['thinking'], {'type': 'disabled'})
            self.assertEqual(body['max_tokens'], 4096)
        self.assertTrue(result['reconciliation']['balanced'])

    def test_kimi_refuses_untrusted_endpoint(self):
        with patch.dict(os.environ, {'RECEIPT_PROVIDER': 'kimi', 'KIMI_API_KEY': 'test-not-real', 'KIMI_BASE_URL': 'https://example.com/v1'}), patch('receipt.urlopen') as send:
            with self.assertRaisesRegex(ReceiptError, 'official'):
                extract({'mimeType': 'image/png', 'imageBase64': base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()})
            send.assert_not_called()

    def test_kimi_missing_key_does_not_fall_back(self):
        with patch.dict(os.environ, {'RECEIPT_PROVIDER': 'kimi', 'KIMI_API_KEY': '', 'GEMINI_API_KEY': 'test-not-real'}), patch('receipt.urlopen') as send:
            with self.assertRaisesRegex(ReceiptError, 'KIMI_API_KEY'):
                extract({'mimeType': 'image/png', 'imageBase64': base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()})
            send.assert_not_called()


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_static_and_health(self):
        for path in ['/', '/assets/receipt-math.js', '/api/health']:
            with urlopen(self.url + path) as response: self.assertEqual(response.status, 200)

    def test_private_files_and_traversal_blocked(self):
        for path in ['/.env', '/server.py', '/assets/../receipt.py', '/assets/%2e%2e/.env']:
            with self.assertRaises(HTTPError) as error: urlopen(self.url + path)
            self.assertEqual(error.exception.code, 404)

    def test_cross_origin_blocked(self):
        req = Request(self.url + '/api/receipt/parse', data=b'{}', headers={'Origin': 'https://example.com', 'Content-Type': 'application/json'})
        with self.assertRaises(HTTPError) as error: urlopen(req)
        self.assertEqual(error.exception.code, 403)

    def test_invalid_payload(self):
        req = Request(self.url + '/api/receipt/parse', data=b'{', headers={'Content-Type': 'application/json'})
        with self.assertRaises(HTTPError) as error: urlopen(req)
        self.assertEqual(error.exception.code, 422)


if __name__ == '__main__': unittest.main()
