import { z } from 'zod';
export const StartOptionsRequestSchema = z
  .object({
    context: z.enum(['general', 'ticketing']),
    previous: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
  })
  .strict();
export type StartOptionsRequest = z.infer<typeof StartOptionsRequestSchema>;
