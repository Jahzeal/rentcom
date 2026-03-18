import {
  Body,
  Controller,
  Get,
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
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { GetId } from 'src/admin/decorators/getid.decorator';
import type { User } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
export class PropertiesController {
  constructor(private propertyService: PropertiesService) {}

  @Post('createproperties')
  @Roles('ADMIN', 'AGENT')
  createProperty(@GetUser('id') userId: string, @Body() dto: CreatePropertyDto) {
    return this.propertyService.createProperty(userId, dto);
  }

  @Get('agent-properties/:id')
  @Roles('ADMIN', 'AGENT')
  getAgentProperties(@GetId('id') agentId: string) {
    return this.propertyService.getPropertiesByAgent(agentId);
  }

  @Patch('editProperty/:id')
  @Roles('ADMIN', 'AGENT')
  editProperty(@GetUser() user: User, @Param('id') id: string, @Body() dto: EditPropertyDto) {
    return this.propertyService.editProperty(user, id, dto);
  }
}
