import { Module } from '@nestjs/common';
import { AuthModule } from '../app/auth/auth.module';
import { ChatModule } from '../app/chat/chat.module';
import { AdminModule } from '../app/admin/admin.module';
import { AuthController } from './auth/auth.controller';
import { ChatController } from './chat/chat.controller';
import { HealthController } from './health/health.controller';
import { AdminController } from './admin/admin.controller';

@Module({
  imports: [AuthModule, ChatModule, AdminModule],
  controllers: [AuthController, ChatController, HealthController, AdminController],
})
export class ControllerModule {}
