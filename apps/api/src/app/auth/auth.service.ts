import { Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../../database/user.schema';
import { UserRepository } from '../../persistence/user/user.repository';
import { NotificationService } from '../../common/notification.service';
import { AuthSessionRepository } from '../../persistence/auth-session/auth-session.repository';

const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface GoogleUserDto {
  email: string;
  name: string;
  picture: string;
  googleId: string;
}

interface KakaoUserDto {
  email: string;
  name: string;
  picture?: string;
  kakaoId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private notificationService: NotificationService,
    @Optional() private authSessionRepository?: AuthSessionRepository,
  ) {}

  async validateGoogleUser(dto: GoogleUserDto): Promise<UserDocument> {
    let user = await this.userRepository.findByGoogleId(dto.googleId);

    if (!user) {
      user = await this.userRepository.create(dto);

      // 새 사용자 알림 발송
      const totalUsers = await this.userRepository.countAll();
      this.notificationService.notifyNewUser(
        { email: dto.email, name: dto.name, picture: dto.picture },
        totalUsers,
      );
    }

    return user;
  }

  async validateKakaoUser(dto: KakaoUserDto): Promise<UserDocument> {
    let user = await this.userRepository.findByKakaoId(dto.kakaoId);

    if (!user) {
      // 같은 이메일로 가입된 사용자가 있는지 확인 (Google로 가입한 경우)
      user = await this.userRepository.findByEmail(dto.email);

      if (user) {
        // 기존 사용자에 kakaoId 추가 (계정 연동)
        // 이 경우 별도의 업데이트 메서드가 필요하지만, 우선 새 계정 생성
        user = await this.userRepository.create({
          email: dto.email,
          name: dto.name,
          picture: dto.picture,
          kakaoId: dto.kakaoId,
        });
      } else {
        user = await this.userRepository.create({
          email: dto.email,
          name: dto.name,
          picture: dto.picture,
          kakaoId: dto.kakaoId,
        });

        // 새 사용자 알림 발송
        const totalUsers = await this.userRepository.countAll();
        this.notificationService.notifyNewUser(
          { email: dto.email, name: dto.name, picture: dto.picture },
          totalUsers,
        );
      }
    }

    return user;
  }

  async generateToken(
    user: UserDocument,
    provider: 'google' | 'kakao' = 'google',
  ): Promise<string> {
    const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS);
    const session = this.authSessionRepository
      ? await this.authSessionRepository.create(
          user._id.toString(),
          provider,
          expiresAt,
        )
      : null;
    const payload = {
      sub: user._id,
      email: user.email,
      ...(session && { sid: session._id.toString() }),
    };
    return this.jwtService.sign(payload);
  }

  async revokeSession(userId: string, sessionId?: string): Promise<void> {
    if (sessionId && this.authSessionRepository)
      await this.authSessionRepository.revoke(sessionId, userId);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userRepository.findById(id);
  }
}
