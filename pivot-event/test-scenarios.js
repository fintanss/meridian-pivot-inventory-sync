async function runTests() {
  const baseUrl = 'http://localhost:3000/api/v1/kiosk';

  console.log('\n--- TEST 1: First Scan for Attendee 101 (Should return PENDING) ---');
  let res1 = await fetch(`${baseUrl}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendeeId: 'ATT-101', name: 'Alice Smith' })
  });
  console.log('Scan Response:', await res1.json());

  console.log('\n--- TEST 2: Duplicate Scan for Attendee 101 (Should return 409 DUPLICATE_SCAN) ---');
  let res2 = await fetch(`${baseUrl}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendeeId: 'ATT-101', name: 'Alice Smith' })
  });
  console.log('Duplicate Scan Response:', await res2.json());

  console.log('\n--- TEST 3: First Scan for Attendee 102 (Should return PENDING) ---');
  let res3 = await fetch(`${baseUrl}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendeeId: 'ATT-102', name: 'Bob Johnson' })
  });
  console.log('Scan Response:', await res3.json());
}

setTimeout(runTests, 1000);