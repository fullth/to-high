import { z } from 'zod';

export const journeySources = ['practicket', 'other'] as const;
export const journeyEntries = [
  'unselected',
  'ad_ticketing',
  'lobby_ticketing',
  'levi',
] as const;
export const journeyStages = [
  'landing',
  'selected',
  'character_selected',
  'first_message',
  'first_response',
  'continued',
] as const;
export type JourneyStage = (typeof journeyStages)[number];
export const JourneyContextSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{32}$/),
    source: z.enum(journeySources),
    entry: z.enum(journeyEntries),
  })
  .strict();
export type JourneyContext = z.infer<typeof JourneyContextSchema>;
export const JourneyEventSchema = z
  .object({
    journey: JourneyContextSchema,
    event: z.enum(['landing', 'selected', 'character_selected']),
  })
  .strict()
  .refine(
    ({ journey, event }) =>
      event === 'landing' || journey.entry !== 'unselected',
  );

export function journeyMatchesScenario(
  journey: JourneyContext,
  scenario?: { source: 'practicket' | 'lobby' },
) {
  return scenario
    ? journey.entry ===
        (scenario.source === 'practicket' ? 'ad_ticketing' : 'lobby_ticketing')
    : journey.entry === 'levi';
}
