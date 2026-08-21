import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatService } from '../../app/chat/chat.service';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import {
  LimitChatGeneration,
  LimitSessionStart,
} from '../../common/chat-rate-limit';
import { Category, CounselorType, ResponseMode } from '../../types/session';
import {
  EndSessionSchema,
  SelectOptionSchema,
  SendMessageSchema,
  SaveSessionSchema,
  SessionIdSchema,
  SetModeSchema,
  StartSessionSchema,
  SummarizeTextSchema,
  UpdateSessionAliasSchema,
} from './dto/chat.request';
import type {
  EndSessionResponse,
  StartSessionResponse,
  SessionListResponse,
  SessionDetailResponse,
  ResumeSessionResponse,
} from './dto/chat.response';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(OptionalJwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('start')
  @LimitSessionStart()
  @ApiOperation({
    summary: '상담 세션 시작',
    description:
      '카테고리 선택 또는 직접 입력으로 새로운 상담 세션을 시작합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['self', 'future', 'work', 'relationship', 'love', 'daily'],
          description: '상담 카테고리',
        },
        initialText: {
          type: 'string',
          maxLength: 500,
          description: '직접 입력 텍스트 (카테고리 대신 사용 가능)',
        },
        counselorType: {
          type: 'string',
          enum: ['T', 'F', 'reaction', 'listening'],
          description: '상담가 유형',
        },
        importSummary: {
          type: 'string',
          maxLength: 2000,
          description: '이미 요약된 불러오기 텍스트 (요약 확인 후 전달)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '세션 생성 성공',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        question: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
        canProceedToResponse: { type: 'boolean' },
        isCrisis: { type: 'boolean' },
        crisisLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
        crisisMessage: { type: 'string' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(StartSessionSchema))
  async startSession(
    @Req() req: any,
    @Body()
    dto: {
      category?: Category;
      initialText?: string;
      counselorType?: CounselorType;
      importSummary?: string;
    },
  ): Promise<StartSessionResponse> {
    const userId = req.user?.userId || 'anonymous';
    const result = await this.chatService.startSession(
      userId,
      dto.category,
      dto.initialText,
      dto.counselorType,
      dto.importSummary,
    );
    return {
      sessionId: result.sessionId.toString(),
      question: result.question,
      options: result.options,
      canProceedToResponse: result.canProceedToResponse,
      counselorType: dto.counselorType,
      isCrisis: result.isCrisis,
      crisisLevel: result.crisisLevel,
      crisisMessage: result.crisisMessage,
    };
  }

  @Post('summarize')
  @LimitChatGeneration()
  @ApiOperation({
    summary: '텍스트 요약',
    description:
      '긴 텍스트를 상담 맥락에 맞게 요약합니다. 세션 생성 전 요약 미리보기용.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          maxLength: 10000,
          description: '요약할 텍스트 (최대 1만자)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '요약 성공',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '요약된 텍스트' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SummarizeTextSchema))
  async summarizeText(
    @Body() dto: { text: string },
  ): Promise<{ summary: string }> {
    const summary = await this.chatService.summarizeText(dto.text);
    return { summary };
  }

  @Post('select/stream')
  @LimitChatGeneration()
  @ApiOperation({
    summary: '선택지 선택 (스트리밍)',
    description: 'SSE 스트리밍 방식으로 선택지 응답을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'selectedOption'],
      additionalProperties: false,
      properties: {
        sessionId: {
          type: 'string',
          pattern: '^[a-fA-F0-9]{24}$',
        },
        selectedOption: { type: 'string', minLength: 1, maxLength: 500 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SelectOptionSchema))
  async selectOptionStream(
    @Req() req: any,
    @Body() dto: { sessionId: string; selectedOption: string },
    @Res() res: Response,
  ) {
    const abortController = new AbortController();
    res.once('close', () => abortController.abort());
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of this.chatService.selectOptionStream(
        dto.sessionId,
        dto.selectedOption,
        abortController.signal,
        req.user?.userId || 'anonymous',
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  @Post('end')
  @LimitChatGeneration()
  @ApiOperation({
    summary: '상담 세션 종료',
    description: '상담 세션을 종료하고 요약을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: {
          type: 'string',
          pattern: '^[a-fA-F0-9]{24}$',
          description: '세션 ID',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '세션 종료 성공',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '상담 요약' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(EndSessionSchema))
  async endSession(
    @Req() req: any,
    @Body() dto: { sessionId: string },
  ): Promise<EndSessionResponse> {
    return this.chatService.endSession(
      dto.sessionId,
      req.user?.userId || 'anonymous',
    );
  }

  @Post('mode/stream')
  @LimitChatGeneration()
  @ApiOperation({
    summary: '응답 모드 설정 (스트리밍)',
    description: 'SSE 스트리밍 방식으로 AI 응답을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'mode'],
      properties: {
        sessionId: {
          type: 'string',
          pattern: '^[a-fA-F0-9]{24}$',
          description: '세션 ID',
        },
        mode: {
          type: 'string',
          enum: [
            'comfort',
            'organize',
            'validate',
            'direction',
            'listen',
            'similar',
          ],
          description: '응답 모드',
        },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SetModeSchema))
  async setModeStream(
    @Req() req: any,
    @Body() dto: { sessionId: string; mode: ResponseMode },
    @Res() res: Response,
  ) {
    const abortController = new AbortController();
    res.once('close', () => abortController.abort());
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of this.chatService.setModeStream(
        dto.sessionId,
        dto.mode,
        abortController.signal,
        req.user?.userId || 'anonymous',
      )) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  @Post('message/stream')
  @LimitChatGeneration()
  @ApiOperation({
    summary: '메시지 전송 (스트리밍)',
    description: 'SSE 스트리밍 방식으로 AI 응답을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'message'],
      additionalProperties: false,
      properties: {
        sessionId: {
          type: 'string',
          pattern: '^[a-fA-F0-9]{24}$',
          description: '세션 ID',
        },
        message: {
          type: 'string',
          minLength: 1,
          maxLength: 500,
          description: '사용자 메시지',
        },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SendMessageSchema))
  async sendMessageStream(
    @Req() req: any,
    @Body() dto: { sessionId: string; message: string },
    @Res() res: Response,
  ) {
    const abortController = new AbortController();
    res.once('close', () => abortController.abort());
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of this.chatService.generateResponseStream(
        dto.sessionId,
        dto.message,
        abortController.signal,
        req.user?.userId || 'anonymous',
      )) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  @Get('sessions')
  @ApiOperation({
    summary: '세션 목록 조회',
    description: '사용자의 상담 세션 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '세션 목록',
    schema: {
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              category: { type: 'string' },
              status: { type: 'string', enum: ['active', 'completed'] },
              summary: { type: 'string' },
              turnCount: { type: 'number' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getSessions(@Req() req: any): Promise<SessionListResponse> {
    const userId = req.user?.userId || 'anonymous';
    const sessions = await this.chatService.getUserSessions(userId);
    return { sessions };
  }

  @Get('sessions/saved')
  @ApiOperation({
    summary: '저장된 상담 목록',
    description: '저장된 상담 목록을 조회합니다. 로그인 필수.',
  })
  @ApiResponse({
    status: 200,
    description: '저장된 상담 목록',
    schema: {
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              category: { type: 'string' },
              savedName: { type: 'string' },
              summary: { type: 'string' },
              savedAt: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getSavedSessions(@Req() req: any) {
    const userId = req.user?.userId || 'anonymous';
    const sessions = await this.chatService.getSavedSessions(userId);
    return { sessions };
  }

  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: '세션 상세 조회',
    description: '특정 상담 세션의 전체 대화 내역을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '세션 상세 정보',
  })
  async getSessionDetail(
    @Req() req: any,
    @Param('sessionId', new ZodValidationPipe(SessionIdSchema))
    sessionId: string,
  ): Promise<SessionDetailResponse> {
    const userId = req.user?.userId || 'anonymous';
    return this.chatService.getSessionDetail(sessionId, userId);
  }

  @Post('sessions/:sessionId/resume')
  @LimitChatGeneration()
  @ApiOperation({
    summary: '세션 재개',
    description: '이전 상담 세션을 이어서 진행합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '세션 재개 성공',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        question: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
        previousContext: { type: 'array', items: { type: 'string' } },
        rollingSummary: { type: 'string' },
      },
    },
  })
  async resumeSession(
    @Req() req: any,
    @Param('sessionId', new ZodValidationPipe(SessionIdSchema))
    sessionId: string,
  ): Promise<ResumeSessionResponse> {
    const userId = req.user?.userId || 'anonymous';
    return this.chatService.resumeSession(sessionId, userId);
  }

  @Post('sessions/:sessionId/claim')
  @ApiOperation({
    summary: '게스트 세션 이어받기',
    description:
      '비로그인으로 시작한 대화를 로그인 후 현재 사용자에게 연결합니다. 로그인 필수.',
  })
  @ApiResponse({
    status: 201,
    description: '이어받기 성공',
    schema: {
      type: 'object',
      properties: { claimed: { type: 'boolean' } },
    },
  })
  async claimSession(
    @Req() req: any,
    @Param('sessionId', new ZodValidationPipe(SessionIdSchema))
    sessionId: string,
  ): Promise<{ claimed: boolean }> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요해요');
    }
    return this.chatService.claimGuestSession(sessionId, userId);
  }

  @Post('sessions/:sessionId/save')
  @ApiOperation({
    summary: '상담 저장',
    description: '상담 내역을 저장합니다. 로그인 필수.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        savedName: { type: 'string', description: '저장 이름 (선택)' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '저장 성공',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        isSaved: { type: 'boolean' },
        savedName: { type: 'string' },
        savedAt: { type: 'string' },
      },
    },
  })
  async saveSession(
    @Req() req: any,
    @Param('sessionId', new ZodValidationPipe(SessionIdSchema))
    sessionId: string,
    @Body(new ZodValidationPipe(SaveSessionSchema))
    dto: { savedName?: string },
  ) {
    const userId = req.user?.userId || 'anonymous';
    return this.chatService.saveSession(sessionId, userId, dto.savedName);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({
    summary: '상담 삭제',
    description: '상담 내역을 삭제합니다. 로그인 필수.',
  })
  @ApiResponse({
    status: 200,
    description: '삭제 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async deleteSession(
    @Req() req: any,
    @Param('sessionId', new ZodValidationPipe(SessionIdSchema))
    sessionId: string,
  ) {
    const userId = req.user?.userId || 'anonymous';
    return this.chatService.deleteSession(sessionId, userId);
  }

  @Patch('sessions/:sessionId/alias')
  @ApiOperation({
    summary: '상담 별칭 수정',
    description: '상담의 별칭(이름)을 수정합니다. 로그인 필수.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['alias'],
      properties: {
        alias: { type: 'string', description: '새 별칭 (50자 이내)' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '수정 성공',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        alias: { type: 'string' },
      },
    },
  })
  async updateSessionAlias(
    @Req() req: any,
    @Param('sessionId', new ZodValidationPipe(SessionIdSchema))
    sessionId: string,
    @Body(new ZodValidationPipe(UpdateSessionAliasSchema))
    body: { alias: string },
  ) {
    const userId = req.user?.userId || 'anonymous';
    const alias = body?.alias || '';
    return this.chatService.updateSessionAlias(sessionId, userId, alias);
  }
}
