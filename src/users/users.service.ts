/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { editUserDto } from './dto';
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
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
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
    } catch (error) {
      // 4. Catch and handle the P2002 error (Duplicate Favorite)
      if (error.code === 'P2002') {
        throw new ConflictException(
          'This property is already in your favorites.',
        );
      }
      // Re-throw any other errors
      throw error;
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
    } catch (error) {
      // Prisma throws P2025 if record doesn't exist
      if (error.code === 'P2025') {
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
