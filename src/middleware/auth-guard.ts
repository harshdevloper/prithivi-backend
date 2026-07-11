import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../common/errors.js";

/** Requires a valid access token; populates request.user. */
export const authGuard = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError("Invalid or missing authentication token");
  }
};

/** Verifies the token if present, but allows anonymous requests through. */
export const optionalAuth = async (request: FastifyRequest): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch {
    // anonymous request — request.user stays undefined
  }
};
