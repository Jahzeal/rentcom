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
    // STEP 1: Prisma filtering (except price)
    let properties = await this.prisma.property.findMany({
      where: {
        ...(dto.propertyType && { type: dto.propertyType }),

        ...(dto.roomType && { typerooms: dto.roomType }),

        ...(dto.searchLocation && {
          OR: [
            { location: { contains: dto.searchLocation, mode: 'insensitive' } },
            { address: { contains: dto.searchLocation, mode: 'insensitive' } },
          ],
        }),

        ...(dto.moreOptions?.keywords && {
          OR: [
            {
              title: {
                contains: dto.moreOptions.keywords,
                mode: 'insensitive',
              },
            },
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
          ],
        }),
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
        if (!Array.isArray(property.price)) return false;

        // Check if ANY price fits the range
        return property.price.some(
          (p: { price: number }) => p.price >= min && p.price <= max,
        );
      });
    }

    return properties;
  }
}
