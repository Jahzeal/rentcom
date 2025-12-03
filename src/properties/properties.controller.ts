import {
  Body,
  Controller,
  Post,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { PropertiesService } from './properties.service';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { CreatePropertyDto } from './dto/property.dto';
import { EditPropertyDto } from './dto/property.dto';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
export class PropertiesController {
  constructor(private propertyService: PropertiesService) {}

  @Post('createproperties')
  @Roles('ADMIN')
  createProperty(@Body() dto: CreatePropertyDto) {
    return this.propertyService.createProperty(dto);
  }

  @Patch('editProperty/:id')
  @Roles('ADMIN')
  editProperty(@Param('id') id: string, @Body() dto: EditPropertyDto) {
    return this.propertyService.editProperty(id, dto);
  }
}
