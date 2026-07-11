import { z } from "zod";
import type { PageMeta } from "./response.js";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const toSkipTake = (query: PaginationQuery): { skip: number; take: number } => ({
  skip: (query.page - 1) * query.limit,
  take: query.limit,
});

export const buildMeta = (query: PaginationQuery, total: number): PageMeta => ({
  page: query.page,
  limit: query.limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / query.limit)),
});
