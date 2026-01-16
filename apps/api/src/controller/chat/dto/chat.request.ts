import { z } from 'zod';

export const StartSessionSchema = z.object({
  category: z.enum(['self', 'future', 'work', 'relationship']),
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
