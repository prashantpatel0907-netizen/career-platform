// tools/bulk-credit.cjs
// Usage: node tools/bulk-credit.cjs OWNER_ID AMOUNT COUNT
// Example: node tools/bulk-credit.cjs 68c15b77b80feaf09f5f7484 10 5

const fetch = globalThis.fetch || require('node:fetch'); // node 18+ has global fetch
const [,, ownerId, amountArg, countArg] = process.argv;
if (!ownerId || !amountArg || !countArg) {
  console.error('Usage: node tools/bulk-credit.cjs OWNER_ID AMOUNT COUNT');
  process.exit(1);
}
const amount = Number(amountArg);
const count = Number(countArg);
const token = process.env.CP_JWT;
if (!token) {
  console.error('CP_JWT not set in env. Run: SET "CP_JWT=yourtoken"');
  process.exit(2);
}

(async () => {
  console.log(`Starting bulk credit: owner=${ownerId} amount=${amount} count=${count}`);
  const results = [];
  for (let i=0;i<count;i++) {
    try {
      const res = await fetch('http://localhost:4000/api/wallet/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ownerId, amount, currency: 'USD', source: 'bulk_node' })
      });
      const j = await res.json();
      results.push(j);
      console.log(`[${i+1}/${count}] status=${res.status} ok=${j.ok ? true : false}`);
    } catch (err) {
      console.error(`[${i+1}/${count}] error:`, err && err.message ? err.message : err);
      results.push({ error: err && err.message ? err.message : String(err) });
    }
  }
  console.log('Done. Summary:');
  console.log(JSON.stringify(results, null, 2));
})();
