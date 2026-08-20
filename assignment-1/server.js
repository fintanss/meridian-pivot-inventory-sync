const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const WEBHOOK_SECRET = 'northstar_secret_key_2026';

// Capture raw unparsed request bytes to preserve exact formatting
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.post('/api/webhook', (req, res) => {
  const signature = req.headers['x-signature'];

  if (!signature) {
    return res.status(401).json({ status: 'error', message: 'Missing signature header' });
  }

  // Calculate HMAC SHA256 digest using raw body buffer
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(req.rawBody);
  const expectedSignature = hmac.digest('hex');

  // Verify signature
  if (signature !== expectedSignature) {
    return res.status(403).json({ status: 'error', message: 'Invalid payload signature' });
  }

  console.log('Valid Webhook Payload Received:', req.body);
  return res.status(200).json({ status: 'success', message: 'Payload verified successfully' });
});

app.listen(PORT, () => console.log(`Webhook receiver listening on http://localhost:${PORT}`));