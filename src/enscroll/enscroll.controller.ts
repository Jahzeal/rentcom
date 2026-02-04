import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { UploadBedspace } from './dto/enscroll';
import { EnscrollService } from './enscroll.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('enscroll')
@Controller('users/enscroll')
export class EnscrollController {
  constructor(private enscrollService: EnscrollService) {}

  @Post('uploadbedspace')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  createBedspace(@GetUser('id') userId: string, @Body() dto: UploadBedspace) {
    return this.enscrollService.uploadBedspace(userId, dto);
  }

  @Get('getbedspace')
  getBedspace() {
    return this.enscrollService.getBedspace();
  }
}
