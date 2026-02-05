import { Controller, Get, Post, Body, Req, Headers } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { AdminService } from '../../app/admin/admin.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: '서버 상태 확인' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: '공개 통계 (익명)' })
  async getPublicStats() {
    return this.adminService.getPublicStats();
  }

  @Post('track')
  @ApiOperation({ summary: '방문자 추적' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        visitorId: { type: 'string', description: '방문자 고유 ID (fingerprint)' },
      },
      required: ['visitorId'],
    },
  })
  async trackVisitor(
    @Body() body: { visitorId: string },
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
  ) {
    const ip = forwardedFor || req.ip || req.connection?.remoteAddress;
    return this.adminService.trackVisitor(body.visitorId, ip, userAgent);
  }
}
