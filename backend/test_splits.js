const fetch = globalThis.fetch;

async function run() {
  try {
    // 1. Register users
    const u1 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Rahul', email: 'rahul@example.com', password: 'password123' }) })).json();
    const u2 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'User A', email: 'usera@example.com', password: 'password123' }) })).json();
    const u3 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'User B', email: 'userb@example.com', password: 'password123' }) })).json();
    const u4 = await (await fetch('http://localhost:5001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'User C', email: 'userc@example.com', password: 'password123' }) })).json();
    
    // 2. Create Group & Add Members
    const groupRes = await fetch('http://localhost:5001/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify({ name: 'Splitwise Tests' }) });
    const group = await groupRes.json();
    await fetch(`http://localhost:5001/api/groups/${group.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify({ email: 'usera@example.com' }) });
    await fetch(`http://localhost:5001/api/groups/${group.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify({ email: 'userb@example.com' }) });
    await fetch(`http://localhost:5001/api/groups/${group.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify({ email: 'userc@example.com' }) });

    console.log('\n--- 1. Equal Split Example ($10 over 3 users) ---');
    const eqPayload = {
      title: 'Equal Split Test', amount: 10, payerId: u1.id, splitMethod: 'EQUAL',
      splitDetails: [ { userId: u1.id }, { userId: u2.id }, { userId: u3.id } ]
    };
    console.log('Payload:', JSON.stringify(eqPayload, null, 2));
    const eqRes = await (await fetch(`http://localhost:5001/api/groups/${group.id}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify(eqPayload) })).json();
    console.log('Generated ExpenseSplits in DB:');
    eqRes.splits.forEach(s => console.log(`- UserId ${s.userId.slice(-4)}: $${s.amountOwed}`));

    console.log('\n--- 2. Unequal Split Example ($100 exact) ---');
    const uqPayload = {
      title: 'Unequal Split Test', amount: 100, payerId: u1.id, splitMethod: 'UNEQUAL',
      splitDetails: [ { userId: u1.id, amount: 40 }, { userId: u2.id, amount: 30 }, { userId: u3.id, amount: 20 }, { userId: u4.id, amount: 10 } ]
    };
    const uqRes = await (await fetch(`http://localhost:5001/api/groups/${group.id}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify(uqPayload) })).json();
    uqRes.splits.forEach(s => console.log(`- UserId ${s.userId.slice(-4)}: $${s.amountOwed}`));

    console.log('\n--- 3. Percentage Split Example ($100 across 50,30,20) ---');
    const ptPayload = {
      title: 'Percentage Split Test', amount: 100, payerId: u1.id, splitMethod: 'PERCENTAGE',
      splitDetails: [ { userId: u1.id, percentage: 50 }, { userId: u2.id, percentage: 30 }, { userId: u3.id, percentage: 20 } ]
    };
    const ptRes = await (await fetch(`http://localhost:5001/api/groups/${group.id}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify(ptPayload) })).json();
    ptRes.splits.forEach(s => console.log(`- UserId ${s.userId.slice(-4)}: $${s.amountOwed}`));

    console.log('\n--- 4. Share Split Example ($600 with 3, 2, 1 shares) ---');
    const shPayload = {
      title: 'Share Split Test', amount: 600, payerId: u1.id, splitMethod: 'SHARES',
      splitDetails: [ { userId: u1.id, shares: 3 }, { userId: u2.id, shares: 2 }, { userId: u3.id, shares: 1 } ]
    };
    const shRes = await (await fetch(`http://localhost:5001/api/groups/${group.id}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${u1.token}` }, body: JSON.stringify(shPayload) })).json();
    shRes.splits.forEach(s => console.log(`- UserId ${s.userId.slice(-4)}: $${s.amountOwed}`));

  } catch(e) {
    console.error(e);
  }
}
run();
