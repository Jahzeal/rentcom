import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Data ---');

    // 1. Check if shortlets exist in Property table (for Rentals page)
    const properties = await prisma.property.findMany({
        where: { type: 'ShortLET' },
        select: { id: true, title: true, type: true },
    });

    console.log(`Found ${properties.length} shortlet properties:`);
    properties.forEach((p) => console.log(`- ${p.title} (${p.type}) [ID: ${p.id}]`));

    if (properties.length === 0) {
        console.error('No shortlet properties found!');
        process.exit(1);
    }

    // 2. Find a valid Shortlet record to verify details
    const shortletRecord = await prisma.shortlet.findFirst({
        include: {
            property: true,
            roomOptions: true,
        },
    });

    if (!shortletRecord) {
        console.error('No valid Shortlet records found in the database (with relations)');
        process.exit(1);
    }

    console.log('\n--- Valid Shortlet Details ---');
    console.log(`Title: ${shortletRecord.property.title}`);
    console.log(`ID: ${shortletRecord.id}`);
    console.log(`Property ID: ${shortletRecord.propertyId}`);
    console.log(`Location: ${shortletRecord.property.location}`);
    console.log(`Room Options (${shortletRecord.roomOptions.length}):`);
    shortletRecord.roomOptions.forEach((ro) => {
        console.log(`  - ${ro.name}: ₦${ro.price} (Beds: ${ro.beds})`);
        console.log(`    Images: ${ro.images.length} found`);
        ro.images.forEach((img) => console.log(`      - ${img}`));
    });

    console.log('\nVerification successful!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
