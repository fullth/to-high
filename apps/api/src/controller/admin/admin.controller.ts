import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
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

  @Get('sessions')
  @ApiOperation({
    summary: '세션 목록',
    description: '모든 세션 목록을 조회합니다. 비로그인 사용자 세션 포함.',
  })
  @ApiQuery({ name: 'anonymous', required: false, type: Boolean, description: '비로그인 세션만 필터링' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '조회 개수 (기본 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: '시작 위치' })
  @ApiResponse({
    status: 200,
    description: '세션 목록',
  })
  async getSessions(
    @Req() req: any,
    @Query('anonymous') anonymous?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.checkAdmin(req.user.email);
    return this.adminService.getAllSessions({
      anonymous: anonymous === 'true' ? true : anonymous === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // 일괄 삭제는 파라미터 라우트보다 먼저 정의해야 함
  @Post('sessions/delete-batch')
  @ApiOperation({
    summary: '세션 일괄 삭제',
    description: '여러 세션을 일괄 삭제합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '삭제 완료',
  })
  async deleteSessions(@Req() req: any, @Body() body: { sessionIds: string[] }) {
    this.checkAdmin(req.user.email);
    console.log('Delete batch request:', body);
    try {
      const result = await this.adminService.deleteSessions(body.sessionIds);
      console.log('Delete batch result:', result);
      return result;
    } catch (error) {
      console.error('Delete batch error:', error);
      throw error;
    }
  }

  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: '세션 상세 조회',
    description: '세션의 대화 내용을 포함한 상세 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '세션 상세 정보',
  })
  async getSessionDetail(@Req() req: any, @Param('sessionId') sessionId: string) {
    this.checkAdmin(req.user.email);
    return this.adminService.getSessionDetail(sessionId);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({
    summary: '세션 삭제',
    description: '세션을 삭제합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '삭제 완료',
  })
  async deleteSession(@Req() req: any, @Param('sessionId') sessionId: string) {
    this.checkAdmin(req.user.email);
    return this.adminService.deleteSession(sessionId);
  }

  @Get('visitors')
  @ApiOperation({
    summary: '방문자 목록',
    description: '비로그인 방문자 목록을 조회합니다.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '조회 개수 (기본 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: '시작 위치' })
  @ApiResponse({
    status: 200,
    description: '방문자 목록',
  })
  async getVisitors(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.checkAdmin(req.user.email);
    return this.adminService.getVisitors({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
