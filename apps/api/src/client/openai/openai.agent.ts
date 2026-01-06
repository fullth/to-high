import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateOptionsResult } from '../../types/chat';
import { ResponseMode } from '../../types/session';

@Injectable()
export class OpenAIAgent {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateOptions(
    context: string[],
    currentStep: string,
  ): Promise<GenerateOptionsResult> {
    const systemPrompt = `당신은 상담 서비스의 컨텍스트 수집 도우미입니다.
사용자가 힘든 상태이므로 말을 많이 하지 않아도 됩니다.
다음 질문과 선택지 3~4개를 생성하세요.

규칙:
- 선택지는 짧고 명확하게
- 너무 깊이 파고들지 말 것
- 충분히 컨텍스트가 쌓였다면 canProceedToResponse를 true로

JSON 형식으로만 응답:
{
  "question": "질문",
  "options": ["선택지1", "선택지2", "선택지3"],
  "canProceedToResponse": false
}`;

    const userPrompt = `현재 컨텍스트: ${JSON.stringify(context)}
현재 단계: ${currentStep}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async generateResponse(
    context: string[],
    mode: ResponseMode,
    userMessage?: string,
  ): Promise<string> {
    const modePrompts: Record<ResponseMode, string> = {
      comfort: `위로 모드: 해결책 제시 금지. 공감과 위로만.
"그랬구나", "힘들었겠다" 같은 따뜻한 말로 시작.
조언하지 말고 감정을 인정해줘.`,
      organize: `정리 모드: 감정과 사실을 분리해서 정리.
"지금 상황을 정리해보면..." 으로 시작.
판단하지 말고 객관적으로 나열.`,
      validate: `검증 모드: 사용자가 이상한 건지 판단 요청.
중립적 시각에서 상황 분석.
"네 감정은 자연스러운 거야" 또는 "다른 관점도 있을 수 있어" 형태로.`,
      direction: `방향 모드: 아주 작은 행동 1개만 제안.
"오늘 하루는 이것만 해보는 건 어때?" 형태.
거창한 조언 금지.`,
    };

    const systemPrompt = `당신은 따뜻한 상담사입니다.
${modePrompts[mode]}

컨텍스트를 바탕으로 응답하세요.
200자 이내로 짧게.`;

    const userPrompt = `컨텍스트: ${JSON.stringify(context)}
${userMessage ? `사용자 메시지: ${userMessage}` : ''}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    return response.choices[0].message.content || '';
  }

  async summarizeSession(context: string[]): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '세션 컨텍스트를 한 줄로 요약하세요. 개인정보 제외. 예: "이별 후 공허함, 위로 선호"',
        },
        { role: 'user', content: JSON.stringify(context) },
      ],
    });

    return response.choices[0].message.content || '';
  }
}
