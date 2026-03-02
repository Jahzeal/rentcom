import { PrismaClient, PropertyType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Syncing Shortlet Data ---');

    const shortlets = await prisma.shortlet.findMany({
        include: {
            roomOptions: true,
            property: true,
        },
    });

    console.log(`Found ${shortlets.length} shortlets to sync.`);

    for (const shortlet of shortlets) {
        console.log(`Syncing ${shortlet.property.title} (ID: ${shortlet.id})...`);

        const prices = shortlet.roomOptions.map(ro => ({ beds: ro.beds, price: ro.price }));
        const minBeds = shortlet.roomOptions.length > 0 ? Math.min(...shortlet.roomOptions.map(ro => ro.beds)) : 0;

        await prisma.property.update({
            where: { id: shortlet.propertyId },
            data: {
                price: prices,
                beds: minBeds,
            },
        });

        console.log(`  - Updated price array (${prices.length} options) and min beds (${minBeds}).`);
    }

    console.log('\nSync complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
