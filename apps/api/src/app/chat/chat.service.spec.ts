import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SessionService } from '../session/session.service';
import { SessionRepository } from '../../persistence/session/session.repository';
import { UserRepository } from '../../persistence/user/user.repository';
import { UserProfileRepository } from '../../persistence/user-profile/user-profile.repository';
import { OpenAIAgent } from '../../client/openai/openai.agent';

describe('ChatService', () => {
  let service: ChatService;
  let sessionService: jest.Mocked<SessionService>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
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
      countUserSessions: jest.fn(),
      getUserSessions: jest.fn(),
      findById: jest.fn(),
    };

    const mockUserRepository = {
      findById: jest.fn(),
    };

    const mockUserProfileRepository = {
      getProfileSummary: jest.fn(),
    };

    const mockOpenAIAgent = {
      generateOptions: jest.fn(),
      generateResponse: jest.fn(),
      generateEmpathyComment: jest.fn(),
      generateCounselorFeedback: jest.fn(),
      summarizeImportedText: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: SessionService, useValue: mockSessionService },
        { provide: SessionRepository, useValue: mockSessionRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: UserProfileRepository, useValue: mockUserProfileRepository },
        { provide: OpenAIAgent, useValue: mockOpenAIAgent },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    sessionService = module.get(SessionService);
    sessionRepository = module.get(SessionRepository);
    userRepository = module.get(UserRepository);
    userProfileRepository = module.get(UserProfileRepository);
    openaiAgent = module.get(OpenAIAgent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startSession', () => {
    it('should create a new session for anonymous user', async () => {
      const mockSession = {
        _id: 'session-123',
        context: [],
      };

      sessionService.create.mockResolvedValue(mockSession as any);
      sessionService.findById.mockResolvedValue(mockSession as any);
      openaiAgent.generateOptions.mockResolvedValue({
        question: '요즘 나 자신에 대해 어떤 생각이 드시나요?',
        options: ['뭔가 부족한 것 같아', '불안하고 걱정이 많아'],
        canProceedToResponse: false,
        canRequestFeedback: true,
      });

      const result = await service.startSession('anonymous', 'self');

      expect(result.sessionId).toBe('session-123');
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      expect(sessionRepository.getRecentSummaries).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('should include previous context for logged-in user', async () => {
      const mockSession = {
        _id: 'session-456',
        context: [],
      };

      const mockUser = {
        _id: 'user-123',
        isGrandfathered: false,
        isSubscribed: false,
      };

      sessionRepository.getRecentSummaries.mockResolvedValue([
        { summary: '이전 상담 요약', category: 'self', createdAt: new Date() },
      ]);
      sessionRepository.countUserSessions.mockResolvedValue(1);
      userRepository.findById.mockResolvedValue(mockUser as any);
      sessionService.create.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);
      sessionService.findById.mockResolvedValue(mockSession as any);
      openaiAgent.generateOptions.mockResolvedValue({
        question: '직장에서 요즘 어떤 점이 힘드세요?',
        options: ['업무가 너무 많아', '사람들과의 관계가 힘들어'],
        canProceedToResponse: false,
        canRequestFeedback: true,
      });

      const result = await service.startSession('user-123', 'work');

      expect(result.hasHistory).toBe(true);
      expect(result.previousSessionSummary).toBe('이전 상담 요약');
      expect(sessionRepository.getRecentSummaries).toHaveBeenCalledWith('user-123');
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should enforce session limit for free users', async () => {
      const mockUser = {
        _id: 'user-123',
        isGrandfathered: false,
        isSubscribed: false,
      };

      userRepository.findById.mockResolvedValue(mockUser as any);
      sessionRepository.countUserSessions.mockResolvedValue(3); // 이미 3개 (한도 도달)

      await expect(
        service.startSession('user-123', 'self')
      ).rejects.toThrow(ForbiddenException);

      expect(sessionService.create).not.toHaveBeenCalled();
    });

    it('should allow unlimited sessions for grandfathered users', async () => {
      const mockUser = {
        _id: 'user-123',
        isGrandfathered: true,
      };

      const mockSession = {
        _id: 'session-789',
        context: [],
      };

      userRepository.findById.mockResolvedValue(mockUser as any);
      sessionRepository.getRecentSummaries.mockResolvedValue([]); // 이전 세션 없음
      sessionRepository.countUserSessions.mockResolvedValue(100); // 많은 세션
      sessionService.create.mockResolvedValue(mockSession as any);
      sessionService.findById.mockResolvedValue(mockSession as any);
      openaiAgent.generateOptions.mockResolvedValue({
        question: '무엇을 도와드릴까요?',
        options: ['고민이 있어요', '그냥 이야기하고 싶어요'],
        canProceedToResponse: false,
        canRequestFeedback: true,
      });

      const result = await service.startSession('user-123', 'self');

      expect(result.sessionId).toBe('session-789');
      expect(sessionRepository.countUserSessions).not.toHaveBeenCalled(); // 레거시 사용자는 체크 안 함
    });


    it('should summarize import text when length exceeds limit', async () => {
      const longText = 'a'.repeat(1000); // 긴 텍스트
      const mockSession = {
        _id: 'session-import',
        context: [],
      };

      sessionService.create.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);
      sessionService.findById.mockResolvedValue({
        ...mockSession,
        context: ['[이전 상담 불러오기 - 요약]\n요약된 내용'],
      } as any);
      openaiAgent.summarizeImportedText.mockResolvedValue('요약된 내용');
      openaiAgent.generateOptions.mockResolvedValue({
        question: '이전 상담 내용을 확인했어요. 어떤 점이 궁금하신가요?',
        options: ['계속 이야기하고 싶어요', '다른 주제로 바꿀래요'],
        canProceedToResponse: false,
        canRequestFeedback: true,
      });

      const result = await service.startSession('anonymous', 'direct', longText);

      expect(openaiAgent.summarizeImportedText).toHaveBeenCalledWith(longText);
      expect(sessionService.addContext).toHaveBeenCalledWith(
        'session-import',
        expect.stringContaining('요약된 내용')
      );
    });
  });

  describe('selectOption', () => {
    it('should detect crisis and return crisis response', async () => {
      const mockSession = {
        _id: 'session-crisis',
        context: ['나: 힘들어요'],
        category: 'self',
      };

      sessionService.findById.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);

      const result = await service.selectOption('session-crisis', '죽고 싶어요');

      expect(result.isCrisis).toBe(true);
      expect(result.crisisLevel).toBe('high');
      expect(result.crisisMessage).toContain('1393');
      expect(sessionService.addContext).toHaveBeenCalledWith(
        'session-crisis',
        expect.stringContaining('[위기 감지: high]')
      );
    });

    it('should generate empathy comment and feedback', async () => {
      const mockSession = {
        _id: 'session-normal',
        context: ['나: 요즘 힘들어요'],
        category: 'self',
        counselorType: 'F',
      };

      sessionService.findById.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);
      openaiAgent.generateEmpathyComment.mockResolvedValue('많이 힘드셨겠어요.');
      openaiAgent.generateCounselorFeedback.mockResolvedValue('그런 상황에서 그렇게 느끼는 건 자연스러운 거예요.');
      openaiAgent.generateOptions.mockResolvedValue({
        question: '어떤 점이 가장 힘드신가요?',
        options: ['일이 힘들어요', '사람들이 힘들어요'],
        canProceedToResponse: false,
        canRequestFeedback: true,
      });

      const result = await service.selectOption('session-normal', '일도 사람도 다 힘들어요');

      expect(result.empathyComment).toBe('많이 힘드셨겠어요.');
      expect(result.counselorFeedback).toBe('그런 상황에서 그렇게 느끼는 건 자연스러운 거예요.');
      expect(openaiAgent.generateEmpathyComment).toHaveBeenCalled();
      expect(openaiAgent.generateCounselorFeedback).toHaveBeenCalled();
    });

    it('should validate input length', async () => {
      const mockSession = {
        _id: 'session-test',
        context: [],
      };

      sessionService.findById.mockResolvedValue(mockSession as any);

      const longInput = 'a'.repeat(501);

      await expect(
        service.selectOption('session-test', longInput)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateResponse', () => {
    it('should generate response with specified mode', async () => {
      const mockSession = {
        _id: 'session-response',
        context: ['나: 힘들어요', '상담사: 어떤 점이 힘드신가요?'],
        responseMode: 'empathy',
        counselorType: 'F',
      };

      sessionService.findById.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);
      openaiAgent.generateResponse.mockResolvedValue('많이 힘드셨겠어요. 그 마음 충분히 이해해요.');

      const result = await service.generateResponse('session-response', '정말 힘들어요');

      expect(result.response).toBe('많이 힘드셨겠어요. 그 마음 충분히 이해해요.');
      expect(openaiAgent.generateResponse).toHaveBeenCalledWith(
        mockSession.context,
        'empathy',
        '정말 힘들어요',
        'F'
      );
    });

    it('should detect crisis in user message', async () => {
      const mockSession = {
        _id: 'session-crisis-response',
        context: ['나: 힘들어요'],
        responseMode: 'empathy',
      };

      sessionService.findById.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);

      const result = await service.generateResponse('session-crisis-response', '죽고 싶어요');

      expect(result.isCrisis).toBe(true);
      expect(result.crisisLevel).toBe('high');
      expect(result.response).toContain('1393');
    });
  });

  describe('endSession', () => {
    it('should complete session and return summary', async () => {
      const mockSession = {
        _id: 'session-end',
        summary: '오늘 상담에서는 직장 스트레스에 대해 이야기했습니다.',
      };

      sessionService.complete.mockResolvedValue(mockSession as any);

      const result = await service.endSession('session-end');

      expect(result.summary).toBe('오늘 상담에서는 직장 스트레스에 대해 이야기했습니다.');
      expect(sessionService.complete).toHaveBeenCalledWith('session-end');
    });
  });
});
