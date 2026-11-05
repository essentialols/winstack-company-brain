import { z } from 'zod';

/**
 * What Claude returns. Mirrors IssueContent (packages/shared/src/types/brain.ts) with two
 * deliberate differences that we fill in ourselves from trusted data:
 *  - takeaways cite `saveIds` (we build IssueSourceRef title/url/savedBy from the saves)
 *  - podcast chapters have no `startSec` (computed from the synthesized audio)
 */
export const visualSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('table'),
    caption: z.string().optional(),
    columns: z.array(z.string()).min(2).max(5),
    rows: z.array(z.array(z.string())).min(1).max(8),
  }),
  z.object({
    type: z.literal('grid'),
    caption: z.string().optional(),
    cells: z.array(z.object({ title: z.string(), sub: z.string() })).min(2).max(6),
  }),
  z.object({
    type: z.literal('bars'),
    caption: z.string().optional(),
    unit: z.string().optional(),
    bars: z
      .array(z.object({ label: z.string(), value: z.number(), highlight: z.boolean().optional() }))
      .min(2)
      .max(8),
  }),
]);

export const takeawaySchema = z.object({
  title: z.string().min(3).max(140),
  line: z.string().min(3).max(400),
  heading: z.string().min(2).max(120),
  detail: z.array(z.string().min(1)).min(1).max(3),
  quote: z.object({ text: z.string().min(3), cite: z.string().min(1) }).nullish(),
  visual: visualSchema.nullish(),
  todo: z.string().min(3).max(400),
  saveIds: z.array(z.string()).min(1),
});

export const draftIssueSchema = z.object({
  eyebrow: z.string().min(1).max(120),
  title: z.string().min(3).max(140),
  lead: z.string().min(3).max(600),
  takeaways: z.array(takeawaySchema).min(1).max(5),
  alsoSaved: z
    .array(z.object({ saveId: z.string(), title: z.string(), note: z.string() }))
    .default([]),
  podcast: z
    .object({
      title: z.string().min(1),
      chapters: z.array(z.object({ title: z.string().min(1) })).min(1),
      transcript: z
        .array(
          z.object({
            speaker: z.enum(['IN', 'AN']),
            text: z.string().min(1),
            chapter: z.number().int().min(0),
          }),
        )
        .min(2),
    })
    .nullable(),
});

export type DraftIssue = z.infer<typeof draftIssueSchema>;
