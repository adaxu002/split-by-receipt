/* Exact cent allocation. Standalone source, loaded before the preserved React app. */
(function (root) {
  const cent = x => Math.round((Number(x) + Number.EPSILON) * 100);
  function allocate(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (!weights.length) return [];
    if (sum <= 0) weights = weights.map(() => 1);
    const denominator = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map(w => total * w / denominator);
    const result = raw.map(Math.floor);
    let remaining = total - result.reduce((a, b) => a + b, 0);
    const order = raw.map((v, i) => ({i, fraction: v - result[i]}))
      .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
    for (let i = 0; i < remaining; i++) result[order[i % order.length].i]++;
    return result;
  }
  function validate(receipt, people) {
    if (!people.length || new Set(people.map(p => p.id)).size !== people.length) return 'Add valid participants.';
    if (!people.some(p => p.id === receipt.payerId)) return 'Choose who paid.';
    if (!receipt.items.length) return 'Add at least one item.';
    const valid = x => Number.isFinite(Number(x)) && Number(x) >= 0 && Number(x) <= 1000000;
    if (![receipt.tax, receipt.tip, receipt.serviceFee, receipt.discount || 0, receipt.total].every(valid)) return 'Amounts must be non-negative numbers.';
    let subtotal = 0;
    for (const item of receipt.items) {
      const qty = item.quantity ?? 1;
      if (!valid(item.price) || !valid(item.discount || 0) || Number(item.discount || 0) > Number(item.price)) return 'An item discount exceeds its price.';
      if (!Number.isInteger(qty) || qty < 1 || qty > 10000) return 'Check item quantities.';
      if ((item.assignedPeopleIds || []).some(id => !people.some(p => p.id === id))) return 'An item refers to a removed participant.';
      subtotal += (cent(item.price) - cent(item.discount || 0)) * qty;
    }
    if (cent(receipt.discount || 0) > subtotal) return 'The order discount exceeds the items total.';
    const expected = subtotal - cent(receipt.discount || 0) + cent(receipt.tax) + cent(receipt.tip) + cent(receipt.serviceFee);
    if (expected !== cent(receipt.total)) return `Receipt total differs by $${((cent(receipt.total) - expected) / 100).toFixed(2)}. Correct the items, discounts or receipt total before saving.`;
    return '';
  }
  function split(receipt, people) {
    const n = people.length;
    if (!n) return [];
    const lines = receipt.items.map(x => Math.max(0, (cent(x.price) - cent(x.discount || 0)) * (x.quantity ?? 1)));
    const total = lines.reduce((a,b) => a+b,0);
    const discounts = allocate(Math.min(total, Math.max(0, cent(receipt.discount || 0))), lines);
    const subtotals = people.map(() => 0);
    const taxableTotals = people.map(() => 0);
    receipt.items.forEach((item, i) => {
      let indices = people.map((p, j) => (item.assignedPeopleIds || []).includes(p.id) ? j : -1).filter(j => j >= 0);
      if (!indices.length) indices = people.map((p,j) => j);
      const shares = allocate(lines[i] - discounts[i], indices.map(() => 1));
      indices.forEach((j, k) => {
        subtotals[j] += shares[k];
        if (item.isTaxable) taxableTotals[j] += shares[k];
      });
    });
    const tax = allocate(cent(receipt.tax || 0), taxableTotals.some(x => x > 0) ? taxableTotals : subtotals);
    const tip = allocate(cent(receipt.tip || 0), subtotals);
    const fee = allocate(cent(receipt.serviceFee || 0), subtotals);
    const calculatedTotal = subtotals.reduce((a,b) => a+b,0) + cent(receipt.tax || 0) + cent(receipt.tip || 0) + cent(receipt.serviceFee || 0);
    return people.map((p, i) => {
      const share = subtotals[i] + tax[i] + tip[i] + fee[i];
      return {personId: p.id, itemSubtotal: subtotals[i]/100, taxShare: tax[i]/100,
        tipShare: tip[i]/100, serviceFeeShare: fee[i]/100, totalShare: share/100,
        netDiff: (p.id === receipt.payerId ? calculatedTotal - share : -share)/100};
    });
  }
  root.ReceiptMath = {allocate, split, validate};
  if (typeof module !== 'undefined') module.exports = root.ReceiptMath;
})(globalThis);
