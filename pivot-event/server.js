const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const PORT = 3000;
const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'print_jobs';

const attendeeStore = new Map();
let channel;

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

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Solstice Events Kiosk Portal</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background-color: #f1f5f9; color: #0f172a; min-height: 100vh; }
        
        header { background: #1e293b; color: white; padding: 1.5rem 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        header .header-content { max-width: 1000px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        header h1 { font-size: 1.5rem; font-weight: 700; color: #38bdf8; }
        header .badge { background: #0369a1; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }

        main { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }

        .card { background: white; border-radius: 0.75rem; padding: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .card h2 { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; }

        .form-group { margin-bottom: 1.25rem; }
        label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
        input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 0.95rem; outline: none; transition: all 0.2s; }
        input:focus { border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); }

        button { width: 100%; background: #0284c7; color: white; border: none; padding: 0.875rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #0369a1; }

        pre { background: #0f172a; color: #38bdf8; padding: 1.25rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.875rem; min-height: 220px; overflow-x: auto; white-space: pre-wrap; }
        
        .status-pill { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-weight: 600; font-size: 0.875rem; margin-bottom: 1rem; }
        .pill-pending { background: #fef3c7; color: #d97706; }
        .pill-success { background: #dcfce7; color: #15803d; }
        .pill-error { background: #fee2e2; color: #b91c1c; }
      </style>
    </head>
    <body>
      <header>
        <div class="header-content">
          <h1>Solstice Events</h1>
          <span class="badge">Kiosk v2.0 (Async Queue)</span>
        </div>
      </header>

      <main>
        <section class="card">
          <h2>Simulate QR Scan</h2>
          <div class="form-group">
            <label>Attendee ID</label>
            <input type="text" id="attendeeId" value="ATT-101" />
          </div>
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="name" value="Alice Smith" />
          </div>
          <button onclick="scanQR()">Scan QR Code</button>
        </section>

        <section class="card">
          <h2>Live Response Log</h2>
          <div id="statusContainer"></div>
          <pre id="output">// Awaiting attendee scan...</pre>
        </section>
      </main>

      <script>
        async function scanQR() {
          const attendeeId = document.getElementById('attendeeId').value;
          const name = document.getElementById('name').value;
          const out = document.getElementById('output');
          const statusContainer = document.getElementById('statusContainer');

          statusContainer.innerHTML = '<span class="status-pill pill-pending">Processing Request...</span>';
          out.innerText = "Dispatching request to /api/v1/kiosk/scan...";

          try {
            const res = await fetch('/api/v1/kiosk/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ attendeeId, name })
            });

            const data = await res.json();
            
            if (res.status === 202) {
              statusContainer.innerHTML = '<span class="status-pill pill-pending">Status: 202 ACCEPTED (Pending Queue)</span>';
            } else if (res.status === 409) {
              statusContainer.innerHTML = '<span class="status-pill pill-error">Status: 409 DUPLICATE SCAN</span>';
            } else {
              statusContainer.innerHTML = \`<span class="status-pill pill-error">Status: \${res.status}</span>\`;
            }

            out.innerText = JSON.stringify(data, null, 2);
          } catch (err) {
            statusContainer.innerHTML = '<span class="status-pill pill-error">Network Error</span>';
            out.innerText = err.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/api/v1/kiosk/scan', async (req, res) => {
  const { attendeeId, name } = req.body;
  if (!attendeeId) return res.status(400).json({ error: 'Attendee ID is required' });

  const existingRecord = attendeeStore.get(attendeeId);
  if (existingRecord) {
    return res.status(409).json({
      status: 'DUPLICATE_SCAN',
      message: `Attendee ${attendeeId} already scanned (State: ${existingRecord.status}). Duplicate rejected.`,
      currentStatus: existingRecord.status
    });
  }

  attendeeStore.set(attendeeId, { attendeeId, name, status: 'PENDING', printedAt: null });
  const payload = { jobId: `JOB-${Date.now()}`, attendeeId, name, callbackUrl: `http://localhost:${PORT}/api/v1/webhooks/print-status` };

  if (channel) {
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), { persistent: true });
    console.log(`[QUEUE PUBLISHED] Badge job for ${attendeeId} sent to queue.`);
  }

  return res.status(202).json({ status: 'PENDING', message: 'Check-in request queued.', attendeeId });
});

app.listen(PORT, () => {
  console.log(`Solstice Kiosk Service listening on port ${PORT}`);
  connectQueue();
});