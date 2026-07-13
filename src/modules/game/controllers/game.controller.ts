import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { GameService } from "../services/game.service.js";
import type { MatchIdParams, MoveInput, StartMatchInput } from "../schemas/game.schema.js";

export class GameController {
  constructor(private readonly gameService: GameService) {}

  getConfig = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.gameService.getConfig(request.user.sub)));
  };

  startMatch = async (
    request: FastifyRequest<{ Body: StartMatchInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply
      .status(201)
      .send(
        success(
          await this.gameService.startMatch(request.user.sub, request.body?.hints ?? false),
        ),
      );
  };

  move = async (
    request: FastifyRequest<{ Params: MatchIdParams; Body: MoveInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(
      success(
        await this.gameService.move(request.user.sub, request.params.id, request.body.cell),
      ),
    );
  };
}
