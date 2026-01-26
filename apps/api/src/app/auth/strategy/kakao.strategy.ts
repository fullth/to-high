import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('KAKAO_CLIENT_ID');
    const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET');
    const callbackURL = configService.get<string>('KAKAO_CALLBACK_URL');

    if (!clientID || !callbackURL) {
      throw new Error('Kakao OAuth 환경변수가 설정되지 않았습니다. (KAKAO_CLIENT_ID, KAKAO_CALLBACK_URL)');
    }

    super({
      clientID,
      clientSecret: clientSecret || '',
      callbackURL,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ) {
    try {
      const kakaoAccount = profile._json?.kakao_account;
      const email = kakaoAccount?.email || `kakao_${profile.id}@kakao.com`;
      const name = profile.displayName || kakaoAccount?.profile?.nickname || '카카오 사용자';
      const picture = kakaoAccount?.profile?.profile_image_url || kakaoAccount?.profile?.thumbnail_image_url;

      const user = await this.authService.validateKakaoUser({
        email,
        name,
        picture,
        kakaoId: profile.id,
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
