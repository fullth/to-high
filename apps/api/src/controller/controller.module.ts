import { Module } from '@nestjs/common';
import { AuthModule } from '../app/auth/auth.module';
import { ChatModule } from '../app/chat/chat.module';
import { AuthController } from './auth/auth.controller';
import { ChatController } from './chat/chat.controller';

@Module({
  imports: [AuthModule, ChatModule],
  controllers: [AuthController, ChatController],
})
export class ControllerModule {}
