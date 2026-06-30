import { ResponseMode } from './session';

export interface GenerateOptionsResult {
  question: string;
  options: string[];
  canProceedToResponse: boolean;
  canRequestFeedback?: boolean; // 컨텍스트가 충분히 쌓였을 때 피드백 요청 가능
  responseType?: 'question' | 'listening'; // 질문형 vs 경청형
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
    label: '그냥 위로받고 싶어요',
    description: '해결책 없이 공감만으로 충분해요',
    emoji: '',
  },
  {
    mode: 'listen',
    label: '가만히 들어주세요',
    description: '말없이 들어주기만 해도 돼요',
    emoji: '',
  },
  {
    mode: 'organize',
    label: '상황을 정리하고 싶어요',
    description: '복잡한 감정과 상황을 함께 풀어봐요',
    emoji: '',
  },
  {
    mode: 'validate',
    label: '내가 이상한 걸까요',
    description: '내 감정이 이상한 게 아닌지 듣고 싶어요',
    emoji: '',
  },
  {
    mode: 'direction',
    label: '뭘 해야 할지 모르겠어요',
    description: '작은 발걸음 하나만 같이 찾아요',
    emoji: '',
  },
  {
    mode: 'similar',
    label: '나만 이런 걸까요',
    description: '비슷한 마음을 지나온 이야기가 궁금해요',
    emoji: '',
  },
];

const SESSION_PREVIEW_MAX_LENGTH = 60;

// context 에 저장된 사용자 발화에서 내부 접두사를 벗겨 사람이 읽을 한 줄로 만든다.
function stripUtterancePrefix(raw: string): string {
  return raw
    .replace(/^\[위기 감지:[^\]]*\]\s*/, '')
    .replace(/^\[사용자 직접 입력\]\s*/, '')
    .replace(/^\[말하기 어려움 선택\]\s*/, '')
    .replace(/^나:\s*/, '')
    .trim();
}

function clampPreview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > SESSION_PREVIEW_MAX_LENGTH
    ? `${flat.slice(0, SESSION_PREVIEW_MAX_LENGTH)}…`
    : flat;
}

// 세션 목록 카드에 보여줄 미리보기 한 줄.
// 완료된 이야기는 AI 요약을, 진행 중인 이야기는 첫 사용자 발화를 발췌한다.
export function buildSessionPreview(input: {
  status: string;
  summary?: string;
  firstContext?: string;
}): string | undefined {
  if (input.status === 'completed' && input.summary) {
    return clampPreview(input.summary);
  }
  if (input.firstContext) {
    const utterance = stripUtterancePrefix(input.firstContext);
    if (utterance) return clampPreview(utterance);
  }
  return undefined;
}
