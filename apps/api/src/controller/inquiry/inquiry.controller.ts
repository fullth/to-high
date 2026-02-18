import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt.guard';
import { InquiryService } from '../../app/inquiry/inquiry.service';
import { InquiryType } from '../../database/inquiry.schema';

@Controller('inquiry')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: any,
    @Body() body: { type: InquiryType; message: string },
  ) {
    return this.inquiryService.create(req.user.userId, body.type, body.message);
  }

  @Post(':id/message')
  @UseGuards(JwtAuthGuard)
  async addMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.inquiryService.addMessage(id, req.user.userId, body.message);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    return this.inquiryService.getUserInquiries(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async get(@Req() req: any, @Param('id') id: string) {
    return this.inquiryService.getInquiry(id, req.user.userId);
  }
}
