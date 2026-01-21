import { ResponseMode } from './session';

export interface GenerateOptionsResult {
  question: string;
  options: string[];
  canProceedToResponse: boolean;
  canRequestFeedback?: boolean; // 컨텍스트가 충분히 쌓였을 때 피드백 요청 가능
}

export interface ResponseModeOption {
  mode: ResponseMode;
  label: string;
  description: string;
  emoji: string;
}

export const RESPONSE_MODE_OPTIONS: ResponseModeOption[] = [
  {
    mode: 'comfort',
    label: '그냥 위로해줘',
    description: '해결책 없이 공감과 위로만 받고 싶어요',
    emoji: '🤗',
  },
  {
    mode: 'listen',
    label: '그냥 들어줘',
    description: '말없이 들어주기만 해도 돼요',
    emoji: '👂',
  },
  {
    mode: 'organize',
    label: '상황 정리해줘',
    description: '복잡한 감정과 상황을 정리하고 싶어요',
    emoji: '📝',
  },
  {
    mode: 'validate',
    label: '내가 이상한 건가?',
    description: '내 감정이 정상인지 확인받고 싶어요',
    emoji: '🤔',
  },
  {
    mode: 'direction',
    label: '뭘 해야 할지 모르겠어',
    description: '작은 행동 하나만 제안해줘요',
    emoji: '🧭',
  },
  {
    mode: 'similar',
    label: '나만 이런 건가?',
    description: '비슷한 경험을 한 사람들 이야기가 궁금해요',
    emoji: '👥',
  },
];
