"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const env_js_1 = require("../config/env.js");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(jwt_1.default, {
        secret: env_js_1.env.JWT_SECRET,
        sign: {
            algorithm: "HS256",
            iss: env_js_1.env.JWT_ISSUER,
            aud: env_js_1.env.JWT_AUDIENCE,
        },
        verify: {
            allowedIss: env_js_1.env.JWT_ISSUER,
            allowedAud: env_js_1.env.JWT_AUDIENCE,
        },
    });
});
//# sourceMappingURL=jwt.plugin.js.map