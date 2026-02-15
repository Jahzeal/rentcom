import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ShortletsService } from './shortlets.service';
import {
    CreateShortletDto,
    UpdateShortletDto,
    CreateRoomOptionDto,
    UpdateRoomOptionDto,
} from './dto';
import { JwtGuard } from 'src/auth/guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';

@Controller('api/v1/shortlets')
export class ShortletsController {
    constructor(private shortletsService: ShortletsService) { }

    // Public Endpoints


    @Get('property/:propertyId')
    getShortletByPropertyId(@Param('propertyId') propertyId: string) {
        return this.shortletsService.getShortletByPropertyId(propertyId);
    }

    @Get(':id')
    getShortletById(@Param('id') id: string) {
        return this.shortletsService.getShortletById(id);
    }
}

@Controller('admin/shortlets')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class ShortletsAdminController {
    constructor(private shortletsService: ShortletsService) { }

    // Admin Endpoints
    @Post()
    createShortlet(@Body() dto: CreateShortletDto) {
        return this.shortletsService.createShortlet(dto);
    }

    @Patch(':id')
    updateShortlet(@Param('id') id: string, @Body() dto: UpdateShortletDto) {
        return this.shortletsService.updateShortlet(id, dto);
    }

    @Post(':id/room-options')
    addRoomOption(
        @Param('id') shortletId: string,
        @Body() dto: CreateRoomOptionDto,
    ) {
        return this.shortletsService.addRoomOption(shortletId, dto);
    }

    @Patch(':id/room-options/:roomId')
    updateRoomOption(
        @Param('id') shortletId: string,
        @Param('roomId') roomId: string,
        @Body() dto: UpdateRoomOptionDto,
    ) {
        return this.shortletsService.updateRoomOption(shortletId, roomId, dto);
    }

    @Delete(':id/room-options/:roomId')
    deleteRoomOption(
        @Param('id') shortletId: string,
        @Param('roomId') roomId: string,
    ) {
        return this.shortletsService.deleteRoomOption(shortletId, roomId);
    }

    @Delete(':id')
    deleteShortlet(@Param('id') id: string) {
        return this.shortletsService.deleteShortlet(id);
    }
}
