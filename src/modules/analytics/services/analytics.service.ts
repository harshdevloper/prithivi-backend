import type { AnalyticsRepository, EventCount } from "../repositories/analytics.repository.js";
import type { AnalyticsSummaryQuery, TrackEventInput } from "../schemas/analytics.schema.js";

export interface AnalyticsSummary {
  totalEvents: number;
  byName: EventCount[];
}

export class AnalyticsService {
  constructor(private readonly analytics: AnalyticsRepository) {}

  /** One indexed insert — done inline now that the Redis queue is gone. */
  async track(input: TrackEventInput, userId?: string): Promise<void> {
    await this.analytics.createEvent({
      name: input.name,
      userId,
      metadata: input.metadata as Record<string, unknown> | undefined,
    });
  }

  async summary(query: AnalyticsSummaryQuery): Promise<AnalyticsSummary> {
    const [totalEvents, byName] = await Promise.all([
      this.analytics.totalEvents(query.from, query.to),
      this.analytics.countsByName(query.from, query.to),
    ]);
    return { totalEvents, byName };
  }
}
