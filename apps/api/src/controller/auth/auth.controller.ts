import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { GoogleOAuthGuard, KakaoOAuthGuard } from '../../common/oauth.guard';
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
  @ApiResponse({
    status: 302,
    description: 'Google 로그인 페이지로 리다이렉트',
  })
  @UseGuards(GoogleOAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth 콜백',
    description: 'Google 인증 후 토큰과 함께 프론트엔드로 리다이렉트합니다.',
  })
  @ApiResponse({
    status: 302,
    description: '프론트엔드로 리다이렉트 (토큰 포함)',
  })
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    const token = await this.authService.generateToken(req.user, 'google');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // The fragment is consumed once by the initiating tab, never sent to the web server.
    const result = new URLSearchParams({ token, state: req.query.state });
    res.redirect(`${frontendUrl}/auth/callback#${result}`);
  }

  @Get('kakao')
  @ApiOperation({
    summary: 'Kakao OAuth 로그인',
    description: 'Kakao OAuth 로그인 페이지로 리다이렉트합니다.',
  })
  @ApiResponse({ status: 302, description: 'Kakao 로그인 페이지로 리다이렉트' })
  @UseGuards(KakaoOAuthGuard)
  kakaoLogin() {}

  @Get('kakao/callback')
  @ApiOperation({
    summary: 'Kakao OAuth 콜백',
    description: 'Kakao 인증 후 토큰과 함께 프론트엔드로 리다이렉트합니다.',
  })
  @ApiResponse({
    status: 302,
    description: '프론트엔드로 리다이렉트 (토큰 포함)',
  })
  @UseGuards(KakaoOAuthGuard)
  async kakaoCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    const token = await this.authService.generateToken(req.user, 'kakao');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // The fragment is consumed once by the initiating tab, never sent to the web server.
    const result = new URLSearchParams({ token, state: req.query.state });
    res.redirect(`${frontendUrl}/auth/callback#${result}`);
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
        name: { type: 'string', description: '사용자 이름' },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @UseGuards(AuthGuard('jwt'))
  async getMe(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponse> {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Authorization');
    const user = await this.authService.findById(req.user.userId);
    return {
      userId: req.user.userId,
      email: req.user.email,
      name: user?.name,
    };
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '로그아웃',
    description: '현재 로그인 세션을 폐기합니다.',
  })
  @ApiResponse({ status: 200, description: '로그인 세션 폐기 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: any): Promise<{ loggedOut: true }> {
    await this.authService.revokeSession(req.user.userId, req.user.sessionId);
    return { loggedOut: true };
  }
}
