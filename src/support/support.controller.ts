import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @ApiOperation({ summary: 'Create a support ticket' })
  @Post('ticket')
  createTicket(@Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(dto);
  }

  @ApiOperation({ summary: 'Get all support tickets (Admin only)' })
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('tickets')
  getAllTickets() {
    return this.supportService.getAllTickets();
  }

  @ApiOperation({ summary: 'Get a specific ticket (Admin only)' })
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('tickets/:id')
  getTicketById(@Param('id') id: string) {
    return this.supportService.getTicketById(id);
  }

  @ApiOperation({ summary: 'Update ticket status (Admin only)' })
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('tickets/:id/status')
  updateTicketStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.supportService.updateTicketStatus(id, status);
  }
}
