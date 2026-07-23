# Money Marathon Backend

Fastify + TypeScript API for Money Marathon, including Firebase authentication,
wallet rewards, offers/proof review, Xoxoday Plum Reward Links, notifications,
redemptions, admin CMS and Swagger documentation.

## Requirements

- Node.js >= 20
- PostgreSQL 14+ (local service, default `localhost:5432`)
- Redis 6+ (local service, default `localhost:6379`)

## Setup

```bash
cp .env.example .env        # then fill in secrets
npm install
npm run prisma:generate
npm run prisma:migrate      # apply migrations (dev)
npx prisma db seed          # seed SUPER_ADMIN (ADMIN_EMAIL / ADMIN_NAME in .env)
npm run dev
```

- API: `http://localhost:4000/api/v1`
- Swagger docs: `http://localhost:4000/docs`
- Health check: `GET /api/v1/health`

Production: `npm run build && npm run prisma:deploy && npm start`.

## Environment variables

See [.env.example](.env.example). Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (BullMQ + caching) |
| `JWT_SECRET` | Signing key for access tokens |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (`15m`, `7d`) |
| `FIREBASE_SERVICE_ACCOUNT` / `FIREBASE_PROJECT_ID` | Firebase Admin authentication |
| `XOXODAY_*` | Plum Reward Link credentials, campaign and token refresh |
| `ADMIN_EMAIL` | Email seeded as SUPER_ADMIN |

## Authentication

The mobile app signs in with Firebase/Google and exchanges the Firebase ID token
at `POST /api/v1/auth/firebase`. The API returns `{ accessToken, refreshToken,
user }`. Access tokens are short-lived JWTs; refresh tokens are opaque, hashed
in the database and single-use.

## Xoxoday Plum Reward Links

Create a Reward Link campaign in Plum, copy its campaign ID into a voucher
catalog item in the admin panel (or `XOXODAY_CAMPAIGN_ID` as the default), and
configure the server-only `XOXODAY_*` variables. Approving a Plum catalog
redemption calls `xoxo_link.mutation.generateLink` and stores the returned claim
URL plus Plum batch ID. Test with the staging base URL before switching to the
production account URL. Xoxoday also requires the server IP to be whitelisted.
Because Plum rotates refresh tokens, set `XOXODAY_TOKEN_STATE_FILE` to a path
on a private persistent disk (for example `/var/data/xoxoday-tokens.json`). The
backend writes the latest access/refresh pair atomically with owner-only file
permissions so restarts do not reuse an invalidated environment token.

Roles: `USER`, `ADMIN`, `SUPER_ADMIN`. Admin routes require `ADMIN`+; only a `SUPER_ADMIN` can manage other super admins.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/google`, `GET /auth/google/callback`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me` |
| Users | `GET /users/me`, `PATCH /users/me` |
| Campaigns | `GET /campaigns` (public, active), `GET /campaigns/:id`, `GET /campaigns/manage`*, `POST /campaigns`*, `PATCH /campaigns/:id`*, `PATCH /campaigns/:id/status`* |
| Claims | `POST /claims`, `GET /claims/me`, `GET /claims`*, `PATCH /claims/:id/review`* |
| Wallet | `GET /wallet`, `GET /wallet/transactions` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` |
| Analytics | `POST /analytics/track`, `GET /analytics/summary`* |
| Admin | `GET /admin/stats`*, `GET /admin/users`*, `PATCH /admin/users/:id/role`*, `PATCH /admin/users/:id/status`* |

\* = admin only. Full request/response shapes in Swagger (`/docs`).

Approving a claim atomically credits the user's wallet (Prisma transaction) and enqueues a notification through BullMQ.

## Architecture

```
src/
├── config/       Zod-validated env, logger, redis factory
├── plugins/      Fastify plugins: prisma, redis, jwt, oauth, swagger, security
├── common/       AppError hierarchy, response formatter, pagination helpers
├── middleware/   Global error handler, authGuard, requireRoles/adminOnly
├── modules/      8 domain modules, each: repositories/ services/ controllers/ routes/ schemas/
├── workers/      BullMQ workers (notifications, analytics)
├── container.ts  Composition root — constructor DI: repos → services → controllers
├── routes/       Route registry under /api/v1
├── app.ts        Fastify app builder (zod validator/serializer, plugins, DI)
└── server.ts     Entry point + graceful shutdown
```

- **Repository pattern**: all Prisma access lives in `modules/*/repositories`; services hold business rules; controllers only translate HTTP.
- **Dependency injection**: `container.ts` is the composition root; everything is constructor-injected and exposed to routes via `app.di`.
- **Validation**: Zod schemas on every route body/query/params via `fastify-type-provider-zod`; the same schemas drive Swagger.
- **Error handling**: one global handler maps `AppError`, Zod issues, and Prisma known errors (P2002 → 409, P2025 → 404) to a consistent `{ success: false, error }` envelope.
- **Logging**: Pino (pretty in dev, JSON in production), request IDs honored via `x-request-id`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload (tsx watch) |
| `npm run build` / `npm start` | Compile and run production build |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create/apply dev migrations |
| `npm run prisma:deploy` | Apply migrations in production |
| `npx prisma db seed` | Seed the SUPER_ADMIN user |
| `npm run typecheck` | TypeScript check without emit |
| `npm run lint` / `npm run test` | Lint / run tests |
