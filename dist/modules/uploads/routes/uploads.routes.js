"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsRoutes = void 0;
const multipart_1 = __importDefault(require("@fastify/multipart"));
const auth_guard_js_1 = require("../../../middleware/auth-guard.js");
const env_js_1 = require("../../../config/env.js");
const uploadsRoutes = async (app) => {
    await app.register(multipart_1.default, {
        limits: {
            fileSize: env_js_1.env.UPLOAD_MAX_BYTES,
            files: 1,
        },
    });
    app.post("/", {
        preHandler: [auth_guard_js_1.authGuard],
        schema: {
            tags: ["users"],
            summary: "Upload an image (claim proof, avatar). Multipart field: file",
            security: [{ bearerAuth: [] }],
            consumes: ["multipart/form-data"],
        },
    }, app.di.uploadsController.upload);
};
exports.uploadsRoutes = uploadsRoutes;
//# sourceMappingURL=uploads.routes.js.map