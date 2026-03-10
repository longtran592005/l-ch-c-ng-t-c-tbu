import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  console.log('=== Prisma ORM @db.Date + @db.Time Round-Trip Test ===');
  console.log('Server TZ offset (minutes):', new Date().getTimezoneOffset());
  console.log('');

  // Find an existing user for FK
  const user = await prisma.user.findFirst();
  if (!user) { console.log('No users in DB, cannot test ORM path'); return; }
  console.log('Using user:', user.id, user.name);

  // Test with the Schedule model (ORM path)
  const noonUTC = new Date(Date.UTC(2026, 2, 9, 12, 0, 0, 0));
  const time0830 = new Date(Date.UTC(1970, 0, 1, 8, 30, 0, 0));
  console.log('');
  console.log('Input date (noon UTC):', noonUTC.toISOString());
  console.log('Input startTime (08:30 UTC):', time0830.toISOString());

  const created = await prisma.schedule.create({
    data: {
      date: noonUTC,
      dayOfWeek: 'Thứ Hai',
      startTime: time0830,
      content: 'TEST_DATE_ORM_ROUNDTRIP',
      location: 'Phòng Test',
      leader: 'Test Leader',
      participants: '[]',
      preparingUnit: 'Test Unit',
      status: 'draft',
      createdBy: user.id,
    }
  });
  console.log('Created ID:', created.id);

  // Read back
  const readBack = await prisma.schedule.findUnique({ where: { id: created.id } });
  if (readBack) {
    console.log('');
    console.log('=== DATE field ===');
    console.log('toISOString():', readBack.date.toISOString());
    console.log('toString():', readBack.date.toString());
    console.log('local D:', readBack.date.getDate(), ' UTC D:', readBack.date.getUTCDate());
    console.log('local H:', readBack.date.getHours(), ' UTC H:', readBack.date.getUTCHours());
    console.log('JSON:', JSON.stringify({ date: readBack.date }));

    const iso = readBack.date.toISOString();
    const [dp] = iso.split('T');
    console.log('Date part from ISO:', dp, dp === '2026-03-09' ? '✓' : '✗ WRONG');

    if (readBack.startTime) {
      console.log('');
      console.log('=== TIME field ===');
      console.log('toISOString():', readBack.startTime.toISOString());
      console.log('toString():', readBack.startTime.toString());
      console.log('UTC H:M:', readBack.startTime.getUTCHours() + ':' + String(readBack.startTime.getUTCMinutes()).padStart(2,'0'));
      console.log('local H:M:', readBack.startTime.getHours() + ':' + String(readBack.startTime.getMinutes()).padStart(2,'0'));
      console.log('Expected UTC: 08:30');
      console.log('Result:', readBack.startTime.getUTCHours() === 8 && readBack.startTime.getUTCMinutes() === 30 ? '✓' : '✗ WRONG');
    }
  }

  // Also check raw SQL
  const raw: any[] = await prisma.$queryRawUnsafe(
    `SELECT date::text, start_time::text FROM schedules WHERE id = $1`, created.id
  );
  if (raw.length > 0) {
    console.log('');
    console.log('=== Raw SQL ===');
    console.log('date::text:', raw[0].date);
    console.log('start_time::text:', raw[0].start_time);
  }

  // Cleanup
  await prisma.schedule.delete({ where: { id: created.id } });
  console.log('\nCleaned up.');
  await prisma.$disconnect();
}

test().catch(e => { console.error(e); process.exit(1); });
