export const CHAT_ERROR_COPY = {
  NETWORK: "레비와의 연결이 잠시 끊겼어요. 다시 한번 말씀 해주실 수 있을까요??",
  TIMEOUT: "레비가 답변하는데 시간이 걸리고 있어요. 잠시 후 다시 시도해주세요.",
  RATE_LIMITED:
    "레비가 채워둔 지갑이 다시 얇아졌어요,, 조금 뒤에 다시 찾아주세요.",
  UNAVAILABLE: "레비와의 연결에 문제가 생겼습니다. 잠시 후 다시 시도해주세요.",
  INTERRUPTED: "레비의 응답이 끊어졌어요, 다시 시도해볼까요?",
  SUMMARY_FAILED:
    "레비와 나눴던 이야기를 정리하지 못했어요. 다시 시도하거나 새 대화를 시작해주세요.",
  BUSY: "레비가 다른 이야기에 답변하고 있어요. 답변이 끝나면 다시 말씀해주세요.",
  AUTH_REQUIRED:
    "로그인이 만료됐어요. 다시 로그인하거나 가입 없이 새 대화를 시작해주세요.",
  INVALID_INPUT:
    "보내주신 이야기를 확인하지 못했어요. 내용을 확인하고 다시 말씀해주세요.",
} as const;

export type ChatErrorCode = keyof typeof CHAT_ERROR_COPY;
export class ChatRequestError extends Error {
  constructor(readonly code: ChatErrorCode) {
    super(CHAT_ERROR_COPY[code]);
  }
}

export function getChatErrorCopy(error: unknown) {
  return error instanceof ChatRequestError
    ? CHAT_ERROR_COPY[error.code]
    : CHAT_ERROR_COPY.UNAVAILABLE;
}
