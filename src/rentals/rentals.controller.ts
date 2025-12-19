import { Controller, Get, Body, Query } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { FilterPropertyDto } from '../rentals/Dto/rentals.dto';

@Controller('rentals')
export class RentalsController {
  constructor(private rentalsService: RentalsService) {}

  @Get()
  async getRentals(@Query() dto: FilterPropertyDto) {
    return this.rentalsService.getRentals(dto);
  }
}
