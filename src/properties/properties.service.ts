import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePropertyDto } from './dto/property.dto';

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
          connect: dto.amenities.map((name) => ({ name })),
        },
      },
    });
  }
}
