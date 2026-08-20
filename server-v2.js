const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const WEBHOOK_SECRET = 'northstar_secret_key_2026';

// In-memory stock cache replacing obsolete polling cache
const inventoryCache = new Map();

// Capture unparsed raw body for HMAC signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

/**
 * DEPRECATED: Polling Mechanism
 * Reason: Northstar Retail Co. sunset the polling API on Day 4.
 * Status: Disabled in favor of POST /api/v1/webhooks/inventory.
 */
function legacyPollWarehouseApi() {
  console.warn('[DEPRECATED] Polling API disabled per Day 4 pivot spec.');
}

// Webhook endpoint replacing legacy polling loop
app.post('/api/v1/webhooks/inventory', (req, res) => {
  const signature = req.headers['x-signature'];

  if (!signature) {
    return res.status(401).json({ status: 'error', message: 'Missing signature header' });
  }

  // Calculate HMAC SHA256 digest
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(req.rawBody);
  const expectedSignature = hmac.digest('hex');

  if (signature !== expectedSignature) {
    return res.status(403).json({ status: 'error', message: 'Invalid signature' });
  }

  // Process inventory update payload
  const { sku, quantity, updated_at } = req.body;
  
  if (!sku || quantity === undefined) {
    return res.status(400).json({ status: 'error', message: 'Malformed inventory payload' });
  }

  inventoryCache.set(sku, { quantity, lastUpdated: updated_at || new Date().toISOString() });
  console.log(`[SYNC SUCCESS] Updated SKU ${sku}: ${quantity} units`);

  return res.status(200).json({ status: 'success', message: 'Inventory updated' });
});

// Query endpoint for support tools to check current stock
app.get('/api/v1/inventory/:sku', (req, res) => {
  const { sku } = req.params;
  
  if (!inventoryCache.has(sku)) {
    return res.status(404).json({ status: 'error', message: 'SKU not found' });
  }

  return res.status(200).json({
    sku,
    ...inventoryCache.get(sku)
  });
});

app.listen(PORT, () => {
  console.log(`Live Inventory Sync Service running on port ${PORT}`);
  legacyPollWarehouseApi();
});