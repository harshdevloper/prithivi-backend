import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { SettingsService } from "../services/settings.service.js";
import type { UpdateSettingsInput } from "../schemas/settings.schema.js";

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.service.list()));
  };

  publicConfig = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply
      .header("Cache-Control", "public, max-age=300")
      .send(
        success({
          webBaseUrl: await this.service.getString("web.baseUrl"),
          telegramUrl: await this.service.getString("social.telegramUrl"),
          linkedinUrl: await this.service.getString("social.linkedinUrl"),
        }),
      );
  };

  update = async (
    request: FastifyRequest<{ Body: UpdateSettingsInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.send(success(await this.service.update(request.body, request.user.sub)));
  };
}
