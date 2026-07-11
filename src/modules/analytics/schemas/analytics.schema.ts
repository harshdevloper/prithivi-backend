import { z } from "zod";

export const trackEventSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9_.:-]+$/i, "Event name may only contain letters, digits, _ . : -"),
  metadata: z.record(z.unknown()).optional(),
});
export type TrackEventInput = z.infer<typeof trackEventSchema>;

export const analyticsSummaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type AnalyticsSummaryQuery = z.infer<typeof analyticsSummaryQuerySchema>;
