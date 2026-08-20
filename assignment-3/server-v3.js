const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const WEBHOOK_SECRET = 'northstar_secret_key_2026';

const inventoryCache = new Map();
const processedNonces = new Set();
const requestCounts = new Map();

const MAX_TIMESTAMP_DELTA_MS = 5 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

const rateLimiter = (req, res, next) => {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  const record = requestCounts.get(ip) || { count: 0, startTime: now };

  if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.startTime = now;
  } else {
    record.count += 1;
  }

  requestCounts.set(ip, record);

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ status: 'error', message: 'Rate limit exceeded. Try again later.' });
  }
  next();
};

app.post('/api/v1/webhooks/inventory', rateLimiter, (req, res) => {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  const nonce = req.headers['x-nonce'];

  if (!signature || !timestamp || !nonce) {
    return res.status(401).json({ status: 'error', message: 'Missing security headers' });
  }

  const reqTime = parseInt(timestamp, 10);
  if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > MAX_TIMESTAMP_DELTA_MS) {
    return res.status(400).json({ status: 'error', message: 'Request timestamp expired or invalid' });
  }

  if (processedNonces.has(nonce)) {
    return res.status(409).json({ status: 'error', message: 'Duplicate request detected (Nonce reused)' });
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(`${timestamp}.${nonce}.`);
  hmac.update(req.rawBody);
  const expectedSignature = hmac.digest('hex');

  if (signature !== expectedSignature) {
    return res.status(403).json({ status: 'error', message: 'Invalid HMAC signature' });
  }

  processedNonces.add(nonce);

  const { sku, quantity, updated_at } = req.body;
  inventoryCache.set(sku, { quantity, lastUpdated: updated_at || new Date().toISOString() });
  
  console.log(`[SECURE SYNC] Verified SKU ${sku}: ${quantity} units (Nonce: ${nonce})`);
  return res.status(200).json({ status: 'success', message: 'Inventory updated securely' });
});

app.listen(PORT, () => {
  console.log(`Hardened Production Inventory Service running on port ${PORT}`);
});