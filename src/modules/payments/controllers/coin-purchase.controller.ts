import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type {
  CreateCoinPurchaseOrderInput,
  VerifyCoinPurchaseInput,
} from "../schemas/coin-purchase.schema.js";
import type { CoinPurchaseService } from "../services/coin-purchase.service.js";

export class CoinPurchaseController {
  constructor(private readonly service: CoinPurchaseService) {}

  config = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.service.getConfig()));
  };

  createOrder = async (
    request: FastifyRequest<{ Body: CreateCoinPurchaseOrderInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.status(201).send(success(await this.service.createOrder(request.user.sub, request.body)));
  };

  verify = async (
    request: FastifyRequest<{ Body: VerifyCoinPurchaseInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(success(await this.service.verify(request.user.sub, request.body)));
  };

  reconcile = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.service.reconcile(request.user.sub)));
  };
}
