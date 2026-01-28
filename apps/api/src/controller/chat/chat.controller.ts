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
import { Category, CounselorType, ResponseMode } from '../../types/session';
import {
  EndSessionSchema,
  SelectOptionSchema,
  SendMessageSchema,
  SetModeSchema,
  StartSessionSchema,
  SummarizeTextSchema,
} from './dto/chat.request';
import type {
  ChatResponse,
  EndSessionResponse,
  SelectOptionResponse,
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
          enum: ['self', 'future', 'work', 'relationship'],
          description: '상담 카테고리',
        },
        initialText: {
          type: 'string',
          description: '직접 입력 텍스트 (카테고리 대신 사용 가능)',
        },
        counselorType: {
          type: 'string',
          enum: ['T', 'F', 'deep'],
          description: '상담가 유형 (T: 냉철한 조언, F: 따스한 공감, deep: 깊은 대화)',
        },
        importSummary: {
          type: 'string',
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
      },
    },
  })
  @UsePipes(new ZodValidationPipe(StartSessionSchema))
  async startSession(
    @Req() req: any,
    @Body() dto: { category?: Category; initialText?: string; counselorType?: CounselorType; importSummary?: string },
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
    };
  }

  @Post('summarize')
  @ApiOperation({
    summary: '텍스트 요약',
    description: '긴 텍스트를 상담 맥락에 맞게 요약합니다. 세션 생성 전 요약 미리보기용.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          description: '요약할 텍스트 (최대 10만자)',
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

  @Post('select')
  @ApiOperation({
    summary: '선택지 선택',
    description: '제시된 선택지 중 하나를 선택하거나 직접 텍스트를 입력합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'selectedOption'],
      properties: {
        sessionId: { type: 'string', description: '세션 ID' },
        selectedOption: {
          type: 'string',
          description: '선택한 옵션 또는 직접 입력 텍스트',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '선택 처리 성공',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        question: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
        canProceedToResponse: { type: 'boolean' },
        responseModes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mode: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
              emoji: { type: 'string' },
            },
          },
        },
        isCrisis: { type: 'boolean' },
        crisisMessage: { type: 'string' },
      },
    },
  })
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
  @ApiOperation({
    summary: '응답 모드 설정',
    description: '상담 응답 모드를 선택하고 AI 응답을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'mode'],
      properties: {
        sessionId: { type: 'string', description: '세션 ID' },
        mode: {
          type: 'string',
          enum: ['comfort', 'organize', 'validate', 'direction', 'listen', 'similar'],
          description: '응답 모드 (comfort: 위로, organize: 정리, validate: 검증, direction: 방향, listen: 경청, similar: 유사사례)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'AI 응답 생성 성공',
    schema: {
      type: 'object',
      properties: {
        response: { type: 'string', description: 'AI 상담사 응답' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SetModeSchema))
  async setMode(
    @Body() dto: { sessionId: string; mode: ResponseMode },
  ): Promise<ChatResponse> {
    return this.chatService.setMode(dto.sessionId, dto.mode);
  }

  @Post('message')
  @ApiOperation({
    summary: '메시지 전송',
    description: '상담 중 사용자 메시지를 전송하고 AI 응답을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string', description: '세션 ID' },
        message: { type: 'string', description: '사용자 메시지 (선택)' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'AI 응답 생성 성공',
    schema: {
      type: 'object',
      properties: {
        response: { type: 'string', description: 'AI 상담사 응답' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SendMessageSchema))
  async sendMessage(
    @Body() dto: { sessionId: string; message?: string },
  ): Promise<ChatResponse> {
    return this.chatService.generateResponse(dto.sessionId, dto.message);
  }

  @Post('end')
  @ApiOperation({
    summary: '상담 세션 종료',
    description: '상담 세션을 종료하고 요약을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string', description: '세션 ID' },
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
    @Body() dto: { sessionId: string },
  ): Promise<EndSessionResponse> {
    return this.chatService.endSession(dto.sessionId);
  }

  @Post('mode/stream')
  @ApiOperation({
    summary: '응답 모드 설정 (스트리밍)',
    description: 'SSE 스트리밍 방식으로 AI 응답을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'mode'],
      properties: {
        sessionId: { type: 'string', description: '세션 ID' },
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
    @Body() dto: { sessionId: string; mode: ResponseMode },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      for await (const chunk of this.chatService.setModeStream(
        dto.sessionId,
        dto.mode,
      )) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
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
  @ApiOperation({
    summary: '메시지 전송 (스트리밍)',
    description: 'SSE 스트리밍 방식으로 AI 응답을 받습니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string', description: '세션 ID' },
        message: { type: 'string', description: '사용자 메시지' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SendMessageSchema))
  async sendMessageStream(
    @Body() dto: { sessionId: string; message?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      for await (const chunk of this.chatService.generateResponseStream(
        dto.sessionId,
        dto.message,
      )) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
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
    @Param('sessionId') sessionId: string,
  ): Promise<SessionDetailResponse> {
    const userId = req.user?.userId || 'anonymous';
    return this.chatService.getSessionDetail(sessionId, userId);
  }

  @Post('sessions/:sessionId/resume')
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
    @Param('sessionId') sessionId: string,
  ): Promise<ResumeSessionResponse> {
    const userId = req.user?.userId || 'anonymous';
    return this.chatService.resumeSession(sessionId, userId);
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
    @Param('sessionId') sessionId: string,
    @Body() dto: { savedName?: string },
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
    @Param('sessionId') sessionId: string,
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
    @Param('sessionId') sessionId: string,
    @Body() body: { alias: string },
  ) {
    const userId = req.user?.userId || 'anonymous';
    const alias = body?.alias || '';
    return this.chatService.updateSessionAlias(sessionId, userId, alias);
  }
}
