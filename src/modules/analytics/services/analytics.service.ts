import type { Queue } from "bullmq";
import type { AnalyticsRepository, EventCount } from "../repositories/analytics.repository.js";
import type { AnalyticsJob } from "../queues/analytics.queue.js";
import type { AnalyticsSummaryQuery, TrackEventInput } from "../schemas/analytics.schema.js";

export interface AnalyticsSummary {
  totalEvents: number;
  byName: EventCount[];
}

export class AnalyticsService {
  constructor(
    private readonly analytics: AnalyticsRepository,
    private readonly queue: Queue,
  ) {}

  /** Events are persisted asynchronously by the BullMQ worker. */
  async track(input: TrackEventInput, userId?: string): Promise<void> {
    const job: AnalyticsJob = {
      name: input.name,
      userId,
      metadata: input.metadata as Record<string, unknown> | undefined,
    };
    await this.queue.add("track", job, { removeOnComplete: 1_000, removeOnFail: 5_000 });
  }

  async summary(query: AnalyticsSummaryQuery): Promise<AnalyticsSummary> {
    const [totalEvents, byName] = await Promise.all([
      this.analytics.totalEvents(query.from, query.to),
      this.analytics.countsByName(query.from, query.to),
    ]);
    return { totalEvents, byName };
  }
}
