import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../../app/auth/auth.service';
import type { UserResponse } from './dto/auth.response';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @ApiOperation({
    summary: 'Google OAuth 로그인',
    description: 'Google OAuth 로그인 페이지로 리다이렉트합니다.',
  })
  @ApiResponse({ status: 302, description: 'Google 로그인 페이지로 리다이렉트' })
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth 콜백',
    description: 'Google 인증 후 토큰과 함께 프론트엔드로 리다이렉트합니다.',
  })
  @ApiResponse({ status: 302, description: '프론트엔드로 리다이렉트 (토큰 포함)' })
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any, @Res() res: Response): void {
    const token = this.authService.generateToken(req.user);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '현재 사용자 정보 조회',
    description: 'JWT 토큰으로 인증된 현재 사용자의 정보를 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 조회 성공',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: '사용자 ID' },
        email: { type: 'string', description: '이메일 주소' },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any): UserResponse {
    return {
      userId: req.user.userId,
      email: req.user.email,
    };
  }
}
