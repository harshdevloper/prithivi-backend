# Admin proof performance — 27 September 2026

Implemented in `prithvi-admin` and `Backend/prithivi-backend`.

## Changes

- Offers loads editors, fraud, reward settings and proof review on demand. The proofs tab no longer requests category data. Settings form libraries are separated from the shared startup bundle.
- `GET /hot-offers/admin/submissions/count` serves badge counts without loading a submission, user or images.
- `GET /hot-offers/admin/submissions?preview=true` returns three newest images per submission plus `screenshotCount`. PostgreSQL selects the page first, joins small user/offer projections, and limits image rows in SQL. Existing callers retain complete lists by default.
- `GET /hot-offers/admin/submissions/:id` loads complete proof history when requested. Both new read endpoints retain the existing admin authorization requirement.
- Managed image URLs accept `size=160` or `size=640`. Local/S3 images receive proportional WebP derivatives; Cloudinary uses its transformation URLs. Full review images are unchanged.
- Thumbnail memory is capped at 16 MiB / 256 entries for ten minutes, with two concurrent transforms, coalesced requests and at most 64 pending jobs. Every request still validates the active asset and capability token. The HTTP cache remains private.
- Proofs, offer artwork and media-library images load lazily. Proofs display at most three inline images with access to the complete history. Review responses update the queue immediately; pagination, refresh failures and full-image loading have explicit states.

## Measurements

Production builds made from the working tree before and after these changes, including all static dependencies and the selected proofs tab:

| JavaScript | Before | After |
| --- | ---: | ---: |
| Shared startup, uncompressed | 568,701 bytes | 483,501 bytes |
| Additional proofs route, uncompressed | 139,295 bytes | 89,571 bytes |
| Total proofs load, uncompressed | 707,996 bytes | 573,072 bytes |
| Total proofs load, gzip | 228,522 bytes | 193,499 bytes |

The read-only `scripts/verify-admin-proof-performance.ts` comparison verified matching row data, image ordering and totals for pending pages 1/2, both product filters and all submissions. This database had 29 submissions at the time. The existing query path took 1,138–1,738 ms; the compact path took 730–950 ms (33–54% less in each paired check). These are individual measurements from the development machine, including network and connection-pool overhead, not hosted HTTP or browser timings. Compact responses include image counts, so JSON can be slightly larger for submissions with very few images.

Validation: admin production build and typecheck; backend compilation/typecheck; 189 backend tests; changed admin files lint with no errors (four existing Fast Refresh warnings); Chrome proof-list and history-dialog inspection. No live proofs were approved, rejected or reopened during verification.

## Rollout

The index migration `20260927120000_admin_proof_queue_index` was applied concurrently to the configured database, verified valid/ready, and recorded as applied in Prisma. It adds `(status ASC, createdAt DESC, id ASC)` without changing records. An older database migration, `20260711160000_withdrawals`, is absent from the local migration directory; this pre-existing discrepancy was left untouched. Only the new index was applied.

The local admin currently targets `https://prithivi-backend.onrender.com/api/v1`. The new backend code still needs deployment to that service for compact queries, the count endpoint, and thumbnail generation to become active there. The frontend falls back to the existing count/list API when the new count endpoint is missing; the old upload endpoint ignores the optional image size. Reload the panel after deploying the backend.

The normal admin build regenerates `vite.config.js` from `vite.config.ts`; Vite otherwise picks the existing JavaScript config. Both configurations now include the separate forms chunk. Build artifacts used for measurement were written under `/private/tmp`, leaving the existing `dist` trees untouched.

To repeat the database comparison without exposing proof/user data:

```sh
npm exec tsx -- scripts/verify-admin-proof-performance.ts
```
