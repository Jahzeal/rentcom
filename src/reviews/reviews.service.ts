import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    // 1. Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    // 2. Determine if user has a booking they checked out of that isn't reviewed yet
    let targetBookingId = dto.bookingId;

    if (!targetBookingId) {
      const completedBooking = await this.prisma.booking.findFirst({
        where: {
          userId,
          propertyId: dto.propertyId,
          status: 'CHECKED_OUT',
          review: null,
        },
      });
      if (completedBooking) {
        targetBookingId = completedBooking.id;
      }
    } else {
      // If bookingId was explicitly provided, verify it belongs to user & property
      const booking = await this.prisma.booking.findUnique({
        where: { id: targetBookingId },
        include: { review: true },
      });
      if (!booking || booking.userId !== userId || booking.propertyId !== dto.propertyId) {
        throw new BadRequestException('Invalid booking reference');
      }
      if (booking.review) {
        throw new ConflictException('A review has already been submitted for this booking');
      }
    }

    // 3. Create review
    return this.prisma.review.create({
      data: {
        userId,
        propertyId: dto.propertyId,
        bookingId: targetBookingId || null,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: {
          select: {
            Firstname: true,
            Lastname: true,
          },
        },
      },
    });
  }

  async getPropertyReviews(propertyId: string) {
    return this.prisma.review.findMany({
      where: { propertyId },
      include: {
        user: {
          select: {
            Firstname: true,
            Lastname: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPropertyReviewsSummary(propertyId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { propertyId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : 0;

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        breakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
      }
    });

    return {
      averageRating,
      totalReviews,
      breakdown,
    };
  }
}
