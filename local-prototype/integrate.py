"""Maintained adapter for the original exported React bundle (idempotent)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
bundle = ROOT / 'assets/index-DKBcKwBR.js'
text = bundle.read_text(encoding='utf-8')

def replace(old, new):
    global text
    if 'globalThis.ReceiptSimple(m,Ya,b,' in text and (old.startswith('date:E.date||') or old.startswith('[W,rt]=') or old == 'type:"date",value:W'):
        return
    evolved = {'price:Number(Yt.originalPrice)||Number(Yt.finalPrice)||0,discount:fa,isTaxable:': 'priceBasis:"line",orderDiscountEligible:',
               ']}),Ka&&m.jsxs("div",{className:"p-3.5': 'globalThis.ReceiptReview(m,Ya,',
               'children:"Live share projection"': 'Resolve receipt details to calculate shares'}
    if old in evolved and evolved[old] in text:
        return
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
replace('isTaxable:!!Yt.taxable,assignedPeopleIds:',
        'isTaxable:Yt.taxable===true?true:Yt.taxable===false?false:null,taxAmount:Yt.taxAmount??null,priceBasis:"line",orderDiscountEligible:Yt.orderDiscountEligible??null,assignedPeopleIds:')
replace('warnings:E.warnings||[]', 'warnings:E.warnings||[],taxMode:E.taxMode||"review",taxGroups:(E.taxGroups||[]).map(group=>({...group,itemIds:group.itemIndexes.map(index=>P[index].id)}))')
replace('})):[]),[dt,ft]=L.useState', '})):[]),[taxMode,setTaxMode]=L.useState(y?.taxMode||l?.taxMode||"review"),[taxGroups,setTaxGroups]=L.useState(y?.taxGroups||l?.taxGroups||[]),[dt,ft]=L.useState')
# Every save path carries the same accounting decisions used by the live preview.
text = text.replace('type:et,status:"ready",items:$', 'type:et,taxMode,taxGroups,status:"ready",items:$')
replace('[s,a.id,nt,W,ht,St,E,_,J,_n,et,$]', '[s,a.id,nt,W,ht,St,E,_,J,_n,et,$,taxMode,taxGroups]')
replace('onClick:()=>me(z.id,!z.isTaxable)', 'onClick:()=>me(z.id,z.isTaxable===null||z.isTaxable===undefined?true:z.isTaxable===true?false:null)')
replace('children:"Taxable"', 'children:z.isTaxable===true?"Taxable":z.isTaxable===false?"Tax exempt":"Tax unknown"')
replace('globalThis.ReceiptMath.validate(Ya,b)&&m.jsx("p",{role:"alert"',
        'globalThis.ReceiptReview(m,Ya,mode=>{setTaxMode(mode);if(mode!=="groups")setTaxGroups([]);if(mode!=="item")st(items=>items.map(item=>({...item,taxAmount:null})))},st),globalThis.ReceiptMath.validate(Ya,b)&&m.jsx("p",{role:"alert"')
replace('children:"Split after discounts"', 'children:qo.length?"Split after discounts":"Resolve receipt details to calculate shares"')
if 'function G5(a){return globalThis.ReceiptMath.settleFolder(a)}' not in text:
    start = text.index('function G5(a){')
    end = text.index('const Mc=', start)
    text = text[:start] + 'function G5(a){return globalThis.ReceiptMath.settleFolder(a)}' + text[end:]
replace('{balances:Z,debts:nt}=G5(a)', '{balances:Z,debts:nt,issue:folderIssue}=G5(a)')
replace('rt=()=>{var J,T;if(a.receipts.length===0)', 'rt=()=>{var J,T;if(folderIssue)return folderIssue;if(a.receipts.length===0)')
replace('children:p&&m.jsxs(Be.div,{initial:{opacity:0,height:0}', 'children:p&&!folderIssue&&m.jsxs(Be.div,{initial:{opacity:0,height:0}')
replace('children:"Settlement strategy"', 'children:folderIssue?"Receipt review required":"Settlement strategy"')
replace('title:"Quantity",children:', 'title:z.priceBasis==="line"?"Whole receipt line. Quantity or weight is included in its name.":"Quantity",children:')
replace('value:z.quantity||1,onChange:', 'disabled:z.priceBasis==="line",value:z.quantity||1,onChange:')
replace('children:"Qty"', 'children:z.priceBasis==="line"?"Line":"Qty"')
replace('title:"Discount deducted per unit"', 'title:z.priceBasis==="line"?"Discount deducted from this line":"Discount deducted per unit"')
replace('title:"Net unit price (Final)"', 'title:z.priceBasis==="line"?"Net line amount":"Net unit price (Final)"')
replace('Lt=Number(E.total)||$+st+dt+ft', 'Lt=E.total==null?$+st+dt+ft-Number(E.discount||0):Number(E.total)')
bundle.write_text(text, encoding='utf-8')
# Keep the detailed editor available, but make the default view a simple split.
replace('nt(F=>[...F,..._])},pt=A=>', 'if(_.length===1){Mt(_[0]);return}nt(F=>[...F,..._])},pt=A=>')
if 'globalThis.ReceiptSimple(m,Ya,b,' not in text:
    start = text.index('Q5=')
    view = text.index('return m.jsxs("div",{className:"max-w-4xl', start)
    content = text.index('children:[', view) + len('children:[')
    modal = text.index(',m.jsx(Oo,{children:w&&', content)
    old = text[content:modal]
    old = old.replace('onClick:c,className:', 'onClick:()=>setEditing(false),className:', 1).replace('"Discard"', '"Back to split"', 1)
    simple = 'globalThis.ReceiptSimple(m,Ya,b,{edit:()=>setEditing(true),back:c,payer:Ut,toggle:an,clear:Zo,clearAll:()=>st(items=>items.map(item=>({...item,assignedPeopleIds:[]}))),save:()=>{if(p){K(f[0]?.id||"");Q("");M(true)}else Fo()}})'
    text = text[:content] + '!editing&&' + simple + ',editing&&m.jsxs("div",{className:"space-y-8",children:[' + old + ']})' + text[modal:]
    hook = text.index('[w,M]=L.useState(!1)', start)
    text = text[:hook] + '[editing,setEditing]=L.useState(false),' + text[hook:]
# Preserve receipt dates; use the user's local calendar date when absent.
text = text.replace('date:E.date||""', 'date:E.date||globalThis.ReceiptMath.localDate()')
text = text.replace('[W,rt]=L.useState(y?y.date:((l==null?void 0:l.date)??""))', '[W,rt]=L.useState((y?y.date:l?.date)||globalThis.ReceiptMath.localDate())')
text = text.replace('Receipt date. Leave blank if unknown.', 'Receipt date')
bundle.write_text(text, encoding='utf-8')
index = ROOT / 'index.html'
html = index.read_text(encoding='utf-8')
if 'receipt-math.js' not in html:
    html = html.replace('<head>', '<head>\n    <script src="/assets/receipt-math.js"></script>')
index.write_text(html, encoding='utf-8')
if 'receipt-review.js' not in html:
    html = html.replace('<head>', '<head>\n    <script src="/assets/receipt-review.js"></script>')
index.write_text(html, encoding='utf-8')
print('Frontend integrated.')
if 'receipt-simple.js' not in html:
    html = html.replace('<head>', '<head>\n    <script src="/assets/receipt-simple.js"></script>\n    <link rel="stylesheet" href="/assets/receipt-simple.css">')
index.write_text(html, encoding='utf-8')
