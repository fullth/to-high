import {
  Body,
  Controller,
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
} from './dto/chat.request';
import type {
  ChatResponse,
  EndSessionResponse,
  SelectOptionResponse,
  StartSessionResponse,
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
    @Body() dto: { category?: Category; initialText?: string; counselorType?: CounselorType },
  ): Promise<StartSessionResponse> {
    const userId = req.user?.userId || 'anonymous';
    const result = await this.chatService.startSession(
      userId,
      dto.category,
      dto.initialText,
      dto.counselorType,
    );
    return {
      sessionId: result.sessionId.toString(),
      question: result.question,
      options: result.options,
      canProceedToResponse: result.canProceedToResponse,
      counselorType: dto.counselorType,
    };
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
}
