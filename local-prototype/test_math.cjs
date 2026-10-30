const assert = require('node:assert/strict');
const {split, validate, allocate} = require('./assets/receipt-math.js');
const people = [{id:'a'}, {id:'b'}, {id:'c'}];
const bill = (items, extra={}) => ({items, payerId:'a', tax:0, taxMode:'proportional', tip:0, serviceFee:0, discount:0, total:0, ...extra});
let nextId=0;
const item = (price, ids=['a','b','c'], extra={}) => ({id:String(nextId++),price, discount:0, quantity:1, isTaxable:true, orderDiscountEligible:true, assignedPeopleIds:ids, ...extra});
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS', name); }
check('one cent split stays exact', () => assert.deepEqual(split(bill([item(.01)],{total:.01}),people).map(x=>x.totalShare),[.01,0,0]));
check('quantity included', () => assert.equal(split(bill([item(5,['a'],{quantity:3})],{total:15}),people)[0].totalShare,15));
check('item and order discount allocated once', () => {
 const r=split(bill([item(10,['a'],{discount:2}),item(8,['b'])],{discount:4,tax:1,total:13}),people);
 assert.deepEqual(r.map(x=>x.totalShare),[6.5,6.5,0]);
});
check('free item is zero',()=>assert.equal(split(bill([item(5,['a'],{discount:5})]),people)[0].totalShare,0));
check('tax follows taxable items',()=>{
 const r=split(bill([item(10,['a'],{isTaxable:false}),item(10,['b'],{isTaxable:true})],{tax:1,total:21}),people);
 assert.deepEqual(r.map(x=>x.totalShare),[10,11,0]);
});
check('unassigned splits equally',()=>assert.deepEqual(split(bill([item(9,[])],{total:9}),people).map(x=>x.totalShare),[3,3,3]));
check('mismatch blocked',()=>assert.match(validate(bill([item(10)],{total:11}),people),/differs/));
check('discount too large blocked',()=>assert.match(validate(bill([item(10)],{discount:11,total:0}),people),/exceeds/));
check('removed participant blocked',()=>assert.match(validate(bill([item(10,['missing'])],{total:10}),people),/removed/));
check('largest remainder preserves cents',()=>{
 for(let amount=0;amount<1000;amount++) assert.equal(allocate(amount,[1,2,7]).reduce((a,b)=>a+b,0),amount);
});
check('many varied bills conserve total and balances',()=>{
 for(let i=1;i<500;i++){
  const gross=i*7, discount=i%13, tax=i%29;
  const receipt=bill([item(gross/100,['a','b'])],{discount:Math.min(gross,discount)/100,tax:tax/100,total:(gross-Math.min(gross,discount)+tax)/100});
  assert.equal(validate(receipt,people),'');
  const result=split(receipt,people);
  assert.equal(Math.round(result.reduce((s,x)=>s+x.totalShare,0)*100),Math.round(receipt.total*100));
  assert.equal(Math.round(result.reduce((s,x)=>s+x.netDiff,0)*100),0);
 }
});
check('Whole Foods tax belongs only to chicken owner',()=>{
 const amounts=[6.99,1.99,3.99,4.99,7.99,2.99,.99,1.20,2.98,3.49,.91,2.99,3.16,.77,2.50,1.69];
 const receipt=bill(amounts.map((v,i)=>item(v,[i===4?'a':'b'],{isTaxable:i===4})),{tax:.71,total:50.33});
 assert.equal(validate(receipt,people),'');
 assert.deepEqual(split(receipt,people).map(x=>x.totalShare),[8.70,41.63,0]);
 assert.deepEqual(split(receipt,people).map(x=>x.taxShare),[.71,0,0]);
});
check('manual date uses local calendar rather than UTC',()=>{
 assert.equal(require('./assets/receipt-math.js').localDate(new Date(2026,9,29,23,30)), '2026-10-29');
});
check('unknown tax blocks even when grand total balances',()=>{
 const r=bill([item(10,['a'],{isTaxable:null})],{tax:1,total:11});
 assert.match(validate(r,people),/unknown tax/); assert.deepEqual(split(r,people),[]);
});
check('exempt items never absorb unexplained tax',()=>{
 const r=bill([item(10,['a'],{isTaxable:false})],{tax:1,total:11});
 assert.match(validate(r,people),/no taxable/); assert.deepEqual(split(r,people),[]);
});
check('unknown tax mode requires a deliberate decision',()=>{
 const r=bill([item(10)],{tax:1,total:11,taxMode:'review'});
 assert.match(validate(r,people),/Choose a tax split/);
});
check('zero-tax receipts do not require inferred statuses',()=>{
 assert.equal(validate(bill([item(10,[],{isTaxable:null})],{taxMode:'review',total:10}),people),'');
});
check('different tax bases and overlapping jurisdictions',()=>{
 const items=[item(10,['a'],{id:'food'}),item(20,['b'],{id:'goods'}),item(5,['c'],{id:'exempt',isTaxable:false})];
 const r=bill(items,{taxMode:'groups',tax:2.70,total:37.70,taxGroups:[
  {amount:.50,baseAmount:10,itemIds:['food']},{amount:2,baseAmount:20,itemIds:['goods']},{amount:.20,baseAmount:20,itemIds:['goods']} ]});
 assert.equal(validate(r,people),'');
 assert.deepEqual(split(r,people).map(x=>x.totalShare),[10.50,22.20,5]);
 // Product names, store labels and row order cannot change tax ownership.
 const renamed={...r,storeName:'Other store',items:[...items].reverse().map(x=>({...x,name:'Unrelated label'}))};
 assert.deepEqual(split(renamed,people),split(r,people));
 r.items=r.items.filter(x=>x.id!=='goods'); assert.match(validate(r,people),/removed items/);
});
check('printed tax base must survive coupon and price edits',()=>{
 const r=bill([item(10,['a'],{id:'x',discount:2})],{taxMode:'groups',tax:1,total:9,taxGroups:[{amount:1,baseAmount:10,itemIds:['x']}]});
 assert.match(validate(r,people),/tax base differs/);
 r.taxMode='item';r.items[0].taxAmount=1;r.taxGroups=[];
 assert.equal(validate(r,people),''); // Explicit per-item tax supports pre-discount taxation.
});
check('group tax total and coverage both required',()=>{
 const r=bill([item(10,['a'],{id:'x'}),item(10,['b'],{id:'y',isTaxable:null})],{taxMode:'groups',tax:1,total:21,taxGroups:[{amount:1,itemIds:['x']}]});
 assert.match(validate(r,people),/outside the tax groups/);
 r.items[1].isTaxable=false;r.taxGroups[0].amount=.99;
 assert.match(validate(r,people),/tax total/);
});
check('explicit item tax needs complete consistent amounts',()=>{
 const r=bill([item(10,['a'],{taxAmount:.50}),item(10,['b'],{taxAmount:null})],{taxMode:'item',tax:1,total:21});
 assert.match(validate(r,people),/every item/);
 r.items[1].taxAmount=.50;assert.equal(validate(r,people),'');
 r.items[1].isTaxable=false;assert.match(validate(r,people),/exempt item has tax/);
});
check('unknown coupon eligibility never defaults to everyone',()=>{
 const r=bill([item(10,['a'],{orderDiscountEligible:null}),item(10,['b'])],{discount:2,total:18});
 assert.match(validate(r,people),/eligibility/);assert.deepEqual(split(r,people),[]);
});
check('restricted order coupon reduces only eligible items and tax weights',()=>{
 const r=bill([item(10,['a']),item(20,['b'],{orderDiscountEligible:false})],{discount:5,tax:2.50,total:27.50});
 assert.deepEqual(split(r,people).map(x=>x.totalShare),[5.50,22,0]);
 r.discount=11;r.total=21.50;assert.match(validate(r,people),/eligible items/);
});
check('scan line totals cannot be multiplied again',()=>{
 const r=bill([item(2.98,['a'],{quantity:2,priceBasis:'line'})],{total:5.96});
 assert.match(validate(r,people),/line totals/);
});
check('missing amounts are not coerced into zero',()=>{
 for(const tax of [null,'',true,NaN,Infinity,-1]) assert.notEqual(validate(bill([item(10)],{tax,total:10}),people),'');
});
check('positive fees without a base never become arbitrary equal shares',()=>{
 assert.match(validate(bill([item(0)],{serviceFee:1,total:1}),people),/eligible amount/);
 assert.throws(()=>allocate(1,[0,0]),/eligible amount/);
});
check('large allocations remain exact',()=>{
 assert.deepEqual(allocate(99999999,[999999999999,999999999999]),[50000000,49999999]);
});
check('tax amount by item remains fixed when assignees change',()=>{
 const r=bill([item(1,['a'],{id:'x'}),item(2,['b'],{id:'y'})],{tax:.05,total:3.05});
 const before=require('./assets/receipt-math.js').linePlan(r).taxes;
 r.items[0].assignedPeopleIds=['a','c'];r.items[1].assignedPeopleIds=['c'];
 assert.deepEqual(require('./assets/receipt-math.js').linePlan(r).taxes,before);
 assert.equal(Math.round(split(r,people).reduce((s,x)=>s+x.totalShare,0)*100),305);
});
console.log(`${checks} accounting checks passed.`);
check('folder settlement does not lose one-cent debts',()=>{
 const r=bill([item(.01,['b'])],{total:.01});
 const folder=require('./assets/receipt-math.js').settleFolder({people,receipts:[r]});
 assert.deepEqual(folder.debts,[{fromId:'b',toId:'a',amount:.01}]);
});
check('an unresolved receipt blocks the whole folder settlement',()=>{
 const good=bill([item(10,['b'])],{total:10});
 const bad=bill([item(5,['c'],{isTaxable:null})],{tax:1,total:6});
 const folder=require('./assets/receipt-math.js').settleFolder({people,receipts:[good,bad]});
 assert.ok(folder.issue);assert.deepEqual(folder.debts,[]);
});
console.log(`${checks} total checks passed.`);
