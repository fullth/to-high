import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';

// Both Passport versions must be checked before exchanging a provider code.
function boundOAuthGuard(provider: 'google' | 'kakao') {
  @Injectable()
  class BoundOAuthGuard extends AuthGuard(provider) {
    constructor(readonly config: ConfigService) {
      super();
    }

    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<Request>();
      const res = context.switchToHttp().getResponse<Response>();
      const name = `oauth_${provider}_state`;
      const options = {
        httpOnly: true,
        secure: this.config.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax' as const,
        path: `/auth/${provider}`,
      };
      const state = req.query.state;
      const callback = req.path.replace(/\/+$/, '').endsWith('/callback');
      if (callback) res.clearCookie(name, options);
      if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state)) {
        throw new UnauthorizedException(
          '로그인 요청을 확인할 수 없어요. 다시 로그인해주세요.',
        );
      }
      if (callback) {
        const cookies = (req.headers.cookie || '')
          .split(';')
          .map((part) => part.trim());
        const matches = cookies.filter((part) => part.startsWith(`${name}=`));
        const expected =
          matches.length === 1 ? matches[0].slice(name.length + 1) : '';
        if (
          !/^[a-f0-9]{64}$/.test(expected) ||
          !timingSafeEqual(Buffer.from(state), Buffer.from(expected))
        ) {
          throw new UnauthorizedException(
            '로그인 요청을 확인할 수 없어요. 다시 로그인해주세요.',
          );
        }
      } else {
        res.cookie(name, state, { ...options, maxAge: 10 * 60 * 1000 });
      }
      return super.canActivate(context);
    }

    getAuthenticateOptions(context: ExecutionContext) {
      return {
        state: context.switchToHttp().getRequest<Request>().query
          .state as string,
      };
    }
  }
  return BoundOAuthGuard;
}

@Injectable()
export class GoogleOAuthGuard extends boundOAuthGuard('google') {}
@Injectable()
export class KakaoOAuthGuard extends boundOAuthGuard('kakao') {}
