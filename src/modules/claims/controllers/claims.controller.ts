import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { ClaimsService } from "../services/claims.service.js";
import type {
  ClaimIdParams,
  ListClaimsQuery,
  ReviewClaimInput,
  SubmitClaimInput,
} from "../schemas/claims.schema.js";

export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  submit = async (
    request: FastifyRequest<{ Body: SubmitClaimInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const claim = await this.claimsService.submit(request.user.sub, request.body);
    reply.status(201).send(success(claim));
  };

  review = async (
    request: FastifyRequest<{ Params: ClaimIdParams; Body: ReviewClaimInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const claim = await this.claimsService.review(
      request.params.id,
      request.user.sub,
      request.body,
    );
    reply.send(success(claim));
  };

  listMine = async (
    request: FastifyRequest<{ Querystring: ListClaimsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.claimsService.listMine(request.user.sub, request.query);
    reply.send(success(items, meta));
  };

  listAll = async (
    request: FastifyRequest<{ Querystring: ListClaimsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.claimsService.listAll(request.query);
    reply.send(success(items, meta));
  };
}
