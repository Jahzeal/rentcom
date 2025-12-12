/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplyForPropertyDto, editUserDto, RequestTourDto } from './dto';
import * as argon from 'argon2';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async editUser(userId: string, dto: editUserDto) {
    const data: any = { ...dto };
    if (dto.password) {
      // Hash the password using argon2
      const hashedPassword = await argon.hash(dto.password);
      data.hash = hashedPassword;
      delete data.password;
    }
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch (error) {
      // Prisma throws P2025 if record doesn't exist
      if (error?.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async requestTour(userId: string, dto: RequestTourDto) {
    const { propertyId } = dto;

    // 1️⃣ Check if property exists
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // 2️⃣ Check for existing tour request
    const existing = await this.prisma.tourRequest.findFirst({
      where: { userId, propertyId },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Tour already requested for this property');
    }

    // 3️⃣ Create tour request
    return this.prisma.tourRequest.create({
      data: { userId, propertyId },
      select: {
        id: true,
        userId: true,
        propertyId: true,
        requestedAt: true,
      },
    });
  }

  async requestToApply(userId: string, dto: ApplyForPropertyDto) {
    const { propertyId } = dto;

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const existing = await this.prisma.appliesRequested.findFirst({
      where: { userId, propertyId },
    });

    if (existing) {
      throw new BadRequestException('already applied for this property');
    }

    const request = await this.prisma.appliesRequested.create({
      data: { userId, propertyId },
    });

    return {
      message: 'Request submitted',
      property, // 🔥 Return full property object
      request,
    };
  }

  async getUserTourRequests(userId: string) {
    return this.prisma.tourRequest.findMany({
      where: { userId },
      include: {
        property: true, // return full property details
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  // Option A: Explicit Check
  async addFavorite(userId: string, dto: { propertyId: string }) {
    const { propertyId } = dto;

    // 1. Check if the Property exists using findUnique
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true }, // Only need the ID, minimizing overhead
    });

    if (!property) {
      // 2. Throw NotFoundException if the property ID is invalid
      throw new NotFoundException(`Property with ID ${propertyId} not found.`);
    }
    try {
      return await this.prisma.favorite.create({
        data: {
          userId,
          propertyId,
        },
      });
    } catch (error: any) {
      // 4. Catch and handle the P2002 error (Duplicate Favorite)
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'This property is already in your favorites.',
        );
      }
      // Re-throw any other errors
      throw error;
    }
  }

  async cancelTour(
    userId: string,
    dto: { propertyId: string; tourId: string },
  ) {
    const { tourId } = dto;
    try {
      return await this.prisma.tourRequest.delete({
        where: {
          id: tourId,
          userId: userId,
        },
      });
    } catch (error: any) {
      // Prisma throws P2025 if record doesn't exist
      if (error?.code === 'P2025') {
        throw new NotFoundException(
          'Tour request not found for the given user and property.',
        );
      }
    }
  }

  async removeFavorite(userId: string, propertyId: string) {
    try {
      return await this.prisma.favorite.delete({
        where: {
          userId_propertyId: {
            userId,
            propertyId, // Use propertyId directly
          },
        },
      });
    } catch (error: any) {
      // Prisma throws P2025 if record doesn't exist
      if (error?.code === 'P2025') {
        throw new NotFoundException(
          'Favorite not found for the given user and property.',
        );
      }
      throw error;
    }
  }

  async getAllUserFavorites(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        property: true, // return full property details
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
