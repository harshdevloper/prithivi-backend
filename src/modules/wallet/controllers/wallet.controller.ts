import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { PaginationQuery } from "../../../common/pagination.js";
import type { WalletService } from "../services/wallet.service.js";

export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  myWallet = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const wallet = await this.walletService.getMyWallet(request.user.sub);
    reply.send(success(wallet));
  };

  mySummary = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.walletService.getMySummary(request.user.sub)));
  };

  myTransactions = async (
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.walletService.getMyTransactions(
      request.user.sub,
      request.query,
    );
    reply.send(success(items, meta));
  };
}
