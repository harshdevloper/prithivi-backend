"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const errors_js_1 = require("../../../common/errors.js");
const env_js_1 = require("../../../config/env.js");
const tokens_js_1 = require("../../../utils/tokens.js");
const users_schema_js_1 = require("../../users/schemas/users.schema.js");
class AuthService {
    app;
    users;
    refreshTokens;
    wallets;
    constructor(app, users, refreshTokens, wallets) {
        this.app = app;
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.wallets = wallets;
    }
    /**
     * The only sign-in path: the client authenticates with Firebase (Google
     * provider) and sends the resulting Firebase ID token; we verify it with the
     * Admin SDK and mint our own app session (JWT + rotating refresh token).
     */
    async signInWithFirebaseIdToken(idToken) {
        if (!this.app.firebaseAuth) {
            throw new errors_js_1.AppError("Firebase authentication is not configured", 503, "FIREBASE_NOT_CONFIGURED");
        }
        let decoded;
        try {
            decoded = await this.app.firebaseAuth.verifyIdToken(idToken);
        }
        catch {
            throw new errors_js_1.UnauthorizedError("Invalid or expired Firebase ID token");
        }
        if (!decoded.email) {
            throw new errors_js_1.UnauthorizedError("Firebase token is missing a verified email");
        }
        const user = await this.users.upsertFirebaseUser({
            firebaseUid: decoded.uid,
            email: decoded.email,
            name: decoded.name ?? decoded.email.split("@")[0],
            avatarUrl: decoded.picture,
        });
        if (!user.isActive) {
            throw new errors_js_1.ForbiddenError("This account has been deactivated");
        }
        await this.wallets.ensureForUser(user.id);
        return this.issueTokens(user);
    }
    async refresh(refreshToken) {
        const record = await this.refreshTokens.findByHash((0, tokens_js_1.hashToken)(refreshToken));
        if (!record || record.revokedAt || record.expiresAt < new Date()) {
            throw new errors_js_1.UnauthorizedError("Invalid or expired refresh token");
        }
        if (!record.user.isActive) {
            throw new errors_js_1.ForbiddenError("This account has been deactivated");
        }
        // Rotation: every refresh token is single-use.
        await this.refreshTokens.revoke(record.id);
        return this.issueTokens(record.user);
    }
    async logout(refreshToken) {
        const record = await this.refreshTokens.findByHash((0, tokens_js_1.hashToken)(refreshToken));
        if (record && !record.revokedAt) {
            await this.refreshTokens.revoke(record.id);
        }
    }
    async logoutAll(userId) {
        await this.refreshTokens.revokeAllForUser(userId);
    }
    async me(userId) {
        const user = await this.users.findById(userId);
        if (!user)
            throw new errors_js_1.NotFoundError("User not found");
        return (0, users_schema_js_1.toPublicUser)(user);
    }
    async issueTokens(user) {
        const accessToken = this.app.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: env_js_1.env.JWT_ACCESS_EXPIRES_IN });
        const refreshToken = (0, tokens_js_1.generateOpaqueToken)();
        const expiresAt = new Date(Date.now() + (0, tokens_js_1.parseDuration)(env_js_1.env.JWT_REFRESH_EXPIRES_IN));
        await this.refreshTokens.create(user.id, (0, tokens_js_1.hashToken)(refreshToken), expiresAt);
        return { accessToken, refreshToken, user: (0, users_schema_js_1.toPublicUser)(user) };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map