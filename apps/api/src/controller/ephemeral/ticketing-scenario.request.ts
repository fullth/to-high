import { z } from 'zod';

export const TicketingScenarioSchema = z
  .object({
    source: z.enum(['practicket', 'lobby']),
    kind: z.literal('ticketing'),
    gender: z.enum(['male', 'female']),
    name: z
      .string()
      .normalize('NFKC')
      .trim()
      .min(1)
      .max(12)
      .regex(/^[\p{L}\p{N}][\p{L}\p{N} ]*$/u),
  })
  .strict();
