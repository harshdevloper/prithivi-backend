import { mkdirSync } from "node:fs";
import path from "node:path";
import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { UPLOADS } from "../config/constants.js";

/**
 * Serves locally stored uploads at /uploads/* — the fallback storage when
 * Cloudinary is not configured. In production nginx should serve this
 * directory directly for performance; this plugin keeps the URL working
 * either way.
 */
export default fp(async (app: FastifyInstance) => {
  const root = path.resolve(process.cwd(), env.UPLOADS_DIR);
  mkdirSync(root, { recursive: true });

  await app.register(fastifyStatic, {
    root,
    prefix: `${UPLOADS.PUBLIC_PREFIX}/`,
    decorateReply: false,
    index: false,
    list: false,
    maxAge: "7d",
  });
});
