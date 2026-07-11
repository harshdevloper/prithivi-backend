"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
class AnalyticsService {
    analytics;
    queue;
    constructor(analytics, queue) {
        this.analytics = analytics;
        this.queue = queue;
    }
    /** Events are persisted asynchronously by the BullMQ worker. */
    async track(input, userId) {
        const job = {
            name: input.name,
            userId,
            metadata: input.metadata,
        };
        await this.queue.add("track", job, { removeOnComplete: 1_000, removeOnFail: 5_000 });
    }
    async summary(query) {
        const [totalEvents, byName] = await Promise.all([
            this.analytics.totalEvents(query.from, query.to),
            this.analytics.countsByName(query.from, query.to),
        ]);
        return { totalEvents, byName };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analytics.service.js.map