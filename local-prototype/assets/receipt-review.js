/* Review controls for evidence that cannot safely be inferred from a receipt. */
(function(root){
  root.ReceiptReview = function(m, receipt, setMode, setItems) {
    const h=(tag,props,...children)=>m.jsx(tag,children.length?{...props,children:children.length===1?children[0]:children}:props);
    const inputClass='bg-neutral-950 text-neutral-200 rounded-lg px-2 py-1 text-xs';
    const update=(id,field,value)=>setItems(items=>items.map(x=>x.id===id?{...x,[field]:value}:x));
    const rows=receipt.items;
    if(!Number(receipt.tax)&&!Number(receipt.discount)) return null;
    return h('section',{className:'space-y-3 rounded-xl bg-neutral-900/40 p-4 text-xs text-neutral-300','aria-label':'Tax and discount review'},
      Number(receipt.tax)>0 ? h('label',{className:'flex flex-wrap items-center gap-3'},'Tax split',
        h('select',{className:inputClass,'aria-label':'Tax split method',value:receipt.taxMode||'review',onChange:e=>setMode(e.target.value)},
          h('option',{value:'review'},'Needs review'),
          ...(receipt.taxGroups?.length?[h('option',{value:'groups'},'Use printed tax groups')]:[]),
          h('option',{value:'proportional'},'One tax pool, by taxable item value'),
          h('option',{value:'item'},'Enter tax for each item'))):null,
      receipt.taxMode==='proportional' && Number(receipt.tax)>0 ? h('p',{},'Use one pool only when the same tax treatment applies to all marked items. Resolve each Tax unknown label below.'):null,
      receipt.taxMode==='groups' ? h('div',{className:'space-y-2'},...(receipt.taxGroups||[]).map(g=>h('p',{},
        `${g.label}: $${Number(g.amount).toFixed(2)} on ${g.itemIds.map(id=>rows.find(x=>x.id===id)?.name||'Removed item').join(', ')}`))):null,
      Number(receipt.discount)>0 ? h('div',{className:'space-y-2'},
        h('p',{},'Order discount eligibility must be confirmed. Separate coupons with different targets should be entered as item discounts instead.'),
        h('button',{type:'button',className:inputClass,onClick:()=>setItems(items=>items.map(x=>({...x,orderDiscountEligible:true})))},'Apply order discount to every item')):null,
      receipt.taxMode==='item' || Number(receipt.discount)>0 ? h('div',{className:'space-y-2'},...rows.map(item=>h('div',{className:'flex flex-wrap items-center gap-3'},
        h('span',{className:'flex-1 min-w-32'},item.name),
        receipt.taxMode==='item' ? h('label',{className:'flex items-center gap-2'},'Tax $',h('input',{
          type:'number',min:0,step:'0.01',className:inputClass+' w-24','aria-label':'Tax amount for '+item.name,
          value:item.taxAmount??'',onChange:e=>update(item.id,'taxAmount',e.target.value===''?null:Number(e.target.value))})):null,
        Number(receipt.discount)>0 ? h('select',{className:inputClass,'aria-label':'Discount eligibility for '+item.name,
          value:typeof item.orderDiscountEligible==='boolean'?String(item.orderDiscountEligible):'unknown',
          onChange:e=>update(item.id,'orderDiscountEligible',e.target.value==='unknown'?null:e.target.value==='true')},
          h('option',{value:'unknown'},'Discount unknown'),h('option',{value:'true'},'Discount applies'),h('option',{value:'false'},'Discount excluded')):null))):null);
  };
})(globalThis);
