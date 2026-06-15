const fetch = globalThis.fetch;

async function run() {
  try {
    const regRes = await fetch('http://localhost:5001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Group User', email: 'group@example.com', password: 'password123' })
    });
    const { token } = await regRes.json();
    
    console.log('--- Testing POST /api/groups ---');
    const groupRes = await fetch('http://localhost:5001/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: 'Hawaii Trip' })
    });
    const group = await groupRes.json();
    console.log('Group Created:', group.id ? 'SUCCESS' : 'FAILED');

    console.log('--- Testing GET /api/groups ---');
    const listRes = await fetch('http://localhost:5001/api/groups', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const list = await listRes.json();
    console.log('Group List count:', list.length);

    console.log('--- Testing GET /api/groups/:id ---');
    const detailRes = await fetch(`http://localhost:5001/api/groups/${group.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const details = await detailRes.json();
    console.log('Group Details Name:', details.name);
    
  } catch(e) {
    console.error(e);
  }
}
run();
