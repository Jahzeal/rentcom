import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const propertyId = '0bf344a5-aa3b-4a55-9538-7b12aea6dba4';
  const category = 'Deluxe';

  console.log(`--- Checking Property: ${propertyId} ---`);
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, title: true, type: true },
  });
  console.log('Property:', JSON.stringify(property, null, 2));

  console.log('\n--- Checking Rooms ---');
  const rooms = await prisma.hotelRoom.findMany({
    where: { propertyId },
  });
  console.log(`Total rooms: ${rooms.length}`);
  rooms.forEach(r => {
    console.log(`Room #${r.roomNumber} (${r.category}) - Status: ${r.status} - ID: ${r.id}`);
  });

  console.log('\n--- Checking Bookings ---');
  const bookings = await prisma.booking.findMany({
    where: { propertyId },
    include: { hotelRoom: true },
  });
  console.log(`Total bookings found: ${bookings.length}`);
  bookings.forEach(b => {
    console.log(`Booking ID: ${b.id}`);
    console.log(`  Room: #${b.hotelRoom?.roomNumber} (${b.hotelRoom?.category})`);
    console.log(`  Status: ${b.status}`);
    console.log(`  Dates: ${b.startDate.toISOString()} to ${b.endDate.toISOString()}`);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log(`\nToday: ${today.toISOString()}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
