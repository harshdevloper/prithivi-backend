import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { AdminActor, RouletteService } from "../services/roulette.service.js";
import type {
  ActivateProfileInput,
  CreateProfileInput,
  EstimateRtpInput,
  HistoryQuery,
  PlayInput,
  ProfileIdParams,
  RoundIdParams,
  RoundsQuery,
} from "../schemas/roulette.schema.js";

export class RouletteController {
  constructor(private readonly rouletteService: RouletteService) {}

  private actor(request: FastifyRequest): AdminActor {
    return {
      id: request.user.sub,
      email: request.user.email,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
  }

  // ---- user ----

  getConfig = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.rouletteService.getConfig(request.user.sub)));
  };

  getStatus = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.rouletteService.getStatus(request.user.sub)));
  };

  play = async (
    request: FastifyRequest<{ Body: PlayInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(success(await this.rouletteService.play(request.user.sub, request.body)));
  };

  history = async (
    request: FastifyRequest<{ Querystring: HistoryQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { page, limit } = request.query;
    const { items, meta } = await this.rouletteService.history(request.user.sub, page, limit);
    reply.send(success(items, meta));
  };

  recentResults = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.rouletteService.recentResults()));
  };

  verifyRound = async (
    request: FastifyRequest<{ Params: RoundIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(success(await this.rouletteService.verifyRound(request.params.id, request.user.sub)));
  };

  // ---- admin ----

  adminListProfiles = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.rouletteService.listProfiles()));
  };

  adminCreateProfile = async (
    request: FastifyRequest<{ Body: CreateProfileInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply
      .status(201)
      .send(success(await this.rouletteService.createProfile(this.actor(request), request.body)));
  };

  adminActivateProfile = async (
    request: FastifyRequest<{ Params: ProfileIdParams; Body: ActivateProfileInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(
      success(
        await this.rouletteService.activateProfile(
          this.actor(request),
          request.params.id,
          request.body.reason,
        ),
      ),
    );
  };

  adminPreviewRtp = async (
    request: FastifyRequest<{ Body: EstimateRtpInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(success(await this.rouletteService.previewRtp(request.body)));
  };

  adminListRounds = async (
    request: FastifyRequest<{ Querystring: RoundsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.rouletteService.listRounds(request.query);
    reply.send(success(items, meta));
  };

  adminGetRound = async (
    request: FastifyRequest<{ Params: RoundIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(success(await this.rouletteService.getRound(request.params.id)));
  };

  adminAnalytics = async (
    request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(
      success(await this.rouletteService.analytics(request.query.from, request.query.to)),
    );
  };

  adminAuditLogs = async (
    request: FastifyRequest<{ Querystring: HistoryQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { page, limit } = request.query;
    const { items, meta } = await this.rouletteService.auditLogs(page, limit);
    reply.send(success(items, meta));
  };
}
