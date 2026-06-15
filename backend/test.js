

async function run() {
  try {
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test1@example.com', password: 'password123' })
    });
    const regData = await regRes.json();
    console.log('Register Response:', regData);

    if (regData.token) {
      const meRes = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${regData.token}` }
      });
      const meData = await meRes.json();
      console.log('Me Response:', meData);
    }
  } catch(e) {
    console.error(e);
  }
}
run();
