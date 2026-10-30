/* Deterministic accounting. Receipt evidence and user decisions enter here; no store rules. */
(function (root) {
  const present = x => x !== null && x !== undefined && x !== '';
  const valid = x => present(x) && typeof x !== 'boolean' && Number.isFinite(Number(x)) && Number(x) >= 0 && Number(x) <= 1000000;
  const cent = x => Math.round((Number(x) + Number.EPSILON) * 100);
  const optional = x => x === undefined ? 0 : x;
  function allocate(total, weights) {
    if (!Number.isSafeInteger(total) || total < 0 || weights.some(w => !Number.isSafeInteger(w) || w < 0)) throw Error('Invalid allocation amounts.');
    const sum = weights.reduce((a,b) => a+b,0);
    if (!Number.isSafeInteger(sum)) throw Error('Allocation is too large.');
    if (total && !sum) throw Error('A positive charge needs an eligible amount.');
    if (!sum) return weights.map(() => 0);
    const den = BigInt(sum);
    const numerators = weights.map(w => BigInt(total) * BigInt(w));
    const result = numerators.map(n => Number(n / den));
    const order = numerators.map((v,i)=>({i,remainder:v%den})).sort((a,b)=>a.remainder===b.remainder?a.i-b.i:a.remainder>b.remainder?-1:1);
    const remaining = total-result.reduce((a,b)=>a+b,0);
    for(let i=0;i<remaining;i++) result[order[i].i]++;
    return result;
  }
  function linePlan(receipt) {
    if (!Array.isArray(receipt.items) || !receipt.items.length) throw Error('Add at least one item.');
    const items = receipt.items;
    if (new Set(items.map(i=>i.id)).size !== items.length) throw Error('Item identifiers must be unique.');
    for (const key of ['tax','tip','serviceFee','total']) if (!valid(receipt[key])) throw Error('Enter the missing or invalid '+key+' amount.');
    if (!valid(optional(receipt.discount))) throw Error('Enter a valid order discount.');
    const lines = items.map(item => {
      const qty = item.quantity ?? 1;
      if (!valid(item.price) || !valid(optional(item.discount)) || cent(optional(item.discount)) > cent(item.price)) throw Error('Check item prices and discounts.');
      if (!Number.isInteger(qty) || qty<1 || qty>10000) throw Error('Check item quantities.');
      if(item.priceBasis==='line' && qty!==1) throw Error('Scanned prices are line totals. Keep quantity 1; the name contains the purchased quantity or weight.');
      return (cent(item.price)-cent(optional(item.discount)))*qty;
    });
    const subtotal = lines.reduce((a,b)=>a+b,0);
    const discount = cent(optional(receipt.discount));
    if (discount>subtotal) throw Error('The order discount exceeds the items total.');
    let discounts = lines.map(()=>0);
    if (discount) {
      if (items.some(x=>typeof x.orderDiscountEligible !== 'boolean')) throw Error('Choose which items the order discount applies to. Unknown eligibility cannot be shared automatically.');
      const eligible = lines.map((v,i)=>items[i].orderDiscountEligible?v:0);
      if (discount>eligible.reduce((a,b)=>a+b,0)) throw Error('The order discount exceeds its eligible items.');
      discounts = allocate(discount,eligible);
    }
    const net = lines.map((v,i)=>v-discounts[i]);
    const tax = cent(receipt.tax);
    const taxes = lines.map(()=>0);
    if (tax) {
      if (receipt.taxMode==='item') {
        items.forEach((x,i)=>{
          if(!valid(x.taxAmount)) throw Error('Enter tax for every item, including 0 for exempt items.');
          if(x.isTaxable===false && cent(x.taxAmount)>0) throw Error('An exempt item has tax. Correct its tax status or tax amount.');
          taxes[i]=cent(x.taxAmount);
        });
        if(taxes.reduce((a,b)=>a+b,0)!==tax) throw Error('Item tax amounts do not match the printed tax total.');
      } else if (receipt.taxMode==='groups') {
        if (!Array.isArray(receipt.taxGroups)||!receipt.taxGroups.length) throw Error('Tax groups are missing. Choose a tax split method.');
        let sum=0;
        const covered=new Set();
        for(const group of receipt.taxGroups) {
          if(!valid(group.amount) || !Array.isArray(group.itemIds) || !group.itemIds.length || new Set(group.itemIds).size!==group.itemIds.length || group.itemIds.some(id=>!items.some(x=>x.id===id))) throw Error('A tax group has invalid or removed items. Review the tax split.');
          const weights=net.map((v,i)=>group.itemIds.includes(items[i].id)?v:0);
          group.itemIds.forEach(id=>covered.add(id));
          if(cent(group.amount)>0 && items.some(x=>group.itemIds.includes(x.id)&&x.isTaxable===false)) throw Error('A tax group includes an exempt item. Review its tax status.');
          const base=weights.reduce((a,b)=>a+b,0);
          if(present(group.baseAmount) && (!valid(group.baseAmount)||cent(group.baseAmount)!==base)) throw Error('A printed tax base differs from its discounted items. Review coupon tax treatment or enter tax per item.');
          const shares=allocate(cent(group.amount),weights);
          shares.forEach((v,i)=>taxes[i]+=v); sum+=cent(group.amount);
        }
        if(sum!==tax) throw Error('Tax group amounts do not match the printed tax total.');
        if(items.some((item,i)=>net[i]>0&&!covered.has(item.id)&&item.isTaxable!==false)) throw Error('An item outside the tax groups is not confirmed exempt. Review its tax status or group membership.');
      } else if (receipt.taxMode==='proportional') {
        if(items.some(x=>typeof x.isTaxable!=='boolean')) throw Error('Resolve unknown tax status for every item before splitting tax.');
        const weights=net.map((v,i)=>items[i].isTaxable?v:0);
        if(!weights.some(v=>v>0)) throw Error('Tax is positive but there are no taxable amounts. Review the tax split; it will not be spread across exempt items.');
        allocate(tax,weights).forEach((v,i)=>taxes[i]=v);
      } else throw Error('Choose a tax split method after checking the receipt. Different or unknown tax bases cannot be assumed to share one rate.');
    } else if(items.some(x=>present(x.taxAmount)&&(!valid(x.taxAmount)||cent(x.taxAmount)>0)) || (receipt.taxGroups||[]).some(g=>!valid(g.amount)||cent(g.amount)>0)) {
      throw Error('Item or group tax conflicts with the zero tax total. Review the tax details.');
    }
    const expected = subtotal-discount+tax+cent(receipt.tip)+cent(receipt.serviceFee);
    if(expected!==cent(receipt.total)) throw Error(`Receipt total differs by $${((cent(receipt.total)-expected)/100).toFixed(2)}. Correct the items, discounts or receipt total before saving.`);
    const tips=allocate(cent(receipt.tip),net), fees=allocate(cent(receipt.serviceFee),net);
    return {net,taxes,tips,fees,discounts};
  }
  function validate(receipt, people) {
    try {
      if(!people.length || new Set(people.map(p=>p.id)).size!==people.length) throw Error('Add valid participants.');
      if(!people.some(p=>p.id===receipt.payerId)) throw Error('Choose who paid.');
      if(receipt.items.some(x=>(x.assignedPeopleIds||[]).some(id=>!people.some(p=>p.id===id)))) throw Error('An item refers to a removed participant.');
      linePlan(receipt);
      return '';
    } catch(error) { return error.message; }
  }
  function split(receipt, people) {
    if(validate(receipt,people)) return [];
    const plan=linePlan(receipt);
    const amounts=people.map(()=>({itemSubtotal:0,taxShare:0,tipShare:0,serviceFeeShare:0}));
    const fields={net:'itemSubtotal',taxes:'taxShare',tips:'tipShare',fees:'serviceFeeShare'};
    receipt.items.forEach((item,i)=>{
      let indices=people.map((p,j)=>(item.assignedPeopleIds||[]).includes(p.id)?j:-1).filter(j=>j>=0);
      if(!indices.length) indices=people.map((p,j)=>j);
      for(const [source,target] of Object.entries(fields)) {
        const shares=allocate(plan[source][i],indices.map(()=>1));
        indices.forEach((j,k)=>amounts[j][target]+=shares[k]);
      }
    });
    return people.map((p,i)=>{
      const share=Object.values(amounts[i]).reduce((a,b)=>a+b,0);
      return {personId:p.id,...Object.fromEntries(Object.entries(amounts[i]).map(([k,v])=>[k,v/100])),totalShare:share/100,
        netDiff:(p.id===receipt.payerId?cent(receipt.total)-share:-share)/100};
    });
  }
  function localDate(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  function settleFolder(folder) {
    const balances=Object.fromEntries(folder.people.map(p=>[p.id,{paid:0,consumed:0,net:0}]));
    const active=folder.receipts.filter(r=>r.status!=='settled');
    const invalid=active.find(r=>validate(r,folder.people));
    if(invalid) return {balances,debts:[],issue:'Review '+(invalid.storeName||'receipt')+' before calculating folder settlement.'};
    for(const receipt of active) {
      balances[receipt.payerId].paid+=cent(receipt.total);
      for(const share of split(receipt,folder.people)) balances[share.personId].consumed+=cent(share.totalShare);
    }
    const net=folder.people.map(p=>({id:p.id,amount:balances[p.id].paid-balances[p.id].consumed}));
    const debtors=net.filter(p=>p.amount<0), creditors=net.filter(p=>p.amount>0), debts=[];
    let d=0,c=0;
    while(d<debtors.length&&c<creditors.length) {
      const amount=Math.min(-debtors[d].amount,creditors[c].amount);
      debts.push({fromId:debtors[d].id,toId:creditors[c].id,amount:amount/100});
      debtors[d].amount+=amount;creditors[c].amount-=amount;
      if(debtors[d].amount===0)d++;if(creditors[c].amount===0)c++;
    }
    for(const balance of Object.values(balances)) {
      balance.net=(balance.paid-balance.consumed)/100;balance.paid/=100;balance.consumed/=100;
    }
    return {balances,debts,issue:''};
  }
  root.ReceiptMath = {allocate, split, validate, linePlan, localDate, settleFolder};
  if (typeof module !== 'undefined') module.exports = root.ReceiptMath;
})(globalThis);
