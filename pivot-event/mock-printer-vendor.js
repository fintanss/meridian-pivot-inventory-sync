const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'print_jobs';

async function startVendorEngine() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log('[VENDOR ENGINE] Listening for print jobs from RabbitMQ...');

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const job = JSON.parse(msg.content.toString());
        console.log(`[HARDWARE PRINTER] Printing badge for ${job.name} (${job.attendeeId})...`);

        // Simulate physical print hardware delay (3 seconds)
        setTimeout(async () => {
          console.log(`[HARDWARE PRINTER] Print completed for ${job.attendeeId}. Sending webhook callback...`);

          try {
            await fetch(job.callbackUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobId: job.jobId,
                attendeeId: job.attendeeId,
                printStatus: 'SUCCESS',
                timestamp: new Date().toISOString()
              })
            });
          } catch (err) {
            console.error('[VENDOR ENGINE Error] Failed to reach kiosk webhook:', err.message);
          }

          channel.ack(msg);
        }, 3000);
      }
    });
  } catch (error) {
    console.error('[VENDOR ENGINE Error] AMQP connection failed:', error.message);
  }
}

startVendorEngine();