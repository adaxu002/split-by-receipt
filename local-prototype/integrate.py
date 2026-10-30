"""Maintained adapter for the original exported React bundle (idempotent)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
bundle = ROOT / 'assets/index-DKBcKwBR.js'
text = bundle.read_text(encoding='utf-8')

def replace(old, new):
    global text
    if (new and new in text) or (not new and old not in text):
        return
    if text.count(old) != 1:
        raise RuntimeError(f'Upstream bundle changed near {old[:70]}')
    text = text.replace(old, new, 1)

if 'return globalThis.ReceiptMath.split(a,s)' not in text:
    start = text.index('function ky(a,s){')
    end = text.index('function G5(', start)
    text = text[:start] + 'function ky(a,s){return globalThis.ReceiptMath.split(a,s)}' + text[end:]

replace('price:Number(Yt.originalPrice)||Number(Yt.finalPrice)||0,discount:fa,isTaxable:',
        'quantity:1,price:Number(Yt.originalPrice??Yt.finalPrice??0),discount:fa,isTaxable:')
replace('serviceFee:ft,total:Math.round(Lt*100)/100,type:E.type',
        'serviceFee:ft,discount:Number(E.discount)||0,total:Math.round(Lt*100)/100,type:E.type')
text = text.replace('const lt=Math.max(0,(z.price-z.discount)*(z.quantity||1));return m.jsxs',
                    'const lt=Math.max(0,z.price-z.discount);return m.jsxs')
replace('Fo=()=>{if(!nt.trim())',
        'Fo=()=>{const issue=globalThis.ReceiptMath.validate(Ya,b);if(issue){alert(issue);return}if(!nt.trim())')
replace('Po=z=>{var I;z.preventDefault();const lt=',
        'Po=z=>{var I;z.preventDefault();const issue=globalThis.ReceiptMath.validate(Ya,b);if(issue){alert(issue);return}const lt=')
replace('onClick:()=>{var z;if(!nt.trim())',
        'onClick:()=>{var z;const issue=globalThis.ReceiptMath.validate(Ya,b);if(issue){alert(issue);return}if(!nt.trim())')
replace('onClick:c,className:"h-10 px-5 bg-indigo-600',
        'onClick:()=>{const issue=globalThis.ReceiptMath.validate(Ya,b);if(issue){alert(issue);return}c()},className:"h-10 px-5 bg-indigo-600')
replace(']}),Ka&&m.jsxs("div",{className:"p-3.5',
        ']}),(y?.warnings?.length>0)&&m.jsx("div",{className:"p-4 rounded-xl bg-amber-500/5 text-amber-200 text-xs space-y-2",children:y.warnings.map((warning,index)=>m.jsx("p",{children:warning},index))}),globalThis.ReceiptMath.validate(Ya,b)&&m.jsx("p",{role:"alert",className:"text-amber-200 text-xs",children:globalThis.ReceiptMath.validate(Ya,b)}),Ka&&m.jsxs("div",{className:"p-3.5')
replace('Save to a folder after the split.',
        'Receipts stay in this browser. Scanning sends your photo to your configured AI provider.')
replace('children:"Offline Sandbox database"', 'children:"Stored in this browser"')
replace('m.jsx("span",{className:"text-neutral-850",children:"/"}),', '')
replace('Reading receipt details and listing item items.', 'Reading items, discounts and totals.')
replace('children:"Group / Participants"', 'children:"Participants"')
text = text.replace('m.jsx("span",{className:"text-neutral-700",children:"/"}),', '')
replace('children:"Total Override"', 'children:"Receipt total"')
replace('children:"Live share projection"', 'children:"Split after discounts"')
replace('date:E.date||new Date().toISOString().split("T")[0]', 'date:E.date||""')
replace('[W,rt]=L.useState(y?y.date:(l==null?void 0:l.date)||new Date().toISOString().split("T")[0])',
        '[W,rt]=L.useState(y?y.date:((l==null?void 0:l.date)??""))')
text = text.replace('new Date().toISOString().split("T")[0]', 'globalThis.ReceiptMath.localDate()')
replace('type:"date",value:W', 'type:"date",title:"Receipt date. Leave blank if unknown.",value:W')
bundle.write_text(text, encoding='utf-8')
index = ROOT / 'index.html'
html = index.read_text(encoding='utf-8')
if 'receipt-math.js' not in html:
    html = html.replace('<head>', '<head>\n    <script src="/assets/receipt-math.js"></script>')
index.write_text(html, encoding='utf-8')
print('Frontend integrated.')
