import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../../database/user.schema';
import { UserRepository } from '../../persistence/user/user.repository';
import { NotificationService } from '../../common/notification.service';

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

  generateToken(user: UserDocument): string {
    const payload = { sub: user._id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userRepository.findById(id);
  }
}
