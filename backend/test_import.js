const fs = require('fs');
const FormData = require('form-data');
const fetch = globalThis.fetch;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // Need a dummy user and group
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'test@import.com', name: 'Test User', passwordHash: 'pwd' }
      });
    }

    let group = await prisma.group.findFirst();
    if (!group) {
      group = await prisma.group.create({
        data: { name: 'Import Test Group' }
      });
    }

    // Add Aisha, Rohan, Priya, Meera, Dev, Sam to group
    const names = ['Aisha', 'Rohan', 'Priya', 'Meera', 'Dev', 'Sam'];
    for (const name of names) {
      let u = await prisma.user.findFirst({ where: { name } });
      if (!u) {
        u = await prisma.user.create({ data: { email: `${name}@test.com`, name, passwordHash: 'pwd' } });
      }
      const existingMember = await prisma.groupMember.findFirst({ where: { groupId: group.id, userId: u.id } });
      if (!existingMember) {
        await prisma.groupMember.create({
          data: {
            groupId: group.id,
            userId: u.id,
            joinedAt: new Date('2026-01-01'),
            leftAt: name === 'Meera' ? new Date('2026-03-28T23:59:59Z') : null
          }
        });
      }
    }

    const formData = new FormData();
    formData.append('csvFile', fs.createReadStream('../expenses export.csv'));

    console.log(`Testing import for Group ${group.id}...`);
    
    // NOTE: This assumes the backend server is running on localhost:5001
    const res = await fetch(`http://localhost:5001/api/import/${group.id}`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
