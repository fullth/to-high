import { z } from 'zod';

export const EphemeralRequestSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().trim().min(1).max(2000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    mode: z
      .enum([
        'conversation',
        'comfort',
        'listen',
        'organize',
        'validate',
        'direction',
        'similar',
      ])
      .default('conversation'),
    style: z.enum(['T', 'F', 'reaction', 'listening']).default('F'),
    summary: z.string().trim().max(2000).optional(),
    characterId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const last = value.messages.at(-1)!;
    if (last.role !== 'user' || last.content.length > 500) {
      ctx.addIssue({
        code: 'custom',
        path: ['messages'],
        message: '마지막 입력은 500자 이하의 사용자 메시지여야 합니다.',
      });
    }
    if (
      value.messages.reduce(
        (sum, message) => sum + message.content.length,
        value.summary?.length || 0,
      ) > 12000
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['messages'],
        message: '대화 문맥은 12000자 이하여야 합니다.',
      });
    }
    if (
      value.messages.some(
        (message, index) =>
          index > 0 && message.role === value.messages[index - 1].role,
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['messages'],
        message: '사용자와 AI 메시지는 번갈아 전달해야 합니다.',
      });
    }
  });
export type EphemeralRequest = z.infer<typeof EphemeralRequestSchema>;
