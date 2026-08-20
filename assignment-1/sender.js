const crypto = require('crypto');

const WEBHOOK_SECRET = 'northstar_secret_key_2026';
const payload = JSON.stringify({ item_id: 'SKU-99', status: 'IN_STOCK', qty: 150 });

// Generate HMAC SHA256 signature matching the secret
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

// Send HTTP POST request with payload and signature header
fetch('http://localhost:3000/api/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-signature': signature
  },
  body: payload
})
.then(res => res.json())
.then(data => console.log('Response from Server:', data))
.catch(err => console.error('Error:', err));