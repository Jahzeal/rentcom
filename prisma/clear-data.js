const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearData() {
  console.log('Starting to clear database (keeping Users)...');
  try {
    // Delete root entities (cascades will handle related records like Bookings, Reviews, Favorites, etc.)
    const deletedProperties = await prisma.property.deleteMany({});
    console.log(`Deleted ${deletedProperties.count} properties (and all related bookings, rentals, favorites).`);

    const deletedEnscrolls = await prisma.enscroll.deleteMany({});
    console.log(`Deleted ${deletedEnscrolls.count} enscrolls.`);

    const deletedStaff = await prisma.managementStaff.deleteMany({});
    console.log(`Deleted ${deletedStaff.count} management staff.`);

    const deletedTickets = await prisma.supportTicket.deleteMany({});
    console.log(`Deleted ${deletedTickets.count} support tickets.`);

    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(`Deleted ${deletedPayments.count} remaining payments.`);

    // Just to be absolutely sure no loose ends remain
    const deletedBookings = await prisma.booking.deleteMany({});
    console.log(`Deleted ${deletedBookings.count} orphaned bookings.`);

    console.log('Successfully cleared all test data! Users remain intact.');
  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
