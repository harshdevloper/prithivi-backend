import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { UsersService } from "../services/users.service.js";
import type { UpdateProfileInput } from "../schemas/users.schema.js";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const profile = await this.usersService.getProfile(request.user.sub);
    reply.send(success(profile));
  };

  updateMe = async (
    request: FastifyRequest<{ Body: UpdateProfileInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const profile = await this.usersService.updateProfile(request.user.sub, request.body);
    reply.send(success(profile));
  };
}
