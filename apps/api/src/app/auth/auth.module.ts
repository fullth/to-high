import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PersistenceModule } from '../../persistence/persistence.module';
import { NotificationService } from '../../common/notification.service';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategy/google.strategy';
import { KakaoStrategy } from './strategy/kakao.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';

@Module({
  imports: [
    PersistenceModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, GoogleStrategy, KakaoStrategy, JwtStrategy, NotificationService],
  exports: [AuthService],
})
export class AuthModule {}
