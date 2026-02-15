import { PrismaClient, PropertyType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding shortlets...');

  const shortlets = [
    {
      title: 'Skyline Penthouse with Panoramic Views',
      description: 'Experience luxury living at its finest in this stunning penthouse suite. Offering breathtaking views of the Lagos skyline, this property is perfect for business travelers and vacationers seeking comfort and style.',
      location: 'Victoria Island, Lagos',
      address: '123 Adetokunbo Ademola Street, Victoria Island, Lagos',
      images: [
        'https://images.unsplash.com/photo-1512918760383-eda2723ad6e1?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
      ],
      coords: { lat: 6.4281, lng: 3.4219 },
      offers: 'WiFi, Pool, Gym, 24/7 Power',
      amenities: ['WiFi', 'Pool', 'Gym', '24/7 Power', 'Security', 'Parking'],
      roomOptions: [
        {
          name: '1 Bedroom Suite',
          beds: 1,
          price: 150000,
          description: 'Spacious 1-bedroom suite with city view',
          amenities: ['WiFi', 'Smart TV', 'Ensuite Bathroom'],
          images: [
            'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop',
          ],
        },
        {
          name: '2 Bedroom Executive',
          beds: 2,
          price: 250000,
          description: 'Luxury 2-bedroom apartment perfect for families',
          amenities: ['WiFi', 'Smart TV', 'Kitchen', 'Balcony'],
          images: [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=400&h=300&fit=crop',
          ],
        },
        {
          name: '3 Bedroom Penthouse',
          beds: 3,
          price: 400000,
          description: 'The ultimate luxury experience with panoramic views',
          amenities: ['Private Pool', 'Chef Service', 'Cinema Room'],
          images: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400&h=300&fit=crop',
          ],
        },
      ],
    },
    {
      title: 'Cozy Lekki Apartment',
      description: 'A charming and comfortable apartment located in the heart of Lekki Phase 1. Close to major attractions, restaurants, and shopping centers.',
      location: 'Lekki Phase 1, Lagos',
      address: '45 Admiralty Way, Lekki Phase 1, Lagos',
      images: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1522771753035-4a50c95b9386?w=800&h=600&fit=crop',
      ],
      coords: { lat: 6.4500, lng: 3.4600 },
      offers: 'WiFi, Smart TV, Kitchen',
      amenities: ['WiFi', 'Smart TV', 'Kitchen', 'Air Conditioning'],
      roomOptions: [
        {
          name: 'Standard 1 Bedroom',
          beds: 1,
          price: 120000,
          description: 'Cozy room with all essential amenities',
          amenities: ['WiFi', 'AC', 'Work Desk'],
          images: [
            'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop',
          ],
        },
        {
          name: 'Premium 2 Bedroom',
          beds: 2,
          price: 200000,
          description: 'Extra space and comfort for groups',
          amenities: ['WiFi', 'AC', 'Living Area', 'Full Kitchen'],
          images: [
            'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=400&h=300&fit=crop',
          ],
        },
      ],
    },
    {
      title: 'Elegant Ikoyi Residence',
      description: 'Stay in the exclusive neighborhood of Ikoyi. This residence offers privacy, security, and sophisticated interiors for discerning guests.',
      location: 'Ikoyi, Lagos',
      address: '10 Bourdillon Road, Ikoyi, Lagos',
      images: [
        'https://images.unsplash.com/photo-1502005229766-9397ebb86c98?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1484154218962-a1c00207bf9a?w=800&h=600&fit=crop',
      ],
      coords: { lat: 6.4474, lng: 3.4149 },
      offers: 'Security, Garden, Concierge',
      amenities: ['24/7 Security', 'Garden', 'Backup Power', 'Concierge'],
      roomOptions: [
        {
          name: 'Executive 2 Bedroom',
          beds: 2,
          price: 350000,
          description: 'Modern design with premium finishings',
          amenities: ['High-speed Internet', 'Premium TV Channels', 'Housekeeping'],
          images: [
            'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400&h=300&fit=crop',
          ],
        },
        {
          name: 'Presidential 3 Bedroom',
          beds: 3,
          price: 500000,
          description: ' expansive layout with dedicated study and dining area',
          amenities: ['Private Garden Access', 'Butler Service', 'Jacuzzi'],
          images: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400&h=300&fit=crop',
          ],
        },
      ],
    },
  ];

  for (const s of shortlets) {
    // 1. Create Property
    const property = await prisma.property.create({
      data: {
        title: s.title,
        description: s.description,
        type: PropertyType.ShortLET,
        address: s.address,
        location: s.location,
        coords: s.coords,
        images: s.images,
        offers: s.offers,
        price: [], // Shortlets rely on room option prices
        beds: 0,   // Aggregated in room options
        baths: 0,
        typerooms: 'Shortlet',
      },
    });

    // 2. Create Shortlet & Room Options
    await prisma.shortlet.create({
      data: {
        propertyId: property.id,
        roomOptions: {
          create: s.roomOptions.map((ro) => ({
            name: ro.name,
            beds: ro.beds,
            price: ro.price,
            description: ro.description,
            amenities: ro.amenities,
            images: ro.images,
          })),
        },
      },
    });

    console.log(`Created shortlet: ${s.title}`);
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
