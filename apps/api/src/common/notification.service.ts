import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private adminEmail: string;

  constructor(private configService: ConfigService) {
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailAppPassword =
      this.configService.get<string>('GMAIL_APP_PASSWORD');
    this.adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') || gmailUser || '';

    if (gmailUser && gmailAppPassword) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });
    }
  }

  async notifyNewUser(
    user: {
      email: string;
      name?: string;
      picture?: string;
    },
    totalUsers: number,
  ) {
    if (!this.transporter || !this.adminEmail) {
      console.log('[Notification] 이메일 설정이 없어 알림을 건너뜁니다.');
      return;
    }

    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('GMAIL_USER'),
        to: this.adminEmail,
        subject: `[To High] 새 사용자 가입: ${user.name || user.email}`,
        html: `
          <div style="font-family: 'Apple SD Gothic Neo', sans-serif; padding: 20px; max-width: 400px;">
            <h2 style="color: #6366F1; margin-bottom: 20px;">🎉 새 사용자 가입!</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">이름</td>
                <td style="padding: 8px 0; font-weight: bold;">${user.name || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">이메일</td>
                <td style="padding: 8px 0; font-weight: bold;">${user.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">가입 시간</td>
                <td style="padding: 8px 0;">${now}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">총 사용자</td>
                <td style="padding: 8px 0; font-weight: bold; color: #6366F1;">${totalUsers}명</td>
              </tr>
            </table>
            ${user.picture ? `<img src="${user.picture}" style="width: 60px; height: 60px; border-radius: 50%; margin-top: 16px;" />` : ''}
          </div>
        `,
      });
      console.log('[Notification] 새 사용자 알림 전송 완료');
    } catch {
      console.error('[Notification] 이메일 전송 실패');
    }
  }
}
