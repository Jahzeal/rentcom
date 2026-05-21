import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @UseGuards(JwtGuard)
  @Post()
  createReview(@GetUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(userId, dto);
  }

  @Get('property/:propertyId')
  getPropertyReviews(@Param('propertyId') propertyId: string) {
    return this.reviewsService.getPropertyReviews(propertyId);
  }

  @Get('property/:propertyId/summary')
  getPropertyReviewsSummary(@Param('propertyId') propertyId: string) {
    return this.reviewsService.getPropertyReviewsSummary(propertyId);
  }
}
