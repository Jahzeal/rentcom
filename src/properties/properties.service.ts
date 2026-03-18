/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePropertyDto, EditPropertyDto } from './dto/property.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}
  async createProperty(userId: string, dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        price: dto.price as Prisma.InputJsonValue,
        address: dto.address,
        images: dto.images,
        beds: dto.beds,
        typerooms: dto.typerooms,
        baths: dto.baths,
        offers: dto.offers,
        location: dto.location,
        coords: dto.coords as Prisma.InputJsonValue,

        amenities: {
          connectOrCreate: dto.amenities.map((name) => ({
            where: { name }, // find amenity by unique name
            create: { name }, // create if doesn't exist
          })),
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
    }
  }

  async getPropertiesByAgent(agentId: string) {
    return this.prisma.property.findMany({
      where: { userId: agentId },
      include: {
        amenities: true,
        shortlet: {
          include: {
            roomOptions: true,
          },
        },
      },
    });
  }
}
