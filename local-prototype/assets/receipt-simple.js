/* Default receipt view: settlement first, assignment second, editing on request. */
globalThis.ReceiptSimple = function (m, receipt, people, actions) {
  const money = value => '$' + Number(value).toFixed(2);
  const button = (text, onClick, props = {}) => m.jsx('button', {type:'button', onClick, ...props, children:text});
  const issue = ReceiptMath.validate(receipt, people);
  const shares = ReceiptMath.split(receipt, people);
  const payer = people.find(p => p.id === receipt.payerId);
  return m.jsxs('div', {className:'receipt-simple', children:[
    m.jsxs('header', {className:'receipt-heading', children:[
      m.jsxs('div', {children:[m.jsx('h1', {children:receipt.storeName || 'Receipt'}), m.jsx('p', {children:receipt.date})]}),
      button('Save receipt', actions.save, {className:'receipt-primary', disabled:!!issue})
    ]}),
    m.jsxs('label', {className:'receipt-payer', children:['Paid by', m.jsx('select', {value:receipt.payerId, onChange:e=>actions.payer(e.target.value), children:people.map(p=>m.jsx('option',{value:p.id,children:p.name},p.id))})]}),
    issue ? m.jsxs('div', {className:'receipt-check', children:[m.jsx('p', {children:'A few receipt details need checking before we can calculate the split.'}),button('Check details', actions.edit)]}) :
      m.jsx('section', {'aria-label':'Who pays whom', className:'receipt-shares', children:shares.map(share=>{
        const person=people.find(p=>p.id===share.personId), paid=person.id===receipt.payerId;
        return m.jsxs('article', {children:[m.jsx('span',{children:person.name}),m.jsx('strong',{children:money(share.totalShare)}),m.jsx('p',{children:paid ? (share.netDiff>0 ? 'Receives '+money(share.netDiff)+' from the others' : 'Already paid') : (share.totalShare>0 ? 'Pays '+money(share.totalShare)+' to '+payer.name : 'Nothing to pay')})]},person.id);
      })}),
    m.jsxs('section', {className:'receipt-items', children:[
      m.jsxs('div',{className:'receipt-items-heading',children:[m.jsx('h2',{children:'Who is sharing what?'}),button('Clear all',actions.clearAll)]}),
      ...receipt.items.map(item=>{
        const selected=item.assignedPeopleIds||[], shared=selected.length===0;
        const net=(Number(item.price)-Number(item.discount||0))*(item.priceBasis==='line'?1:(item.quantity||1));
        return m.jsxs('article',{className:'receipt-item',children:[
          m.jsxs('div',{className:'receipt-item-name',children:[m.jsxs('div',{className:'receipt-product',children:[m.jsx('span',{className:'receipt-product-title',children:item.name}),item.originalName&&m.jsx('small',{className:'receipt-product-original',children:item.originalName})]}),m.jsx('strong',{children:money(net)})]}),
          m.jsxs('div',{className:'receipt-people',children:[...people.map(person=>button(person.name,()=>actions.toggle(item.id,person.id),{'aria-pressed':selected.includes(person.id),key:person.id})),button('Clear',()=>actions.clear(item.id),{className:'receipt-clear'})]}),
          shared&&m.jsx('small',{children:'Shared equally by everyone'})
        ]},item.id);
      })
    ]}),
    m.jsxs('section',{className:'receipt-totals','aria-label':'Receipt totals',children:[
      m.jsxs('p',{className:'receipt-total',children:[m.jsx('span',{children:'Total'}),m.jsx('strong',{children:money(receipt.total)})]}),
      Number(receipt.discount)>0&&m.jsxs('p',{children:[m.jsx('span',{children:'Order discount included'}),m.jsx('span',{children:'−'+money(receipt.discount)})]}),
      Number(receipt.tip)>0&&m.jsxs('p',{children:[m.jsx('span',{children:'Tip included'}),m.jsx('span',{children:money(receipt.tip)})]}),
      Number(receipt.serviceFee)>0&&m.jsxs('p',{children:[m.jsx('span',{children:'Fees included'}),m.jsx('span',{children:money(receipt.serviceFee)})]}),
      m.jsxs('p',{children:[m.jsx('span',{children:'Tax included'}),m.jsx('span',{children:money(receipt.tax)})]})
    ]}),
    m.jsxs('footer',{children:[button('Edit details',actions.edit),button('Back',actions.back)]})
  ]});
};
