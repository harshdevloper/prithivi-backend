import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { PaginationQuery } from "../../../common/pagination.js";
import type { RedemptionsService } from "../services/redemptions.service.js";
import type {
  AdminListRedemptionsQuery,
  CreateRedemptionInput,
  FulfillRedemptionInput,
  IdParams,
  ReviewRedemptionInput,
} from "../schemas/redemptions.schema.js";

export class RedemptionsController {
  constructor(private readonly service: RedemptionsService) {}

  config = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.service.getConfig()));
  };

  request = async (
    request: FastifyRequest<{ Body: CreateRedemptionInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const redemption = await this.service.request(request.user.sub, request.body);
    reply.status(201).send(success(redemption));
  };

  listMine = async (
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.service.listMine(request.user.sub, request.query);
    reply.send(success(items, meta));
  };

  listAdmin = async (
    request: FastifyRequest<{ Querystring: AdminListRedemptionsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.service.listAdmin(request.query);
    reply.send(success(items, meta));
  };

  review = async (
    request: FastifyRequest<{ Params: IdParams; Body: ReviewRedemptionInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const redemption = await this.service.review(
      request.params.id,
      request.user.sub,
      request.body,
    );
    reply.send(success(redemption));
  };

  fulfill = async (
    request: FastifyRequest<{ Params: IdParams; Body: FulfillRedemptionInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const redemption = await this.service.fulfill(
      request.params.id,
      request.user.sub,
      request.body,
    );
    reply.send(success(redemption));
  };
}
