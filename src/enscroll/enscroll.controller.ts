// import { Body, Controller, Post, UseGuards } from '@nestjs/common';
// import { JwtGuard } from 'src/auth/guard';
// import { RolesGuard } from 'src/auth/guard/roles.guard';
// import { Roles } from 'src/auth/decorator/roles.decorator';
// import { uploadBedspace } from './dto/enscroll';
// import { EnscrollService } from './enscroll.service';

// @Controller('admin')
// @UseGuards(JwtGuard, RolesGuard)
// export class enscrollController {
//   constructor(private enscrollService: EnscrollService) {}

//   @Post('uploadbedspace')
//   @Roles('enscrollusers')
//   createBedspace(@Body() dto: uploadBedspace) {
//     return this.enscrollService.createBedSpace(dto);
//   }
// }
