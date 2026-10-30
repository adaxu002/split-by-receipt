# Split by Receipt — local Python prototype

Upload a supermarket receipt, review item discounts and the printed total, assign purchases to people, and split the cost. The existing React interface is retained. A new Python backend calls Kimi or Gemini to extract receipt data; editable JavaScript calculates shares in integer cents.

## Start on Ada's computer

Double-click `Start.cmd`, keep the console open, then open http://localhost:8080.
If the app is already running, just open that URL. Ctrl+C in the server console stops it.
On another computer with Python 3.10+, run `python server.py` from this folder. No Python packages are required.

Manual entry, JSON import, demo data, folders and splitting work without an API key.
To enable real photo recognition, copy `.env.example` to `.env`, set `RECEIPT_PROVIDER=kimi`, enter your own `KIMI_API_KEY` locally, and restart the server. Never upload or commit `.env`. `KIMI_MODEL` defaults to `kimi-k2.5`, with thinking disabled and a 4096-token output cap. Each scan makes one request with no automatic retries. Charges depend on your Kimi account. `KIMI_BASE_URL` defaults to the China endpoint; international accounts use `https://api.moonshot.ai/v1`. Only these official endpoints are allowed; redirects are blocked. Gemini remains available with `RECEIPT_PROVIDER=gemini` and `GEMINI_API_KEY`.

Receipt photos are sent to the selected AI provider only when scanning. The server does not save uploaded images. Saved folders and receipt records remain in this browser's local storage, separate from the deployed website. Clearing browser data removes them. The server binds only to this computer and does not serve private config or source files.

## Accounting rules

- Each recognized row is a whole printed line amount, including all units or weight. It enters the editor with quantity 1; the item name retains printed quantity or weight. Manually entered quantity multiplies the unit price and unit discount.
- Item coupons reduce their matching line. Member prices already shown net are not discounted twice. Savings-summary lines are not additional discounts.
- Additional whole-order discounts are allocated proportionally over net item values. A coupon restricted to certain items must instead be entered on those items. Ambiguous links need human review.
- Tax follows the discounted value of items marked Taxable. If no items are marked, it is shared across all purchases. Multiple tax rates or unclear tax markers require manual review; this is not a state-by-state tax engine.
- Tips and fees are proportional to discounted item shares. An unassigned item is shared equally among current participants.
- Largest-remainder allocation preserves every cent. Saving is blocked when the printed receipt total differs from calculated items, discounts and charges.
- Tender, gift cards, EBT, change and cashback are not purchase discounts.

The extraction prompt is store-independent and covers common US supermarket receipt patterns. No claim of tested coverage for every US supermarket is made. Returns, negative purchases, non-USD receipts, unreadable amounts and complicated coupon eligibility may require manual handling. Always review recognition before saving.

## Validation and source

`python -B -m unittest -v` checks normalization, invalid inputs, simulated model output, missing-key behavior and local HTTP isolation.
`node test_math.cjs` checks quantities, item/order discounts, taxable items, rounding and accounting conservation.
These synthetic fixtures do not measure real-photo recognition accuracy. Real API recognition still needs testing with a user-provided receipt and configured key. Mock tests do not verify account access or recognition accuracy.

`receipt.py` contains extraction and normalization. `server.py` contains the local server. `assets/receipt-math.js` contains the editable accounting source. `integrate.py` is the maintained, idempotent adapter for the original compiled React export; it fails if expected upstream patterns change. The original uncompiled React source was not available.

Original frontend: https://github.com/adaxu002/split-by-receipt
Gemini REST API reference: https://ai.google.dev/api/generate-content

This prototype does not write the course journal or record the student's video.


Kimi official vision API examples: https://huggingface.co/moonshotai/Kimi-K2.5#chat-completion-with-visual-content
