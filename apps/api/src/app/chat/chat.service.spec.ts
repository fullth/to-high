import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SessionService } from '../session/session.service';
import { SessionRepository } from '../../persistence/session/session.repository';
import { UserRepository } from '../../persistence/user/user.repository';
import { UserProfileRepository } from '../../persistence/user-profile/user-profile.repository';
import { OpenAIAgent } from '../../client/openai/openai.agent';

/**
 * ChatService 단위 테스트
 * 
 * 테스트 전략:
 * 1. 의존성 격리: 모든 외부 의존성(Repository, OpenAI)을 Mock으로 대체
 * 2. 비즈니스 로직 검증: 세션 제한, 위기 감지, 입력 검증 등 핵심 로직 테스트
 * 3. AAA 패턴: Arrange-Act-Assert 구조로 가독성 확보
 * 
 * 고민한 점:
 * - OpenAI API 호출을 어떻게 테스트할 것인가? → Mock으로 응답 시뮬레이션
 * - 복잡한 비즈니스 로직(세션 제한, 레거시 사용자 등)을 어떻게 검증? → 각 케이스별 독립 테스트
 * - 테스트 간 상태 공유 방지? → afterEach에서 jest.clearAllMocks()
 */
describe('ChatService', () => {
  let service: ChatService;
  let sessionService: jest.Mocked<SessionService>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let openaiAgent: jest.Mocked<OpenAIAgent>;

  beforeEach(async () => {
    /**
     * Mock 객체 생성
     * 
     * 고민: 어떤 메서드를 모킹할 것인가?
     * - 실제 ChatService가 호출하는 메서드만 선택적으로 모킹
     * - 불필요한 모킹은 테스트를 복잡하게 만들 수 있음
     */
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
      deleteSession: jest.fn(),
      updateAlias: jest.fn(),
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

    /**
     * NestJS Testing Module 생성
     * 
     * 고민: 실제 모듈을 import할 것인가, 직접 providers를 정의할 것인가?
     * → 단위 테스트이므로 직접 정의하여 의존성 최소화
     */
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

  /**
   * 테스트 간 격리를 위한 Mock 초기화
   * 
   * 고민: beforeEach vs afterEach?
   * → afterEach 선택: 테스트 실행 후 정리하여 다음 테스트에 영향 없도록
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startSession', () => {
    /**
     * 테스트 케이스 1: 익명 사용자 세션 생성
     * 
     * 검증 포인트:
     * - 세션이 정상적으로 생성되는가?
     * - 익명 사용자는 이전 컨텍스트를 조회하지 않는가?
     * - UserRepository를 호출하지 않는가?
     * 
     * 고민: 익명 사용자와 로그인 사용자를 어떻게 구분?
     * → userId === 'anonymous' 조건으로 분기 처리
     */
    it('should create a new session for anonymous user', async () => {
      // Arrange: 테스트 데이터 준비
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

      // Act: 테스트 대상 메서드 실행
      const result = await service.startSession('anonymous', 'self');

      // Assert: 결과 검증
      expect(result.sessionId).toBe('session-123');
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      // 익명 사용자는 이전 컨텍스트를 조회하지 않음
      expect(sessionRepository.getRecentSummaries).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    /**
     * 테스트 케이스 2: 로그인 사용자의 이전 컨텍스트 포함
     * 
     * 검증 포인트:
     * - 이전 상담 기록을 조회하는가?
     * - 이전 기록이 있으면 hasHistory가 true인가?
     * - 세션 제한을 체크하는가?
     * 
     * 고민: 이전 컨텍스트를 어떻게 테스트?
     * → getRecentSummaries를 모킹하여 이전 세션이 있는 상황 시뮬레이션
     */
    it('should include previous context for logged-in user', async () => {
      // Arrange
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

      // Act
      const result = await service.startSession('user-123', 'work');

      // Assert
      expect(result.hasHistory).toBe(true);
      expect(result.previousSessionSummary).toBe('이전 상담 요약');
      expect(sessionRepository.getRecentSummaries).toHaveBeenCalledWith('user-123');
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    /**
     * 테스트 케이스 3: 무료 사용자 세션 제한
     * 
     * 검증 포인트:
     * - 무료 사용자가 3개 세션 한도에 도달하면 ForbiddenException을 던지는가?
     * - 세션 생성을 시도하지 않는가?
     * 
     * 고민: 비즈니스 로직의 핵심 - 어떻게 수익화할 것인가?
     * → 무료 사용자 제한으로 구독 유도
     * 
     * 엣지 케이스:
     * - 정확히 3개일 때는? (>= 조건이므로 제한됨)
     * - 레거시 사용자는? (별도 테스트로 분리)
     */
    it('should enforce session limit for free users', async () => {
      // Arrange
      const mockUser = {
        _id: 'user-123',
        isGrandfathered: false,
        isSubscribed: false,
      };

      userRepository.findById.mockResolvedValue(mockUser as any);
      sessionRepository.countUserSessions.mockResolvedValue(3); // 이미 3개 (한도 도달)

      // Act & Assert: 예외 발생 검증
      await expect(
        service.startSession('user-123', 'self')
      ).rejects.toThrow(ForbiddenException);

      // 세션 생성을 시도하지 않음
      expect(sessionService.create).not.toHaveBeenCalled();
    });

    /**
     * 테스트 케이스 4: 레거시 사용자 무제한 허용
     * 
     * 검증 포인트:
     * - isGrandfathered가 true이면 세션 제한을 체크하지 않는가?
     * - 100개 세션이 있어도 생성 가능한가?
     * 
     * 고민: 레거시 사용자를 어떻게 처리?
     * → 초기 사용자에 대한 보상으로 무제한 제공
     * → 비즈니스 로직에서 중요한 예외 케이스
     */
    it('should allow unlimited sessions for grandfathered users', async () => {
      // Arrange
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

      // Act
      const result = await service.startSession('user-123', 'self');

      // Assert
      expect(result.sessionId).toBe('session-789');
      // 레거시 사용자는 세션 수를 체크하지 않음
      expect(sessionRepository.countUserSessions).not.toHaveBeenCalled();
    });

    /**
     * 테스트 케이스 5: 불러오기 텍스트 요약
     * 
     * 검증 포인트:
     * - 긴 텍스트(500자 초과)는 자동으로 요약되는가?
     * - OpenAI summarizeImportedText가 호출되는가?
     * - 요약된 내용이 컨텍스트에 추가되는가?
     * 
     * 고민: 긴 텍스트를 어떻게 처리?
     * → 토큰 비용 절감을 위해 요약 후 저장
     * → 사용자 경험: 이전 상담 내용을 불러올 수 있음
     */
    it('should summarize import text when length exceeds limit', async () => {
      // Arrange
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

      // Act
      const result = await service.startSession('anonymous', 'direct', longText);

      // Assert
      expect(openaiAgent.summarizeImportedText).toHaveBeenCalledWith(longText);
      expect(sessionService.addContext).toHaveBeenCalledWith(
        'session-import',
        expect.stringContaining('요약된 내용')
      );
    });
  });

  describe('selectOption', () => {
    /**
     * 테스트 케이스 6: 위기 감지 및 대응
     * 
     * 검증 포인트:
     * - "죽고 싶어요" 같은 위기 키워드를 감지하는가?
     * - 위기 레벨(high)을 올바르게 판단하는가?
     * - 전문 기관(1393) 정보를 제공하는가?
     * 
     * 고민: AI 상담의 한계와 책임
     * → 위기 상황에서는 전문가 연결이 필수
     * → 법적/윤리적 책임 회피를 위한 안전장치
     * 
     * 엣지 케이스:
     * - 간접적 표현은? ("살기 싫어" → medium)
     * - 오탐지는? (crisis-detector 테스트에서 커버)
     */
    it('should detect crisis and return crisis response', async () => {
      // Arrange
      const mockSession = {
        _id: 'session-crisis',
        context: ['나: 힘들어요'],
        category: 'self',
      };

      sessionService.findById.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);

      // Act
      const result = await service.selectOption('session-crisis', '죽고 싶어요');

      // Assert
      expect(result.isCrisis).toBe(true);
      expect(result.crisisLevel).toBe('high');
      expect(result.crisisMessage).toContain('1393'); // 자살예방상담전화
      expect(sessionService.addContext).toHaveBeenCalledWith(
        'session-crisis',
        expect.stringContaining('[위기 감지: high]')
      );
    });

    /**
     * 테스트 케이스 7: 공감 코멘트 및 피드백 생성
     * 
     * 검증 포인트:
     * - 사용자 선택에 대한 공감 코멘트가 생성되는가?
     * - 상담가 유형(F)에 따른 피드백이 생성되는가?
     * - OpenAI Agent의 메서드들이 올바르게 호출되는가?
     * 
     * 고민: 공감과 피드백의 차이
     * → 공감: 짧은 감정 인정 ("많이 힘드셨겠어요")
     * → 피드백: 상담가 관점의 해석/조언
     * → 두 가지를 분리하여 단계적 응답 제공
     */
    it('should generate empathy comment and feedback', async () => {
      // Arrange
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

      // Act
      const result = await service.selectOption('session-normal', '일도 사람도 다 힘들어요');

      // Assert
      expect(result.empathyComment).toBe('많이 힘드셨겠어요.');
      expect(result.counselorFeedback).toBe('그런 상황에서 그렇게 느끼는 건 자연스러운 거예요.');
      expect(openaiAgent.generateEmpathyComment).toHaveBeenCalled();
      expect(openaiAgent.generateCounselorFeedback).toHaveBeenCalled();
    });

    /**
     * 테스트 케이스 8: 입력 길이 검증
     * 
     * 검증 포인트:
     * - 500자 초과 입력을 거부하는가?
     * - BadRequestException을 던지는가?
     * 
     * 고민: 왜 500자 제한?
     * → 토큰 비용 관리
     * → 사용자가 너무 긴 글을 쓰면 대화가 아닌 일기가 됨
     * → UX: 선택지 기반 대화 유도
     */
    it('should validate input length', async () => {
      // Arrange
      const mockSession = {
        _id: 'session-test',
        context: [],
      };

      sessionService.findById.mockResolvedValue(mockSession as any);

      const longInput = 'a'.repeat(501);

      // Act & Assert
      await expect(
        service.selectOption('session-test', longInput)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateResponse', () => {
    /**
     * 테스트 케이스 9: 응답 모드별 생성
     * 
     * 검증 포인트:
     * - 지정된 응답 모드(empathy)로 응답을 생성하는가?
     * - 상담가 유형(F)이 OpenAI에 전달되는가?
     * - 사용자 메시지가 컨텍스트에 추가되는가?
     * 
     * 고민: 응답 모드의 필요성
     * → 사용자가 원하는 상담 스타일 선택 가능
     * → empathy(공감), advice(조언), analysis(분석) 등
     */
    it('should generate response with specified mode', async () => {
      // Arrange
      const mockSession = {
        _id: 'session-response',
        context: ['나: 힘들어요', '상담사: 어떤 점이 힘드신가요?'],
        responseMode: 'empathy',
        counselorType: 'F',
      };

      sessionService.findById.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);
      openaiAgent.generateResponse.mockResolvedValue('많이 힘드셨겠어요. 그 마음 충분히 이해해요.');

      // Act
      const result = await service.generateResponse('session-response', '정말 힘들어요');

      // Assert
      expect(result.response).toBe('많이 힘드셨겠어요. 그 마음 충분히 이해해요.');
      expect(openaiAgent.generateResponse).toHaveBeenCalledWith(
        mockSession.context,
        'empathy',
        '정말 힘들어요',
        'F'
      );
    });

    /**
     * 테스트 케이스 10: 응답 생성 중 위기 감지
     * 
     * 검증 포인트:
     * - 응답 단계에서도 위기를 감지하는가?
     * - 즉시 위기 대응 메시지를 반환하는가?
     * 
     * 고민: 왜 selectOption과 generateResponse 둘 다에서 위기 감지?
     * → 사용자가 언제든 위기 상황을 표현할 수 있음
     * → 모든 입력 지점에서 안전장치 필요
     */
    it('should detect crisis in user message', async () => {
      // Arrange
      const mockSession = {
        _id: 'session-crisis-response',
        context: ['나: 힘들어요'],
        responseMode: 'empathy',
      };

      sessionService.findById.mockResolvedValue(mockSession as any);
      sessionService.addContext.mockResolvedValue(mockSession as any);

      // Act
      const result = await service.generateResponse('session-crisis-response', '죽고 싶어요');

      // Assert
      expect(result.isCrisis).toBe(true);
      expect(result.crisisLevel).toBe('high');
      expect(result.response).toContain('1393');
    });
  });

  describe('deleteSession', () => {
    it('should delete session for authenticated user', async () => {
      // Arrange
      sessionRepository.deleteSession.mockResolvedValue(true);

      // Act
      const result = await service.deleteSession('session-123', 'user-123');

      // Assert
      expect(result).toEqual({ success: true });
      expect(sessionRepository.deleteSession).toHaveBeenCalledWith('session-123', 'user-123');
    });

    it('should throw ForbiddenException for anonymous user', async () => {
      // Act & Assert
      await expect(
        service.deleteSession('session-123', 'anonymous')
      ).rejects.toThrow(ForbiddenException);

      expect(sessionRepository.deleteSession).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found or no permission', async () => {
      // Arrange
      sessionRepository.deleteSession.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.deleteSession('session-999', 'user-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSessionAlias', () => {
    it('should update alias for authenticated user', async () => {
      // Arrange
      const mockSession = {
        _id: 'session-123',
        alias: '나의 고민 상담',
      };
      sessionRepository.updateAlias.mockResolvedValue(mockSession as any);

      // Act
      const result = await service.updateSessionAlias('session-123', 'user-123', '나의 고민 상담');

      // Assert
      expect(result).toEqual({ sessionId: 'session-123', alias: '나의 고민 상담' });
      expect(sessionRepository.updateAlias).toHaveBeenCalledWith('session-123', 'user-123', '나의 고민 상담');
    });

    it('should throw ForbiddenException for anonymous user', async () => {
      // Act & Assert
      await expect(
        service.updateSessionAlias('session-123', 'anonymous', '별칭')
      ).rejects.toThrow(ForbiddenException);

      expect(sessionRepository.updateAlias).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when alias exceeds 50 characters', async () => {
      // Arrange
      const longAlias = 'a'.repeat(51);

      // Act & Assert
      await expect(
        service.updateSessionAlias('session-123', 'user-123', longAlias)
      ).rejects.toThrow(BadRequestException);

      expect(sessionRepository.updateAlias).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found or no permission', async () => {
      // Arrange
      sessionRepository.updateAlias.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateSessionAlias('session-999', 'user-123', '별칭')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('endSession', () => {
    /**
     * 테스트 케이스 11: 세션 종료 및 요약
     * 
     * 검증 포인트:
     * - 세션이 정상적으로 종료되는가?
     * - 요약이 반환되는가?
     * 
     * 고민: 세션 요약의 가치
     * → 사용자가 상담 내용을 나중에 다시 볼 수 있음
     * → 다음 상담 시 이전 컨텍스트로 활용
     * → 사용자 프로필 구축 (감정 패턴, 주요 고민 등)
     */
    it('should complete session and return summary', async () => {
      // Arrange
      const mockSession = {
        _id: 'session-end',
        summary: '오늘 상담에서는 직장 스트레스에 대해 이야기했습니다.',
      };

      sessionService.complete.mockResolvedValue(mockSession as any);

      // Act
      const result = await service.endSession('session-end');

      // Assert
      expect(result.summary).toBe('오늘 상담에서는 직장 스트레스에 대해 이야기했습니다.');
      expect(sessionService.complete).toHaveBeenCalledWith('session-end');
    });
  });
});
