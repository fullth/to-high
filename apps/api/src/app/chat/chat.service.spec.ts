import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { SessionService } from '../session/session.service';
import { SessionRepository } from '../../persistence/session/session.repository';
import { OpenAIAgent } from '../../client/openai/openai.agent';

describe('ChatService', () => {
  let service: ChatService;
  let sessionService: jest.Mocked<SessionService>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let openaiAgent: jest.Mocked<OpenAIAgent>;

  beforeEach(async () => {
    const mockSessionService = {
      create: jest.fn(),
      findById: jest.fn(),
      addContext: jest.fn(),
      setResponseMode: jest.fn(),
      complete: jest.fn(),
    };

    const mockSessionRepository = {
      getRecentSummaries: jest.fn(),
    };

    const mockOpenAIAgent = {
      generateOptions: jest.fn(),
      generateResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: SessionService, useValue: mockSessionService },
        { provide: SessionRepository, useValue: mockSessionRepository },
        { provide: OpenAIAgent, useValue: mockOpenAIAgent },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    sessionService = module.get(SessionService);
    sessionRepository = module.get(SessionRepository);
    openaiAgent = module.get(OpenAIAgent);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startSession', () => {
    it('should create a new session for anonymous user', async () => {
      const mockSession = {
        _id: 'session-123',
        context: ['카테고리: self'],
      };

      sessionService.create.mockResolvedValue(mockSession as any);
      openaiAgent.generateOptions.mockResolvedValue({
        question: '요즘 나 자신에 대해 어떤 생각이 드시나요?',
        options: ['뭔가 부족한 것 같아', '불안하고 걱정이 많아'],
        canProceedToResponse: false,
      });

      const result = await service.startSession('anonymous', 'self');

      expect(result.sessionId).toBe('session-123');
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      expect(sessionRepository.getRecentSummaries).not.toHaveBeenCalled();
    });

    it('should include previous context for logged-in user', async () => {
      const mockSession = {
        _id: 'session-456',
        context: ['카테고리: work'],
      };

      sessionRepository.getRecentSummaries.mockResolvedValue([
        { summary: '이전 상담 요약', category: 'self', createdAt: new Date() },
      ]);
      sessionService.create.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);
      openaiAgent.generateOptions.mockResolvedValue({
        question: '직장에서 요즘 어떤 점이 힘드세요?',
        options: ['업무가 너무 많아', '사람들과의 관계가 힘들어'],
        canProceedToResponse: false,
      });

      const result = await service.startSession('user-123', 'work');

      expect(result.hasHistory).toBe(true);
      expect(sessionRepository.getRecentSummaries).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });
});
