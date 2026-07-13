import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { AppAssetsService } from "../services/app-assets.service.js";
import type { PutAssetInput, SlotKeyParams } from "../registry.js";

export class AppAssetsController {
  constructor(private readonly service: AppAssetsService) {}

  listPublic = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.header("cache-control", "public, max-age=300");
    reply.send(success(await this.service.listPublic()));
  };

  listAdmin = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.service.listAdmin()));
  };

  upsert = async (
    request: FastifyRequest<{ Params: SlotKeyParams; Body: PutAssetInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(
      success(
        await this.service.upsert(request.params.key, request.body.imageUrl, request.user.sub),
      ),
    );
  };

  remove = async (
    request: FastifyRequest<{ Params: SlotKeyParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(success(await this.service.remove(request.params.key)));
  };
}
