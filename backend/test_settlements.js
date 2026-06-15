const fetch = globalThis.fetch;

async function run() {
  try {
    const u1 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Rahul (Payee)', email: `rahul_${Date.now()}@example.com`, password: 'password123' }) })).json();
    const u2 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Priya (Payer)', email: `priya_${Date.now()}@example.com`, password: 'password123' }) })).json();
    const u3 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Non Member', email: `non_${Date.now()}@example.com`, password: 'password123' }) })).json();

    const groupRes = await fetch('http://localhost:5001/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify({ name: 'Settlement Test Group' }) });
    const group = await groupRes.json();
    
    await fetch(`http://localhost:5001/api/groups/${group.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify({ email: u2.email }) });

    await fetch(`http://localhost:5001/api/groups/${group.id}/expenses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` },
      body: JSON.stringify({
        title: 'Initial Debt', amount: 100, payerId: u1.id, splitMethod: 'UNEQUAL',
        splitDetails: [{ userId: u2.id, amount: 100 }]
      })
    });

    const getBalances = async () => await (await fetch(`http://localhost:5001/api/groups/${group.id}/balances`, { headers: { 'Authorization': `Bearer ${u1.token}` } })).json();

    console.log('\n--- Initial State (Priya owes Rahul $100) ---');
    console.log(await getBalances());

    console.log('\n--- Test 1: Partial Settlement (Priya pays Rahul $30) ---');
    const s1 = await (await fetch('http://localhost:5001/api/settlements', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u2.token}` },
      body: JSON.stringify({ groupId: group.id, payerId: u2.id, payeeId: u1.id, amount: 30 })
    })).json();
    console.log('Balances after partial ($30 payment):', await getBalances());

    console.log('\n--- Test 2: Settlement Exceeding Debt (Priya tries to pay $100, but only owes $70) ---');
    const s2 = await (await fetch('http://localhost:5001/api/settlements', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u2.token}` },
      body: JSON.stringify({ groupId: group.id, payerId: u2.id, payeeId: u1.id, amount: 100 })
    })).json();
    console.log('Error Response:', s2.error);

    console.log('\n--- Test 3: Decimal Settlement Values (Priya pays $20.50) ---');
    const s3 = await (await fetch('http://localhost:5001/api/settlements', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u2.token}` },
      body: JSON.stringify({ groupId: group.id, payerId: u2.id, payeeId: u1.id, amount: 20.50 })
    })).json();
    console.log('Balances after $20.50 payment:', await getBalances());

    console.log('\n--- Test 4: Full Settlement (Priya pays the remaining $49.50) ---');
    const s4 = await (await fetch('http://localhost:5001/api/settlements', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u2.token}` },
      body: JSON.stringify({ groupId: group.id, payerId: u2.id, payeeId: u1.id, amount: 49.50 })
    })).json();
    console.log('Balances after full settlement (Should be empty []):', await getBalances());

    console.log('\n--- Test 5: Settlement between non-members (should fail) ---');
    const s5 = await (await fetch('http://localhost:5001/api/settlements', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` },
      body: JSON.stringify({ groupId: group.id, payerId: u1.id, payeeId: u3.id, amount: 10 })
    })).json();
    console.log('Error Response:', s5.error);

  } catch(e) {
    console.error(e);
  }
}
run();
