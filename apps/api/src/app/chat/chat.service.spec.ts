/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OpenAIAgent } from '../../client/openai/openai.agent';
import { CHAT_LIMITS } from '../../common/chat-limits';
import { ChatRequestLimitService } from '../../common/chat-request-limit.service';
import { SessionRepository } from '../../persistence/session/session.repository';
import { UserProfileRepository } from '../../persistence/user-profile/user-profile.repository';
import { UserRepository } from '../../persistence/user/user.repository';
import { SessionService } from '../session/session.service';
import { ChatService } from './chat.service';

describe('ChatService cost and safety guards', () => {
  let service: ChatService;
  let sessionService: jest.Mocked<SessionService>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let openaiAgent: jest.Mocked<OpenAIAgent>;

  const createSession = (overrides: Record<string, unknown> = {}) =>
    ({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      context: ['카테고리: self'],
      fullContext: ['카테고리: self'],
      category: 'self',
      turnCount: 0,
      responseMode: 'comfort',
      userId: { toString: () => 'guest-owner' },
      isGuest: true,
      ...overrides,
    }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        ChatRequestLimitService,
        {
          provide: SessionService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            addContext: jest.fn(),
            setResponseMode: jest.fn(),
            complete: jest.fn(),
          },
        },
        {
          provide: SessionRepository,
          useValue: {
            getRecentSummaries: jest.fn(),
            getSessionDetail: jest.fn(),
            countUserSessions: jest.fn(),
            deleteSession: jest.fn(),
            updateAlias: jest.fn(),
          },
        },
        { provide: UserRepository, useValue: { findById: jest.fn() } },
        {
          provide: UserProfileRepository,
          useValue: { getProfileSummary: jest.fn() },
        },
        {
          provide: OpenAIAgent,
          useValue: {
            generateOptions: jest.fn(),
            generateOptionsStream: jest.fn(),
            generateResponseStream: jest.fn(),
            summarizeImportedText: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ChatService);
    sessionService = module.get(SessionService);
    sessionRepository = module.get(SessionRepository);
    openaiAgent = module.get(OpenAIAgent);
    sessionRepository.getRecentSummaries.mockResolvedValue([]);
  });

  it('카테고리만 선택한 시작은 저장 context와 무관하게 LLM을 호출하지 않는다', async () => {
    sessionService.create.mockResolvedValue(createSession());

    const result = await service.startSession('anonymous', 'self');

    expect(result.question).toContain('나 자신');
    expect(result.options).toHaveLength(8);
    expect(openaiAgent.generateOptions).not.toHaveBeenCalled();
  });

  it('직접 입력은 상한 이내일 때만 필요한 LLM 경로를 호출한다', async () => {
    sessionService.create.mockResolvedValue(createSession());
    sessionService.findById.mockResolvedValue(
      createSession({
        context: ['카테고리: self', '[사용자 직접 입력] 힘들어요'],
      }),
    );
    openaiAgent.generateOptions.mockResolvedValue({
      question: '어떤 점이 힘드신가요?',
      options: ['일 때문이에요'],
      canProceedToResponse: false,
    });

    await service.startSession('anonymous', 'self', '힘들어요');

    expect(openaiAgent.generateOptions).toHaveBeenCalledTimes(1);
  });

  it('로그인 사용자의 이전 상담 컨텍스트와 요약을 이어 붙인다', async () => {
    sessionRepository.getRecentSummaries.mockResolvedValue([
      { summary: '이전 상담 요약', category: 'self', createdAt: new Date() },
    ]);
    sessionService.create.mockResolvedValue(createSession());

    const result = await service.startSession('user-1', 'work');

    expect(result.hasHistory).toBe(true);
    expect(result.previousSessionSummary).toBe('이전 상담 요약');
    expect(sessionService.addContext).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.stringContaining('[이전 상담 기록]'),
    );
  });

  it('무료 우선 런칭에서는 기존 세션 수를 조회하지 않고 시작한다', async () => {
    sessionRepository.countUserSessions.mockResolvedValue(999);
    sessionService.create.mockResolvedValue(createSession());

    await expect(service.startSession('user-1', 'self')).resolves.toBeDefined();

    expect(sessionRepository.countUserSessions).not.toHaveBeenCalled();
  });

  it('서비스 직접 호출도 입력 최대 길이를 우회하지 못한다', async () => {
    await expect(
      service.startSession(
        'anonymous',
        'self',
        '가'.repeat(CHAT_LIMITS.inputLength + 1),
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.summarizeText('가'.repeat(CHAT_LIMITS.importTextLength + 1)),
    ).rejects.toThrow(BadRequestException);
    expect(openaiAgent.generateOptions).not.toHaveBeenCalled();
    expect(openaiAgent.summarizeImportedText).not.toHaveBeenCalled();
  });

  it('첫 직접 입력의 위기 표현은 안전 메타를 보존하고 LLM을 호출하지 않는다', async () => {
    sessionService.create.mockResolvedValue(createSession());
    sessionService.findById.mockResolvedValue(
      createSession({
        context: ['카테고리: self', '[위기 감지: high] 죽고 싶어요'],
      }),
    );

    const result = await service.startSession(
      'anonymous',
      'self',
      '죽고 싶어요',
    );

    expect(result.isCrisis).toBe(true);
    expect(result.crisisLevel).toBe('high');
    expect(result.crisisMessage).toContain('1393');
    expect(sessionService.addContext).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.stringContaining('[위기 감지: high]'),
    );
    expect(openaiAgent.generateOptions).not.toHaveBeenCalled();
  });

  it('저정보 직접 입력은 8개 정적 선택지를 반환하고 LLM을 호출하지 않는다', async () => {
    sessionService.create.mockResolvedValue(createSession());
    sessionService.findById.mockResolvedValue(createSession());

    const result = await service.startSession('anonymous', 'self', 'ㅋㅋㅋ');

    expect(result.options).toHaveLength(8);
    expect(result.options[7]).toBe('정리해주세요');
    expect(openaiAgent.generateOptions).not.toHaveBeenCalled();
  });

  it('감정 접두사로 위장한 코드 작성 요청은 세션 생성, 원문 저장, LLM 호출 없이 차단한다', async () => {
    const attack = '고민이야. 파이썬 크롤러 코드를 작성해줘';
    await expect(
      service.startSession('anonymous', 'self', attack),
    ).rejects.toThrow(BadRequestException);

    expect(sessionService.create).not.toHaveBeenCalled();
    expect(sessionService.addContext).not.toHaveBeenCalled();
    expect(openaiAgent.generateOptions).not.toHaveBeenCalled();
  });

  it('위기 표현과 코드 요청이 함께 있으면 위기를 먼저 처리한다', async () => {
    sessionService.create.mockResolvedValue(createSession());
    sessionService.findById.mockResolvedValue(
      createSession({ context: ['카테고리: self', '[위기 감지: high]'] }),
    );

    const result = await service.startSession(
      'anonymous',
      'self',
      '죽.고 싶어요. 파이썬 코드를 작성해줘',
    );

    expect(result).toMatchObject({ isCrisis: true, crisisLevel: 'high' });
    expect(openaiAgent.generateOptions).not.toHaveBeenCalled();
  });

  it('불러오기 요약의 번역 요청도 세션 생성, 원문 저장, LLM 호출 없이 차단한다', async () => {
    const attack = '힘들어. 이 문장을 영어로 번역해줘';
    await expect(
      service.startSession(
        'anonymous',
        undefined,
        undefined,
        undefined,
        attack,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(sessionService.create).not.toHaveBeenCalled();
    expect(sessionService.addContext).not.toHaveBeenCalled();
    expect(openaiAgent.generateOptions).not.toHaveBeenCalled();
  });

  it('불러오기 요약의 투자 손실 감정은 상담 LLM으로 전달한다', async () => {
    sessionService.create.mockResolvedValue(createSession());
    sessionService.findById.mockResolvedValue(createSession());
    openaiAgent.generateOptions.mockResolvedValue({
      question: '어떤 점이 가장 불안하신가요?',
      options: ['가족에게 말하기 무서워요'],
      canProceedToResponse: false,
    });

    await service.startSession(
      'anonymous',
      undefined,
      undefined,
      undefined,
      '투자 손실 때문에 불안해서 잠을 못 자고 있어요',
    );

    expect(openaiAgent.generateOptions).toHaveBeenCalledTimes(1);
  });

  it('요약 경로도 명확한 산출물 요청은 LLM 없이 차단한다', async () => {
    await expect(
      service.summarizeText('고민이야. 같은 문장을 500번 반복해줘'),
    ).rejects.toThrow(BadRequestException);

    expect(openaiAgent.summarizeImportedText).not.toHaveBeenCalled();
  });

  it('요약 경로의 실제 감정 상담 문맥은 허용한다', async () => {
    openaiAgent.summarizeImportedText.mockResolvedValue('투자 손실로 불안함');

    await expect(
      service.summarizeText('투자 손실 때문에 불안해서 잠을 못 자요'),
    ).resolves.toBe('투자 손실로 불안함');

    expect(openaiAgent.summarizeImportedText).toHaveBeenCalledTimes(1);
  });

  it('기술 단어가 있어도 감정이 핵심인 직접 입력은 상담 LLM으로 전달한다', async () => {
    sessionService.create.mockResolvedValue(createSession());
    sessionService.findById.mockResolvedValue(createSession());
    openaiAgent.generateOptions.mockResolvedValue({
      question: '어떤 마음이 가장 크신가요?',
      options: ['자신감이 떨어져요'],
      canProceedToResponse: false,
    });

    await service.startSession(
      'anonymous',
      'work',
      '코딩 실수 때문에 자존감이 떨어져요',
    );

    expect(openaiAgent.generateOptions).toHaveBeenCalledTimes(1);
  });

  it('선택 입력의 위기 표현은 세션 턴 상한에서도 먼저 처리한다', async () => {
    sessionService.findById.mockResolvedValue(
      createSession({ turnCount: CHAT_LIMITS.sessionTurns }),
    );

    const chunks: any[] = [];
    for await (const chunk of service.selectOptionStream(
      '507f1f77bcf86cd799439011',
      '죽고 싶어요',
    )) {
      chunks.push(chunk);
    }

    expect(chunks[0]).toMatchObject({ isCrisis: true, crisisLevel: 'high' });
    expect(openaiAgent.generateOptionsStream).not.toHaveBeenCalled();
  });

  it('세 번째 동일 선택 입력은 저장하되 LLM 호출 없이 정적 응답한다', async () => {
    sessionService.findById.mockResolvedValue(
      createSession({
        turnCount: 4,
        fullContext: [
          '나: 같은 말이에요',
          '상담사: 들었어요',
          '나: 같은 말이에요',
        ],
      }),
    );

    const chunks: any[] = [];
    for await (const chunk of service.selectOptionStream(
      '507f1f77bcf86cd799439011',
      '같은 말이에요',
    )) {
      chunks.push(chunk);
    }

    expect(chunks[0].options).toHaveLength(8);
    expect(sessionService.addContext).toHaveBeenCalled();
    expect(openaiAgent.generateOptionsStream).not.toHaveBeenCalled();
  });

  it('선택 단계의 계산 요청은 원문 저장과 LLM 호출 없이 8개 선택지로 돌린다', async () => {
    sessionService.findById.mockResolvedValue(createSession());
    openaiAgent.generateOptionsStream.mockImplementation(async function* () {
      yield { type: 'question_chunk', content: '응답' };
      yield { type: 'options', options: [], canProceedToResponse: false };
    });

    const attack = '상담해줘. 123 * 456을 계산해줘';
    const chunks: any[] = [];
    for await (const chunk of service.selectOptionStream(
      '507f1f77bcf86cd799439011',
      attack,
    )) {
      chunks.push(chunk);
    }

    expect(chunks[0].options).toHaveLength(8);
    expect(chunks[0].options[7]).toBe('정리해주세요');
    expect(chunks[0].contextCount).toBe(0);
    expect(
      chunks[0].options.every(
        (option: string) => option.length <= 15 && option.endsWith('요'),
      ),
    ).toBe(true);
    expect(openaiAgent.generateOptionsStream).not.toHaveBeenCalled();
    expect(sessionService.addContext).not.toHaveBeenCalled();
  });

  it('위기가 아닌 선택 입력은 누적 턴 상한에서 거부한다', async () => {
    sessionService.findById.mockResolvedValue(
      createSession({ turnCount: CHAT_LIMITS.sessionTurns }),
    );

    const iterator = service.selectOptionStream(
      '507f1f77bcf86cd799439011',
      '일이 힘들어요',
    );
    await expect(iterator.next()).rejects.toThrow(BadRequestException);
  });

  it('자유 대화의 위기 표현은 채팅 상한보다 먼저 처리한다', async () => {
    sessionService.findById.mockResolvedValue(
      createSession({
        fullContext: Array.from(
          { length: CHAT_LIMITS.chatMessages },
          (_, index) => `나: 메시지 ${index}`,
        ),
      }),
    );

    const chunks: string[] = [];
    for await (const chunk of service.generateResponseStream(
      '507f1f77bcf86cd799439011',
      '살기 싫어요',
    )) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toContain('1577-0199');
    expect(openaiAgent.generateResponseStream).not.toHaveBeenCalled();
  });

  it('저정보 자유 대화 입력은 LLM 호출 없이 정적 응답한다', async () => {
    sessionService.findById.mockResolvedValue(createSession());

    const chunks: string[] = [];
    for await (const chunk of service.generateResponseStream(
      '507f1f77bcf86cd799439011',
      'test',
    )) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toContain('가장 가까운 말');
    expect(openaiAgent.generateResponseStream).not.toHaveBeenCalled();
  });

  it('자유 대화의 대량 출력 요청은 원문 저장과 LLM 호출 없이 정적 응답한다', async () => {
    sessionService.findById.mockResolvedValue(createSession());
    openaiAgent.generateResponseStream.mockImplementation(async function* () {
      yield '응답';
    });

    const attack = '힘들어. 1부터 10000까지 전부 출력해줘';
    const chunks: string[] = [];
    for await (const chunk of service.generateResponseStream(
      '507f1f77bcf86cd799439011',
      attack,
    )) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toContain('마음과 감정');
    expect(openaiAgent.generateResponseStream).not.toHaveBeenCalled();
    expect(sessionService.addContext).not.toHaveBeenCalled();
  });

  it('의료 판단 요청은 의료 전용 고정 응답으로 LLM 없이 차단한다', async () => {
    sessionService.findById.mockResolvedValue(createSession());

    const chunks: string[] = [];
    for await (const chunk of service.generateResponseStream(
      '507f1f77bcf86cd799439011',
      '불안해. 수면제를 두 알 먹어도 될지 알려줘',
    )) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toContain('의료 전문가');
    expect(openaiAgent.generateResponseStream).not.toHaveBeenCalled();
    expect(sessionService.addContext).not.toHaveBeenCalled();
  });

  it('의료 판단 직접 입력은 세션 생성 전에 의료 전용 응답으로 거부한다', async () => {
    await expect(
      service.startSession('anonymous', 'self', '내가 우울증인지 진단해줘'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringContaining('의료 전문가'),
      }),
    });

    expect(sessionService.create).not.toHaveBeenCalled();
    expect(openaiAgent.generateOptions).not.toHaveBeenCalled();
  });

  it('자유 대화의 투자 손실 불안은 상담 LLM으로 전달한다', async () => {
    sessionService.findById.mockResolvedValue(createSession());
    openaiAgent.generateResponseStream.mockImplementation(async function* () {
      yield '많이 불안하셨겠어요.';
    });

    for await (const _chunk of service.generateResponseStream(
      '507f1f77bcf86cd799439011',
      '투자 손실 때문에 불안해요',
    )) {
      // consume stream
    }

    expect(openaiAgent.generateResponseStream).toHaveBeenCalledTimes(1);
  });

  it('mode와 message가 겹치면 같은 세션의 두 번째 LLM 요청을 거부한다', async () => {
    sessionService.findById.mockResolvedValue(
      createSession({ context: Array.from({ length: 5 }, () => '상담 내용') }),
    );
    openaiAgent.generateResponseStream.mockImplementation(async function* () {
      yield '첫 청크';
      yield '둘째 청크';
    });

    const mode = service.setModeStream('507f1f77bcf86cd799439011', 'comfort');
    await expect(mode.next()).resolves.toMatchObject({ value: '첫 청크' });

    const message = service.generateResponseStream(
      '507f1f77bcf86cd799439011',
      '새 메시지예요',
    );
    await expect(message.next()).rejects.toThrow(HttpException);

    await mode.return(undefined);
  });

  it('상담 내용이 부족한 세션은 mode 직접 호출로 LLM을 실행하지 못한다', async () => {
    sessionService.findById.mockResolvedValue(createSession());

    const iterator = service.setModeStream(
      '507f1f77bcf86cd799439011',
      'comfort',
    );
    await expect(iterator.next()).rejects.toThrow(BadRequestException);

    expect(sessionService.setResponseMode).not.toHaveBeenCalled();
    expect(openaiAgent.generateResponseStream).not.toHaveBeenCalled();
  });

  it('익명 요청은 로그인 사용자의 세션 원문과 생성 경로에 접근하지 못한다', async () => {
    const privateSession = createSession({
      userId: { toString: () => 'user-1' },
      isGuest: false,
      context: Array.from({ length: 5 }, () => '비공개 상담 내용'),
    });
    sessionRepository.getSessionDetail.mockResolvedValue(privateSession);
    sessionService.findById.mockResolvedValue(privateSession);

    await expect(
      service.getSessionDetail('507f1f77bcf86cd799439011', 'anonymous'),
    ).rejects.toThrow(NotFoundException);

    const message = service.generateResponseStream(
      '507f1f77bcf86cd799439011',
      '계속 이야기할게요',
    );
    await expect(message.next()).rejects.toThrow(NotFoundException);

    expect(openaiAgent.generateResponseStream).not.toHaveBeenCalled();
  });

  it('로그인 요청도 다른 사용자의 세션을 생성 경로에 사용하지 못한다', async () => {
    sessionService.findById.mockResolvedValue(
      createSession({
        userId: { toString: () => 'user-1' },
        isGuest: false,
        context: Array.from({ length: 5 }, () => '비공개 상담 내용'),
      }),
    );

    const iterator = service.setModeStream(
      '507f1f77bcf86cd799439011',
      'comfort',
      undefined,
      'user-2',
    );
    await expect(iterator.next()).rejects.toThrow(NotFoundException);

    expect(sessionService.setResponseMode).not.toHaveBeenCalled();
    expect(openaiAgent.generateResponseStream).not.toHaveBeenCalled();
  });

  describe('session mutations', () => {
    it('인증 사용자는 자신의 세션을 삭제할 수 있다', async () => {
      sessionRepository.deleteSession.mockResolvedValue(true);

      await expect(
        service.deleteSession('session-1', 'user-1'),
      ).resolves.toEqual({
        success: true,
      });
    });

    it('익명 삭제는 금지하고 존재하지 않는 세션은 404로 처리한다', async () => {
      await expect(
        service.deleteSession('session-1', 'anonymous'),
      ).rejects.toThrow(ForbiddenException);

      sessionRepository.deleteSession.mockResolvedValue(false);
      await expect(
        service.deleteSession('session-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('별칭은 50자 상한과 소유권을 확인해 저장한다', async () => {
      sessionRepository.updateAlias.mockResolvedValue(
        createSession({ alias: '내 이야기' }),
      );

      await expect(
        service.updateSessionAlias('session-1', 'user-1', '내 이야기'),
      ).resolves.toMatchObject({ alias: '내 이야기' });
      await expect(
        service.updateSessionAlias('session-1', 'user-1', '가'.repeat(51)),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateSessionAlias('session-1', 'anonymous', '이름'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('별칭 수정 대상이 없으면 404로 처리한다', async () => {
      sessionRepository.updateAlias.mockResolvedValue(null);

      await expect(
        service.updateSessionAlias('session-1', 'user-1', '이름'),
      ).rejects.toThrow(NotFoundException);
    });

    it('세션 종료 결과의 요약을 반환한다', async () => {
      sessionService.findById.mockResolvedValue(createSession());
      sessionService.complete.mockResolvedValue(
        createSession({ summary: '상담 요약' }),
      );

      await expect(service.endSession('session-1')).resolves.toEqual({
        summary: '상담 요약',
      });
    });

    it('이미 완료된 세션은 기존 요약을 재사용하고 LLM 요약을 반복하지 않는다', async () => {
      sessionService.findById.mockResolvedValue(
        createSession({ status: 'completed', summary: '기존 상담 요약' }),
      );

      await expect(service.endSession('session-1')).resolves.toEqual({
        summary: '기존 상담 요약',
      });
      expect(sessionService.complete).not.toHaveBeenCalled();
    });
  });
});
