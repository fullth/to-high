import { ResponseMode } from './session';

export interface GenerateOptionsResult {
  question: string;
  options: string[];
  canProceedToResponse: boolean;
}

export interface ResponseModeOption {
  id: ResponseMode;
  label: string;
}

export const RESPONSE_MODE_OPTIONS: ResponseModeOption[] = [
  { id: 'comfort', label: '그냥 위로부터' },
  { id: 'organize', label: '상황 정리해줘' },
  { id: 'validate', label: '내가 이상한 건지 말해줘' },
  { id: 'direction', label: '앞으로 어떻게 해야 할지' },
];
