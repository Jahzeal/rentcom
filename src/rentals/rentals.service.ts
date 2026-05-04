import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterPropertyDto } from './Dto/rentals.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Public method to fetch rentals.
   * Handles filters, search, pagination, and property type.
   */
  async getRentals(dto: FilterPropertyDto = {}) {
    return this.applyFilters(dto);
  }

  /**
   * Private helper that contains filtering and pagination logic.
   */
  private async applyFilters(dto: FilterPropertyDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;

    const orFilters: Prisma.PropertyWhereInput[] = [];

    // Location or address search
    if (dto.searchLocation) {
      orFilters.push(
        { location: { contains: dto.searchLocation, mode: 'insensitive' } },
        { address: { contains: dto.searchLocation, mode: 'insensitive' } },
      );
    }

    // Keyword search across title, description, amenities
    if (dto.moreOptions?.keywords) {
      const keyword = dto.moreOptions.keywords;
      orFilters.push(
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        {
          amenities: {
            some: { name: { contains: keyword, mode: 'insensitive' } },
          },
        },
      );
    }

    // Base Prisma where clause
    const whereClause: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(dto.propertyType && { type: dto.propertyType }),
      ...(dto.roomType && { typerooms: dto.roomType }),
      ...(dto.userId && { userId: dto.userId }),
      AND: [
        ...(orFilters.length > 0 ? [{ OR: orFilters }] : []),
        {
          OR: [
            { type: { not: 'HOTEL_ROOM' } }, // Show all non-hotel properties
            { 
              hotelRooms: {
                some: { status: 'AVAILABLE' }
              }
            }
          ]
        }
      ]
    };

    // Availability Filter (Move-in / Move-out)
    if (dto.moreOptions?.moveInDate && dto.moreOptions?.moveOutDate) {
      const start = new Date(dto.moreOptions.moveInDate);
      const end = new Date(dto.moreOptions.moveOutDate);

      // Exclude properties with overlapping CONFIRMED or PENDING bookings
      whereClause.NOT = {
        bookings: {
          some: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            AND: [
              { startDate: { lt: end } },
              { endDate: { gt: start } }
            ]
          }
        }
      };
    }

    // Fetch ALL matching properties first to ensure correct grouping
    // In a massive production DB, this should be a raw SQL grouping query for performance
    const allMatchingProperties = await this.prisma.property.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        amenities: true,
        user: { select: { id: true, hotelName: true, hotelAddress: true, hotelLocation: true, isManagement: true, role: true } },
        hotelRooms: { select: { status: true } },
        shortlet: {
          include: {
            roomOptions: true,
          },
        },
      },
    });

    let finalProperties: any[] = [];

    // Grouping Logic for HOTEL_ROOM
    if (!dto.userId) {
      const hotelGroups = new Map<string, any[]>();
      const standalone: any[] = [];

      for (const p of allMatchingProperties) {
        // Only group for accounts with an ACTIVE Management Subscription
        if ((p.type === 'HOTEL_ROOM' || p.type === 'ShortLET') && p.userId && p.user?.isManagement) {
          if (!hotelGroups.has(p.userId)) hotelGroups.set(p.userId, []);
          hotelGroups.get(p.userId)?.push(p);
        } else {
          standalone.push(p);
        }
      }

      // Convert Hotel Groups to Single "Hotel Listings"
      const hotelListings = Array.from(hotelGroups.entries()).map(([userId, rooms]) => {
        const firstRoom = rooms[0];
        const allPrices = rooms.flatMap(r => {
          const pRaw = r.price as any;
          // 1. Handle Array of objects (Shortlets/Legacy)
          if (Array.isArray(pRaw)) return pRaw.map(p => p.price || 0);
          // 2. Handle Single Number or String
          const num = parseFloat(pRaw);
          if (!isNaN(num) && num > 0) return [num];
          // 3. Handle object with amount property
          if (pRaw && typeof pRaw === 'object' && pRaw.amount) return [parseFloat(pRaw.amount)];

          console.warn(`[Grouping] Could not parse price for room ${r.id}:`, pRaw);
          return [];
        }).filter(p => p > 0);

        const allBeds = rooms.map(r => r.beds || 1);
        const allBaths = rooms.map(r => r.baths || 1);
        const minBeds = Math.min(...allBeds);
        const maxBeds = Math.max(...allBeds);

        const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
        const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

        return {
          id: `hotel-${userId}`,
          isHotelListing: true,
          userId: userId,
          title: firstRoom.user?.hotelName || "Hotel",
          address: firstRoom.user?.hotelAddress || firstRoom.address,
          location: firstRoom.user?.hotelLocation || firstRoom.location,
          images: rooms.flatMap(r => r.images).slice(0, 10),
          type: rooms.some(r => r.type === 'ShortLET') && rooms.some(r => r.type === 'HOTEL_ROOM') ? 'HOTEL_SHORTLET' : firstRoom.type,
          priceRange: { min: minPrice, max: maxPrice },
          price: minPrice, // Fallback for sort/filter
          totalRooms: rooms.length,
          beds: minBeds,
          baths: Math.min(...allBaths),
          // Pass room options so ListingCard can show the range (e.g. 1-2 bd)
          roomOptions: rooms.map(r => ({
             beds: r.beds || 1,
             price: typeof r.price === 'number' ? r.price : 0,
             name: r.roomName
          })),
          user: firstRoom.user,
          amenities: Array.from(new Set(rooms.flatMap(r => r.amenities.map(a => a.name)))).map(name => ({ name })),
          description: `Welcome to ${firstRoom.user?.hotelName}. We have ${rooms.length} rooms available for your stay.`
        };
      });

      finalProperties = [...standalone, ...hotelListings];
    } else {
      finalProperties = allMatchingProperties;
    }

    // JSON price filter (TypeScript-safe) on consolidated list
    if (dto.price?.min !== undefined || dto.price?.max !== undefined) {
      const { min, max } = dto.price;
      finalProperties = finalProperties.filter((p) => {
        if (p.isHotelListing) {
          return (min === undefined || p.priceRange.max >= min) && (max === undefined || p.priceRange.min <= max);
        }
        const priceJson = p.price;
        if (!Array.isArray(priceJson)) return false;
        return priceJson.some((item: any) => {
          if (!item?.price) return false;
          if (min !== undefined && item.price < min) return false;
          if (max !== undefined && item.price > max) return false;
          return true;
        });
      });
    }

    // Now apply pagination to the final consolidated list
    const total = finalProperties.length;
    const paginatedProperties = finalProperties.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedProperties,
      meta: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total,
      },
    };
  }
}
