import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../common/errors.js";

/** Must run after authGuard. Allows only the given roles. */
export const requireRoles = (...roles: Role[]) => {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(request.user.role as Role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
  };
};

export const adminOnly = requireRoles("ADMIN", "SUPER_ADMIN");
export const superAdminOnly = requireRoles("SUPER_ADMIN");
