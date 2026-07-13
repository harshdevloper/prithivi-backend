import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { UsersService } from "../services/users.service.js";
import type { ApplyReferralInput, UpdateProfileInput } from "../schemas/users.schema.js";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const profile = await this.usersService.getProfile(request.user.sub);
    reply.send(success(profile));
  };

  progress = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(success(await this.usersService.getProgress(request.user.sub)));
  };

  updateMe = async (
    request: FastifyRequest<{ Body: UpdateProfileInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const profile = await this.usersService.updateProfile(request.user.sub, request.body);
    reply.send(success(profile));
  };

  applyReferral = async (
    request: FastifyRequest<{ Body: ApplyReferralInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.usersService.applyReferral(request.user.sub, request.body.code);
    reply.send(success(result));
  };
}
