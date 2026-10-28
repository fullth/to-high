import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthSessionRepository } from '../../../persistence/auth-session/auth-session.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Optional() private authSessionRepository?: AuthSessionRepository,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string; email: string; sid?: string }) {
    if (payload.sid) {
      if (!this.authSessionRepository) return false;
      const session = await this.authSessionRepository.findActive(
        payload.sid,
        payload.sub,
      );
      if (!session) return false;
    }
    return {
      userId: payload.sub,
      email: payload.email,
      ...(payload.sid && { sessionId: payload.sid }),
    };
  }
}
