const assert = require('node:assert/strict');
const {split, validate, allocate} = require('./assets/receipt-math.js');
const people = [{id:'a'}, {id:'b'}, {id:'c'}];
const bill = (items, extra={}) => ({items, payerId:'a', tax:0, tip:0, serviceFee:0, discount:0, total:0, ...extra});
const item = (price, ids=['a','b','c'], extra={}) => ({price, discount:0, quantity:1, assignedPeopleIds:ids, ...extra});
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
console.log(`${checks} accounting checks passed.`);
