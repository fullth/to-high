import { z } from 'zod';

export const StartSessionSchema = z
  .object({
    category: z.enum(['self', 'future', 'work', 'relationship', 'love', 'daily']).optional(),
    initialText: z.string().min(1).optional(),
    counselorType: z.enum(['T', 'F', 'reaction', 'listening']).optional(),
    importSummary: z.string().min(1).optional(), // 이미 요약된 불러오기 텍스트
  })
  .refine((data) => data.category || data.initialText || data.importSummary, {
    message: 'category, initialText, importSummary 중 하나는 필수입니다',
  });
export type StartSessionRequest = z.infer<typeof StartSessionSchema>;

export const SelectOptionSchema = z.object({
  sessionId: z.string().min(1),
  selectedOption: z.string().min(1),
});
export type SelectOptionRequest = z.infer<typeof SelectOptionSchema>;

export const SetModeSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.enum([
    'comfort',
    'organize',
    'validate',
    'direction',
    'listen',
    'similar',
  ]),
});
export type SetModeRequest = z.infer<typeof SetModeSchema>;

export const SendMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().optional(),
});
export type SendMessageRequest = z.infer<typeof SendMessageSchema>;

export const EndSessionSchema = z.object({
  sessionId: z.string().min(1),
});
export type EndSessionRequest = z.infer<typeof EndSessionSchema>;

export const SummarizeTextSchema = z.object({
  text: z.string().min(1).max(100000),
});
export type SummarizeTextRequest = z.infer<typeof SummarizeTextSchema>;
