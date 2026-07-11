"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authTokensSchema = exports.refreshTokenSchema = exports.firebaseSignInSchema = void 0;
const zod_1 = require("zod");
const users_schema_js_1 = require("../../users/schemas/users.schema.js");
exports.firebaseSignInSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(10),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(32),
});
exports.authTokensSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    user: users_schema_js_1.publicUserSchema,
});
//# sourceMappingURL=auth.schema.js.map