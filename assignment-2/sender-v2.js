const crypto = require('crypto');

const WEBHOOK_SECRET = 'northstar_secret_key_2026';

// Payload matching the new inventory update specification
const payload = JSON.stringify({
  sku: 'SKU-NORTHSTAR-01',
  quantity: 42,
  updated_at: new Date().toISOString()
});

// Generate HMAC SHA256 signature
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

// Send POST request to the new endpoint
fetch('http://localhost:3000/api/v1/webhooks/inventory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-signature': signature
  },
  body: payload
})
.then(res => res.json())
.then(data => console.log('Webhook Response:', data))
.catch(err => console.error('Error:', err));