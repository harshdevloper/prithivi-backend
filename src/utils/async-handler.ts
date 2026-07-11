import type { FastifyReply, FastifyRequest } from "fastify";

type Handler = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

// Wraps route handlers so rejected promises reach Fastify's error handler.
export const asyncHandler = (handler: Handler): Handler => {
  return async (request, reply) => handler(request, reply);
};
