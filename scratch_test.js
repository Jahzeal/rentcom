const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    include: {
      property: {
        include: {
          user: {
            select: {
              id: true,
              hotelName: true,
              isManagement: true,
              bankName: true,
              accountName: true,
              accountNumber: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 2
  });
  console.log(JSON.stringify(bookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
