import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InquiryAuthGuard } from '../../common/inquiry-auth.guard';
import { JwtAuthGuard } from '../../common/jwt.guard';
import { InquiryService } from '../../app/inquiry/inquiry.service';
import { InquiryType } from '../../database/inquiry.schema';

@Controller('inquiry')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Post()
  @UseGuards(InquiryAuthGuard)
  async create(
    @Req() req: any,
    @Body() body: { type: InquiryType; message: string; email?: string },
  ) {
    // 비회원인 경우 이메일 필수
    const userId = req.user?.userId || null;
    if (!userId && !body.email) {
      throw new BadRequestException('비회원 문의에는 이메일이 필요해요.');
    }
    return this.inquiryService.create(
      userId,
      body.type,
      body.message,
      body.email,
    );
  }

  @Post(':id/message')
  @UseGuards(InquiryAuthGuard)
  async addMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    const userId = req.user?.userId || null;
    return this.inquiryService.addMessage(id, userId, body.message);
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
