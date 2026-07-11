import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { AnalyticsService } from "../services/analytics.service.js";
import type { AnalyticsSummaryQuery, TrackEventInput } from "../schemas/analytics.schema.js";

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  track = async (
    request: FastifyRequest<{ Body: TrackEventInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.analyticsService.track(request.body, request.user?.sub);
    reply.status(202).send(success({ accepted: true }));
  };

  summary = async (
    request: FastifyRequest<{ Querystring: AnalyticsSummaryQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const summary = await this.analyticsService.summary(request.query);
    reply.send(success(summary));
  };
}
