# Split by Receipt — local Python prototype

Upload a supermarket receipt, review item discounts and the printed total, assign purchases to people, and split the cost. The existing React interface is retained. A new Python backend calls Kimi or Gemini to extract receipt data; editable JavaScript calculates shares in integer cents.

## Start on Ada's computer

Double-click `Start.cmd`, keep the console open, then open http://localhost:8080.
If the app is already running, just open that URL. Ctrl+C in the server console stops it.
On another computer with Python 3.10+, run `python server.py` from this folder. No Python packages are required.

Manual entry, JSON import, demo data, folders and splitting work without an API key.
To enable real photo recognition, copy `.env.example` to `.env`, set `RECEIPT_PROVIDER=kimi`, enter your own `KIMI_API_KEY` locally, and restart the server. Never upload or commit `.env`. `KIMI_MODEL` defaults to `kimi-k2.6`, with thinking disabled and a 4096-token output cap. Each scan makes one request with no automatic retries. Charges depend on your Kimi account. `KIMI_BASE_URL` defaults to the China endpoint; international accounts use `https://api.moonshot.ai/v1`. Only these official endpoints are allowed; redirects are blocked. Gemini remains available with `RECEIPT_PROVIDER=gemini` and `GEMINI_API_KEY`.

Receipt photos are sent to the selected AI provider only when scanning. The server does not save uploaded images. Saved folders and receipt records remain in this browser's local storage, separate from the deployed website. Clearing browser data removes them. The server binds only to this computer and does not serve private config or source files.

## Accounting rules

- Each recognized row has an explicit whole-line price basis, including all units or weight. Its quantity is locked at 1; the item name retains printed quantity or weight. Manually entered items use unit prices and editable integer quantities. These two bases cannot silently multiply a scanned total twice.
- Item coupons reduce their matching line. Member prices already shown net are not discounted twice. Savings-summary lines are not additional discounts.
- Additional order discounts are allocated only over explicitly eligible item values after item discounts. Unknown eligibility blocks settlement. The review controls allow selecting an eligible subset or explicitly applying a true whole-order coupon to every item. Multiple coupons with different eligibility must be resolved into item discounts; they are not silently combined into one eligible pool.
- Tax status has three values: taxable, exempt and unknown. Neither the Python normalizer nor the browser coerces unknown to taxable or exempt. Positive tax is never spread across exempt items as a fallback.
- Tax supports printed groups (including overlapping jurisdictions), complete explicit whole-line item tax amounts, or one confirmed pool allocated by discounted taxable value. Different tax bases must remain separate. A printed group base must match its current discounted items, group amounts must reconcile to total tax, and every item outside the groups must be confirmed exempt. Missing or contradictory evidence blocks settlement until reviewed. Product names, retailer identity and inferred local tax laws never decide membership.
- The user can select a tax split method, resolve unknown statuses, or enter each item's tax (including explicit zeros). Per-item tax supports cases such as tax before a manufacturer coupon; the program does not infer that tax treatment. Prices or coupon edits that invalidate a printed base require review again. Previously saved receipts without an explicit tax method also require review before tax settlement.
- Tips and general service fees use an explicit app policy: proportional to discounted line value. Charges for a specific product should be represented on that product. Positive fees without any positive line value cannot be allocated automatically. Unassigned items are shared equally among current participants.
- The engine allocates discount and tax to receipt lines first, then divides each line's charges among its assignees. Changing assignees does not change an item's tax. Largest-remainder allocation uses integer cents and exact integer products. Unresolved evidence or unreconciled totals produce no settlement preview and block saving, even if some totals happen to match.
- Tender, gift cards, EBT, change and cashback are not purchase discounts.
- Folder settlement also uses integer cents, including one-cent debts. An unresolved active receipt blocks the entire folder settlement instead of silently omitting that receipt.

The extraction prompt is store-independent and covers common US supermarket receipt patterns. No claim of tested coverage for every US supermarket is made. Returns, negative purchases, non-USD receipts, unreadable amounts and complicated coupon eligibility may require manual handling. Always review recognition before saving.

## Validation and source

`python -B -m unittest -v` checks normalization, invalid inputs, simulated model output, missing-key behavior and local HTTP isolation.
`node test_math.cjs` checks unknown states, independent and overlapping tax groups, removed group members, coupon tax-base mismatches, explicit item taxes, restricted coupons, line versus unit amounts, large-number rounding and accounting conservation. It includes synthetic cases with arbitrary item names and reordered lines so the rules cannot depend on one receipt.
These synthetic fixtures do not measure real-photo recognition accuracy. One supplied Whole Foods receipt was tested with Kimi K2.6: all 16 line totals matched, subtotal $49.62, tax $0.71, total $50.33; only chicken was taxable. Missing dates use the browser's current local date in the displayed and saved receipt; the raw extraction keeps absence distinct. This receipt has no separate discount, so real coupon recognition remains unverified. The regression tests include transcribed amounts; these are distinct from the real API test.

`receipt.py` contains extraction and normalization. `server.py` contains the local server. `assets/receipt-math.js` contains the editable accounting engine, and `assets/receipt-review.js` contains the editable review controls. `integrate.py` is the maintained, idempotent adapter for the original compiled React export; it fails if expected upstream patterns change. The original uncompiled React source was not available.

Original frontend: https://github.com/adaxu002/split-by-receipt
Gemini REST API reference: https://ai.google.dev/api/generate-content

This prototype does not write the course journal or record the student's video.


Kimi official vision API examples: https://huggingface.co/moonshotai/Kimi-K2.5#chat-completion-with-visual-content

## Simple split view

Single-file uploads start scanning immediately. The default view shows each participant's share and payment direction first, followed by read-only line amounts and participant buttons. New quick receipts keep the default three people and equal sharing. Clear removes explicit assignments; unassigned items retain the documented equal-sharing fallback. Tax is included in the split and shown last in the totals. Edit details opens the existing complete editor, including participant names and membership; returning preserves edits. Recognition notes are only visible in the editor. Unresolved accounting still requires correction before saving.

`assets/receipt-simple.js` and `assets/receipt-simple.css` maintain this presentation separately from the compiled export.
