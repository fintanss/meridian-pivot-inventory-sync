const crypto = require('crypto');

const WEBHOOK_SECRET = 'northstar_secret_key_2026';
const payload = JSON.stringify({ sku: 'SKU-SECURE-99', quantity: 120, updated_at: new Date().toISOString() });

const timestamp = Date.now().toString();
const nonce = crypto.randomUUID();

const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(`${timestamp}.${nonce}.`);
hmac.update(payload);
const signature = hmac.digest('hex');

fetch('http://localhost:3000/api/v1/webhooks/inventory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-signature': signature,
    'x-timestamp': timestamp,
    'x-nonce': nonce
  },
  body: payload
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));