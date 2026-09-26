-- Match both filtered and all-status admin queues, including their stable tie-breaker.
-- Keep this outside a transaction: concurrent creation allows proof submissions
-- and reviews to continue while PostgreSQL builds the index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "offer_submissions_admin_queue_idx"
ON "offer_submissions" ("status" ASC, "createdAt" DESC, "id" ASC);
