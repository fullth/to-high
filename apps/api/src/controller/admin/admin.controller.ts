import {
  Controller,
  Get,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AdminService } from '../../app/admin/admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  private adminEmails: string[];

  constructor(
    private adminService: AdminService,
    private configService: ConfigService,
  ) {
    // 환경변수에서 관리자 이메일 목록 로드 (콤마로 구분)
    const adminEmailsEnv = this.configService.get<string>('ADMIN_EMAILS');
    this.adminEmails = adminEmailsEnv
      ? adminEmailsEnv.split(',').map((e) => e.trim())
      : ['xoghksdla@gmail.com']; // 기본값
  }

  private checkAdmin(email: string) {
    if (!this.adminEmails.includes(email)) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
  }

  @Get('dashboard')
  @ApiOperation({
    summary: '대시보드 통계',
    description: '전체 사용자 수, 세션 수 등 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '대시보드 통계',
  })
  async getDashboard(@Req() req: any) {
    this.checkAdmin(req.user.email);
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({
    summary: '사용자 목록',
    description: '모든 사용자와 세션 수를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 목록',
  })
  async getUsers(@Req() req: any) {
    this.checkAdmin(req.user.email);
    return this.adminService.getUsersWithSessionCount();
  }
}
