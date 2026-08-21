export const CHAT_LIMITS = {
  inputLength: 500,
  importTextLength: 10_000,
  importSummaryLength: 2_000,
  sessionTurns: 200,
  chatMessages: 100,
  requestsPerMinute: 20,
  generationRequestsPerMinute: 10,
  sessionStartsPerMinute: 5,
} as const;
