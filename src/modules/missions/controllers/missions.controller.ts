import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { MissionsService } from "../services/missions.service.js";
import type {
  ListCompletionsQuery,
  MissionIdParams,
  ReviewCompletionInput,
  UpdateMissionInput,
  UpsertMissionInput,
} from "../schemas/missions.schema.js";

export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  // ---- user ----

  listPublished = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.missionsService.listPublished(request.user.sub)));
  };

  complete = async (
    request: FastifyRequest<{ Params: MissionIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const completion = await this.missionsService.complete(request.user.sub, request.params.id);
    reply.status(201).send(success(completion));
  };

  listMine = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.missionsService.listMine(request.user.sub)));
  };

  // ---- admin ----

  listAll = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.missionsService.listAll()));
  };

  create = async (
    request: FastifyRequest<{ Body: UpsertMissionInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.status(201).send(success(await this.missionsService.create(request.body)));
  };

  update = async (
    request: FastifyRequest<{ Params: MissionIdParams; Body: UpdateMissionInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(success(await this.missionsService.update(request.params.id, request.body)));
  };

  remove = async (
    request: FastifyRequest<{ Params: MissionIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.missionsService.remove(request.params.id);
    reply.status(204).send();
  };

  listCompletions = async (
    request: FastifyRequest<{ Querystring: ListCompletionsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.missionsService.listCompletions(request.query);
    reply.send(success(items, meta));
  };

  review = async (
    request: FastifyRequest<{ Params: MissionIdParams; Body: ReviewCompletionInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const completion = await this.missionsService.review(
      request.params.id,
      request.user.sub,
      request.body,
    );
    reply.send(success(completion));
  };
}
