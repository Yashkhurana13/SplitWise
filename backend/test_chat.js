const { io } = require('socket.io-client');
const fetch = globalThis.fetch;

async function run() {
  try {
    const u1 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Chat User 1', email: `cu1_${Date.now()}@example.com`, password: 'password123' }) })).json();
    const u2 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Chat User 2', email: `cu2_${Date.now()}@example.com`, password: 'password123' }) })).json();

    const group = await (await fetch('http://localhost:5001/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify({ name: 'Chat Group' }) })).json();
    await fetch(`http://localhost:5001/api/groups/${group.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify({ email: u2.email }) });

    const expense = await (await fetch(`http://localhost:5001/api/groups/${group.id}/expenses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` },
      body: JSON.stringify({
        title: 'Lunch', amount: 50, payerId: u1.id, splitMethod: 'EQUAL',
        splitDetails: [{ userId: u1.id }, { userId: u2.id }]
      })
    })).json();

    console.log('\n--- 1. Testing REST POST ---');
    const msg1 = await (await fetch(`http://localhost:5001/api/expenses/${expense.id}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` },
      body: JSON.stringify({ content: 'I paid for lunch!' })
    })).json();
    console.log('REST Saved Message:', msg1.content);

    console.log('\n--- 2. Testing Socket.io Real-time ---');
    const socket1 = io('http://localhost:5001');
    const socket2 = io('http://localhost:5001');

    socket1.emit('join-expense', expense.id);
    socket2.emit('join-expense', expense.id);

    await new Promise(r => setTimeout(r, 500));

    socket2.on('message-received', (msg) => {
      console.log('Socket 2 Received Real-time Message:', msg.content);
    });

    socket1.emit('send-message', {
      expenseId: expense.id,
      userId: u1.id,
      content: 'Hope you enjoyed it!'
    });

    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- 3. Testing REST GET (Historical) ---');
    const history = await (await fetch(`http://localhost:5001/api/expenses/${expense.id}/messages`, {
      headers: { 'Authorization': `Bearer ${u2.token}` }
    })).json();
    console.log('Historical Messages count:', history.length);
    history.forEach(m => console.log(`[${m.user.name}]: ${m.content}`));

    socket1.disconnect();
    socket2.disconnect();

  } catch (e) {
    console.error(e);
  }
}
run();
