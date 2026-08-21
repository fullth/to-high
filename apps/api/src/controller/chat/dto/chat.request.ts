import { z } from 'zod';
import { CHAT_LIMITS } from '../../../common/chat-limits';

export const SessionIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, '올바른 sessionId가 필요합니다');

const NonBlankTextSchema = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);

export const StartSessionSchema = z
  .object({
    category: z
      .enum(['self', 'future', 'work', 'relationship', 'love', 'daily'])
      .optional(),
    initialText: NonBlankTextSchema(CHAT_LIMITS.inputLength).optional(),
    counselorType: z.enum(['T', 'F', 'reaction', 'listening']).optional(),
    importSummary: NonBlankTextSchema(
      CHAT_LIMITS.importSummaryLength,
    ).optional(),
  })
  .strict()
  .refine((data) => data.category || data.initialText || data.importSummary, {
    message: 'category, initialText, importSummary 중 하나는 필수입니다',
  });
export type StartSessionRequest = z.infer<typeof StartSessionSchema>;

export const SelectOptionSchema = z
  .object({
    sessionId: SessionIdSchema,
    selectedOption: NonBlankTextSchema(CHAT_LIMITS.inputLength),
  })
  .strict();
export type SelectOptionRequest = z.infer<typeof SelectOptionSchema>;

export const SetModeSchema = z
  .object({
    sessionId: SessionIdSchema,
    mode: z.enum([
      'comfort',
      'organize',
      'validate',
      'direction',
      'listen',
      'similar',
    ]),
  })
  .strict();
export type SetModeRequest = z.infer<typeof SetModeSchema>;

export const SendMessageSchema = z
  .object({
    sessionId: SessionIdSchema,
    message: NonBlankTextSchema(CHAT_LIMITS.inputLength),
  })
  .strict();
export type SendMessageRequest = z.infer<typeof SendMessageSchema>;

export const EndSessionSchema = z
  .object({
    sessionId: SessionIdSchema,
  })
  .strict();
export type EndSessionRequest = z.infer<typeof EndSessionSchema>;

export const SummarizeTextSchema = z
  .object({
    text: NonBlankTextSchema(CHAT_LIMITS.importTextLength),
  })
  .strict();
export type SummarizeTextRequest = z.infer<typeof SummarizeTextSchema>;

export const SaveSessionSchema = z
  .object({
    savedName: NonBlankTextSchema(50).optional(),
  })
  .strict();

export const UpdateSessionAliasSchema = z
  .object({
    alias: NonBlankTextSchema(50),
  })
  .strict();
