import { Body, Controller, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { ChatService } from '../../app/chat/chat.service';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { Category, ResponseMode } from '../../types/session';
import {
  EndSessionSchema,
  SelectOptionSchema,
  SendMessageSchema,
  SetModeSchema,
  StartSessionSchema,
} from './dto/chat.request';
import type {
  ChatResponse,
  EndSessionResponse,
  SelectOptionResponse,
  StartSessionResponse,
} from './dto/chat.response';

@Controller('chat')
@UseGuards(OptionalJwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('start')
  @UsePipes(new ZodValidationPipe(StartSessionSchema))
  async startSession(
    @Req() req: any,
    @Body() dto: { category: Category },
  ): Promise<StartSessionResponse> {
    const userId = req.user?.userId || 'anonymous';
    const result = await this.chatService.startSession(
      userId,
      dto.category,
    );
    return {
      sessionId: result.sessionId.toString(),
      question: result.question,
      options: result.options,
      canProceedToResponse: result.canProceedToResponse,
    };
  }

  @Post('select')
  @UsePipes(new ZodValidationPipe(SelectOptionSchema))
  async selectOption(
    @Body() dto: { sessionId: string; selectedOption: string },
  ): Promise<SelectOptionResponse> {
    const result = await this.chatService.selectOption(
      dto.sessionId,
      dto.selectedOption,
    );
    return {
      sessionId: result.sessionId.toString(),
      question: (result as any).question,
      options: (result as any).options,
      canProceedToResponse: result.canProceedToResponse,
      responseModes: result.responseModes,
    };
  }

  @Post('mode')
  @UsePipes(new ZodValidationPipe(SetModeSchema))
  async setMode(
    @Body() dto: { sessionId: string; mode: ResponseMode },
  ): Promise<ChatResponse> {
    return this.chatService.setMode(dto.sessionId, dto.mode);
  }

  @Post('message')
  @UsePipes(new ZodValidationPipe(SendMessageSchema))
  async sendMessage(
    @Body() dto: { sessionId: string; message?: string },
  ): Promise<ChatResponse> {
    return this.chatService.generateResponse(dto.sessionId, dto.message);
  }

  @Post('end')
  @UsePipes(new ZodValidationPipe(EndSessionSchema))
  async endSession(
    @Body() dto: { sessionId: string },
  ): Promise<EndSessionResponse> {
    return this.chatService.endSession(dto.sessionId);
  }
}
