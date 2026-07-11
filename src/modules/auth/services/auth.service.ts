import type { FastifyInstance } from "fastify";
import type { User } from "@prisma/client";
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from "../../../common/errors.js";
import { env } from "../../../config/env.js";
import { generateOpaqueToken, hashToken, parseDuration } from "../../../utils/tokens.js";
import type { RefreshTokenRepository } from "../repositories/refresh-token.repository.js";
import type { UsersRepository } from "../../users/repositories/users.repository.js";
import type { WalletRepository } from "../../wallet/repositories/wallet.repository.js";
import { toPublicUser, type PublicUser } from "../../users/schemas/users.schema.js";
import type { AuthTokens } from "../schemas/auth.schema.js";

export class AuthService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly wallets: WalletRepository,
  ) {}

  /**
   * The only sign-in path: the client authenticates with Firebase (Google
   * provider) and sends the resulting Firebase ID token; we verify it with the
   * Admin SDK and mint our own app session (JWT + rotating refresh token).
   */
  async signInWithFirebaseIdToken(idToken: string): Promise<AuthTokens> {
    if (!this.app.firebaseAuth) {
      throw new AppError("Firebase authentication is not configured", 503, "FIREBASE_NOT_CONFIGURED");
    }

    let decoded;
    try {
      decoded = await this.app.firebaseAuth.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired Firebase ID token");
    }

    if (!decoded.email) {
      throw new UnauthorizedError("Firebase token is missing a verified email");
    }

    const user = await this.users.upsertFirebaseUser({
      firebaseUid: decoded.uid,
      email: decoded.email,
      name: (decoded.name as string | undefined) ?? decoded.email.split("@")[0],
      avatarUrl: decoded.picture,
    });

    if (!user.isActive) {
      throw new ForbiddenError("This account has been deactivated");
    }

    await this.wallets.ensureForUser(user.id);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const record = await this.refreshTokens.findByHash(hashToken(refreshToken));

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }
    if (!record.user.isActive) {
      throw new ForbiddenError("This account has been deactivated");
    }

    // Rotation: every refresh token is single-use.
    await this.refreshTokens.revoke(record.id);
    return this.issueTokens(record.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const record = await this.refreshTokens.findByHash(hashToken(refreshToken));
    if (record && !record.revokedAt) {
      await this.refreshTokens.revoke(record.id);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    return toPublicUser(user);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessToken = this.app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    );

    const refreshToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN));
    await this.refreshTokens.create(user.id, hashToken(refreshToken), expiresAt);

    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
