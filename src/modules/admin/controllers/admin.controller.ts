import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { success } from "../../../common/response.js";
import type { AdminService } from "../services/admin.service.js";
import type {
  ListUsersQuery,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
  UserIdParams,
} from "../schemas/admin.schema.js";

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  stats = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const stats = await this.adminService.stats();
    reply.send(success(stats));
  };

  listUsers = async (
    request: FastifyRequest<{ Querystring: ListUsersQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.adminService.listUsers(request.query);
    reply.send(success(items, meta));
  };

  updateUserRole = async (
    request: FastifyRequest<{ Params: UserIdParams; Body: UpdateUserRoleInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.adminService.updateUserRole(
      request.user.role,
      request.params.id,
      request.body.role as Role,
    );
    reply.send(success(user));
  };

  updateUserStatus = async (
    request: FastifyRequest<{ Params: UserIdParams; Body: UpdateUserStatusInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.adminService.updateUserStatus(
      request.user.sub,
      request.user.role,
      request.params.id,
      request.body.isActive,
    );
    reply.send(success(user));
  };
}
