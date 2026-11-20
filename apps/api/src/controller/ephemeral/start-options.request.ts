import { z } from 'zod';
import { TicketingScenarioSchema } from './ticketing-scenario.request';
export const StartOptionsRequestSchema = z
  .object({
    scenario: TicketingScenarioSchema.optional(),
    context: z.enum(['general', 'ticketing']),
    previous: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
  })
  .strict()
  .refine((value) => !value.scenario || value.context === 'ticketing', {
    message: '시나리오 문맥을 확인해 주세요.',
  });
export type StartOptionsRequest = z.infer<typeof StartOptionsRequestSchema>;
