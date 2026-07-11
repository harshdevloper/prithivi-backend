"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const env_js_1 = require("../config/env.js");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    if (!env_js_1.env.SWAGGER_ENABLED) {
        app.log.info("Swagger UI disabled (SWAGGER_ENABLED=false)");
        return;
    }
    await app.register(swagger_1.default, {
        openapi: {
            info: {
                title: "RewardHub API",
                description: "RewardHub backend API documentation",
                version: "0.1.0",
            },
            servers: [{ url: `http://localhost:${env_js_1.env.PORT}` }],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                },
            },
            tags: [
                { name: "auth", description: "Authentication" },
                { name: "users", description: "User profile" },
                { name: "campaigns", description: "Reward campaigns" },
                { name: "claims", description: "Reward claims" },
                { name: "wallet", description: "Wallet & transactions" },
                { name: "notifications", description: "User notifications" },
                { name: "analytics", description: "Event analytics" },
                { name: "admin", description: "Admin operations" },
            ],
        },
        transform: fastify_type_provider_zod_1.jsonSchemaTransform,
    });
    await app.register(swagger_ui_1.default, {
        routePrefix: env_js_1.env.SWAGGER_ROUTE,
    });
});
//# sourceMappingURL=swagger.plugin.js.map