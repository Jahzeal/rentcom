import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterpropertyDto } from './Dto/rentals.dto';

@Injectable()
export class RentalsService {
  constructor(private prisma: PrismaService) {}

  async getRentals() {
    // Implement your logic to get rentals based on the dto
    return this.prisma.property.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        amenities: true,
        // Include any other necessary relations like user (if showing agent info)
      },
    });
  }

  async filterRentals(dto: FilterpropertyDto) {
    const orFilters: any[] = [];

    // Search location OR address
    if (dto.searchLocation) {
      orFilters.push(
        { location: { contains: dto.searchLocation, mode: 'insensitive' } },
        { address: { contains: dto.searchLocation, mode: 'insensitive' } },
      );
    }

    // Keyword search
    if (dto.moreOptions?.keywords) {
      orFilters.push(
        { title: { contains: dto.moreOptions.keywords, mode: 'insensitive' } },
        {
          description: {
            contains: dto.moreOptions.keywords,
            mode: 'insensitive',
          },
        },
        {
          amenities: {
            some: {
              name: {
                contains: dto.moreOptions.keywords,
                mode: 'insensitive',
              },
            },
          },
        },
      );
    }

    // STEP 1: Prisma filtering
    let properties = await this.prisma.property.findMany({
      where: {
        ...(dto.propertyType && { type: dto.propertyType }),
        ...(dto.roomType && { typerooms: dto.roomType }),
        ...(orFilters.length > 0 && { OR: orFilters }),
      },
      include: {
        amenities: true,
        rentals: true,
      },
    });

    // STEP 2: Apply price filter manually
    if (dto.price?.min !== undefined && dto.price?.max !== undefined) {
      const { min, max } = dto.price;

      properties = properties.filter((property) => {
        const priceJson = property.price;

        if (!Array.isArray(priceJson)) return false;

        return priceJson.some((item) => {
          if (
            typeof item === 'object' &&
            item !== null &&
            'price' in item &&
            typeof item.price === 'number'
          ) {
            return item.price >= min && item.price <= max;
          }
          return false;
        });
      });
    }

    return properties;
  }
}
