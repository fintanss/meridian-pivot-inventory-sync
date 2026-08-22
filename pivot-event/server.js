const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const PORT = 3000;
const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'print_jobs';

// In-memory data store for attendee check-in lifecycle
// Statuses: 'PENDING' | 'CHECKED_IN'
const attendeeStore = new Map();

let channel;

// Initialize RabbitMQ Queue Connection
async function connectQueue() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('[AMQP] Connected to RabbitMQ queue: print_jobs');
  } catch (error) {
    console.warn('[AMQP Warning] RabbitMQ not connected. Running in fallback mode.');
  }
}

/**
 * 1. QR Scan Endpoint (Asynchronous Publisher + Duplicate Protection)
 */
app.post('/api/v1/kiosk/scan', async (req, res) => {
  const { attendeeId, name } = req.body;

  if (!attendeeId) {
    return res.status(400).json({ error: 'Attendee ID is required' });
  }

  const existingRecord = attendeeStore.get(attendeeId);

  // Guardrail: Duplicate Scan Protection
  if (existingRecord) {
    return res.status(409).json({
      status: 'DUPLICATE_SCAN',
      message: `Attendee ${attendeeId} is already in state: ${existingRecord.status}. Second badge rejected.`,
      currentStatus: existingRecord.status
    });
  }

  // Register initial state as PENDING
  attendeeStore.set(attendeeId, {
    attendeeId,
    name,
    status: 'PENDING',
    printedAt: null
  });

  const payload = {
    jobId: `JOB-${Date.now()}`,
    attendeeId,
    name,
    callbackUrl: `http://localhost:${PORT}/api/v1/webhooks/print-status`
  };

  // Publish print request to queue if available
  if (channel) {
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), { persistent: true });
    console.log(`[QUEUE PUBLISHED] Badge job for ${attendeeId} sent to print queue.`);
  }

  // Return non-blocking PENDING response to UI
  return res.status(202).json({
    status: 'PENDING',
    message: 'Check-in request accepted. Badge printing is pending confirmation.',
    attendeeId
  });
});

/**
 * 2. Vendor Webhook Endpoint (Asynchronous Status Confirmation)
 */
app.post('/api/v1/webhooks/print-status', (req, res) => {
  const { attendeeId, printStatus, timestamp } = req.body;

  const record = attendeeStore.get(attendeeId);
  if (!record) {
    return res.status(404).json({ error: 'Attendee transaction record not found' });
  }

  if (printStatus === 'SUCCESS') {
    record.status = 'CHECKED_IN';
    record.printedAt = timestamp || new Date().toISOString();
    attendeeStore.set(attendeeId, record);

    console.log(`[WEBHOOK RECEIVED] Attendee ${attendeeId} confirmed -> CHECKED_IN`);
    return res.status(200).json({ status: 'ACKNOWLEDGED' });
  }

  return res.status(400).json({ error: 'Unhandled print status payload' });
});

/**
 * 3. Kiosk UI Polling / Status Query Endpoint
 */
app.get('/api/v1/kiosk/status/:attendeeId', (req, res) => {
  const record = attendeeStore.get(req.params.attendeeId);
  if (!record) {
    return res.status(404).json({ status: 'NOT_FOUND' });
  }
  return res.status(200).json(record);
});

app.listen(PORT, () => {
  console.log(`Solstice Kiosk Service listening on port ${PORT}`);
  connectQueue();
});