import type { Queue } from "bullmq";
import { createQueue } from "../../../utils/queue.js";

export const ANALYTICS_QUEUE = "analytics";

export interface AnalyticsJob {
  name: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export const createAnalyticsQueue = (): Queue => createQueue(ANALYTICS_QUEUE);
