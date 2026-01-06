import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from '../../app/auth/auth.service';
import type { TokenResponse, UserResponse } from './dto/auth.response';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any, @Res() res: Response): void {
    const token = this.authService.generateToken(req.user);
    const response: TokenResponse = { accessToken: token };
    res.json(response);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any): UserResponse {
    return {
      userId: req.user.userId,
      email: req.user.email,
    };
  }
}
