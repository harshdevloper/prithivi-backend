import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { describe, expect, it, vi } from "vitest";
import { HotOffersController } from "../controllers/hot-offers.controller.js";
import type { HotOffersService } from "../services/hot-offers.service.js";
import { hotOffersRoutes } from "./hot-offers.routes.js";

describe("admin proof API", () => {
  it("authenticates counts/details, validates filters, and keeps preview requests opt-in", async () => {
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(jwt, { secret: "local-route-test-secret-not-for-production" });
    const service = {
      adminSubmissionCount: vi.fn(async () => ({ total: 21 })),
      adminSubmissionDetails: vi.fn(async (id: string) => ({ id, screenshotUrls: ["one", "two", "three", "four"] })),
      adminListSubmissions: vi.fn(async () => ({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } })),
    };
    app.decorate("di", { hotOffersController: new HotOffersController(service as unknown as HotOffersService) } as typeof app.di);
    await app.register(hotOffersRoutes);
    const headers = { authorization: `Bearer ${app.jwt.sign({ sub: "admin", email: "admin@example.test", role: "ADMIN" })}` };
    const id = "00000000-0000-4000-8000-000000000001";
    try {
      expect((await app.inject({ url: "/admin/submissions/count" })).statusCode).toBe(401);
      expect((await app.inject({ url: `/admin/submissions/${id}`, headers: {
        authorization: `Bearer ${app.jwt.sign({ sub: "user", email: "user@example.test", role: "USER" })}`,
      } })).statusCode).toBe(403);
      expect(service.adminSubmissionDetails).not.toHaveBeenCalled();
      const count = await app.inject({ url: "/admin/submissions/count?status=PENDING&product=false", headers });
      expect(count.statusCode).toBe(200);
      expect(count.json().data).toEqual({ total: 21 });
      expect(service.adminSubmissionCount).toHaveBeenCalledWith({ status: "PENDING", product: "false" });
      expect((await app.inject({ url: "/admin/submissions/count?status=INVALID", headers })).statusCode).toBe(400);
      const details = await app.inject({ url: `/admin/submissions/${id}`, headers });
      expect(details.statusCode).toBe(200);
      expect(details.json().data.screenshotUrls).toHaveLength(4);
      expect((await app.inject({ url: "/admin/submissions/not-an-id", headers })).statusCode).toBe(400);
      expect((await app.inject({ url: "/admin/submissions?limit=10&preview=true", headers })).statusCode).toBe(200);
      expect(service.adminListSubmissions).toHaveBeenLastCalledWith({ page: 1, limit: 10, preview: "true" });
      await app.inject({ url: "/admin/submissions?limit=10", headers });
      expect(service.adminListSubmissions).toHaveBeenLastCalledWith({ page: 1, limit: 10 });
    } finally { await app.close(); }
  });
});
