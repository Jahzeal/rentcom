/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePropertyDto, EditPropertyDto } from './dto/property.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}
  async createProperty(dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        price: dto.price,
        address: dto.address,
        images: dto.images,
        beds: dto.beds,
        typerooms: dto.typerooms,
        baths: dto.baths,
        amenities: {
          create: dto.amenities.map((name) => ({ name })),
        },
      },
      include: {
        amenities: true,
      },
    });
  }

  async editProperty(propertyId: string, dto: EditPropertyDto) {
    const { amenities, ...rest } = dto;

    const data: Prisma.PropertyUpdateInput = {
      ...rest,
      amenities: amenities?.length
        ? {
            // This handles creating new amenities if they don’t exist
            connectOrCreate: amenities.map((name) => ({
              where: { name },
              create: { name },
            })),
          }
        : undefined, // if no amenities provided, skip
    };

    try {
      return await this.prisma.property.update({
        where: { id: propertyId },
        data,
        include: { amenities: true }, // optional: include related amenities
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      if (error.code?.toLowerCase() === 'p2025') {
        throw new NotFoundException('Property not found');
      }
      throw error;
    }
  }
}
