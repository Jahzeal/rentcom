import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterPropertyDto } from './Dto/rentals.dto';
import { Prisma, Property } from '@prisma/client';

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

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
      ...(dto.propertyType && { type: dto.propertyType }),
      ...(dto.roomType && { typerooms: dto.roomType }),
      ...(orFilters.length > 0 && { OR: orFilters }),
    };

    // Fetch paginated properties
    let properties: Property[] = await this.prisma.property.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        amenities: true,
        // rentals: true,
      },
    });

    // JSON price filter (TypeScript-safe)
    if (dto.price?.min !== undefined || dto.price?.max !== undefined) {
      const { min, max } = dto.price;

      properties = properties.filter((property) => {
        const priceJson = property.price;

        if (!Array.isArray(priceJson)) return false;

        return priceJson.some((item): boolean => {
          if (typeof item !== 'object' || item === null) return false;

          // Narrow type to object with optional price
          const priceItem = item as { price?: number };

          if (priceItem.price === undefined) return false;
          if (min !== undefined && priceItem.price < min) return false;
          if (max !== undefined && priceItem.price > max) return false;

          return true;
        });
      });
    }

    // Total count (ignores in-memory price filtering)
    const total = await this.prisma.property.count({
      where: whereClause,
    });

    // Product-ready response
    return {
      data: properties,
      meta: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total,
      },
    };
  }
}
