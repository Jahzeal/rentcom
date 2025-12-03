/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { editUserDto } from '../users/dto/users.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const totalProperties = await this.prisma.property.count();
    const rentalCount = await this.prisma.rental.count();
    const bookingCount = await this.prisma.booking.count();
    return {
      totalUsers,
      rentalCount,
      bookingCount,
      totalProperties,
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async getAllProperties() {
    return this.prisma.property.findMany();
  }
  async deleteUser(userId: string) {
    try {
      return this.prisma.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      // Prisma throws P2025 if record doesn't exist
      if (error.code === 'P2025') {
        console.log('user not found');
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
  async editUser(userId: string, dto: editUserDto) {
    const data: any = { ...dto };
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
}
