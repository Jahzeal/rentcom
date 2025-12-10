import { Controller, Get, Body, Post } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { FilterpropertyDto } from '../rentals/Dto/rentals.dto';

@Controller('rentals')
export class RentalsController {
  constructor(private rentalsService: RentalsService) {}

  @Get('allRentals')
  getRentals() {
    return this.rentalsService.getRentals();
  }

  @Post('filterRentals')
  filterRentals(@Body() dto: FilterpropertyDto) {
    return this.rentalsService.filterRentals(dto); // Update this to use filtering logic
  }
}
