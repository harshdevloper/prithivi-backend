"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const errors_js_1 = require("../common/errors.js");
const response_js_1 = require("../common/response.js");
const env_js_1 = require("../config/env.js");
const errorHandler = (error, request, reply) => {
    if (error instanceof errors_js_1.AppError) {
        if (error.statusCode >= 500)
            request.log.error(error);
        reply.status(error.statusCode).send((0, response_js_1.failure)(error.code, error.message, error.details));
        return;
    }
    if ((0, fastify_type_provider_zod_1.hasZodFastifySchemaValidationErrors)(error)) {
        reply.status(400).send((0, response_js_1.failure)("VALIDATION_ERROR", "Request validation failed", error.validation.map((issue) => ({
            path: issue.instancePath || issue.params?.issue?.path?.join("."),
            message: issue.message,
        }))));
        return;
    }
    if (error instanceof zod_1.ZodError) {
        reply.status(400).send((0, response_js_1.failure)("VALIDATION_ERROR", "Validation failed", error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))));
        return;
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            reply.status(409).send((0, response_js_1.failure)("CONFLICT", "A record with these values already exists"));
            return;
        }
        if (error.code === "P2025") {
            reply.status(404).send((0, response_js_1.failure)("NOT_FOUND", "Resource not found"));
            return;
        }
        request.log.error(error);
        // The Prisma error code (e.g. P2024 pool timeout, P2021 missing table) is not
        // sensitive and is invaluable for diagnosis, so include it. The full message
        // (which can contain query details) is only exposed outside production.
        reply
            .status(500)
            .send((0, response_js_1.failure)(`DATABASE_ERROR_${error.code}`, env_js_1.isProduction ? "Database operation failed" : `Prisma ${error.code}: ${error.message}`));
        return;
    }
    const statusCode = "statusCode" in error && error.statusCode ? error.statusCode : 500;
    if (statusCode >= 500) {
        request.log.error(error);
        reply
            .status(statusCode)
            .send((0, response_js_1.failure)("INTERNAL_ERROR", env_js_1.env.NODE_ENV === "production" ? "Internal server error" : error.message));
        return;
    }
    reply
        .status(statusCode)
        .send((0, response_js_1.failure)(("code" in error && error.code) || "REQUEST_ERROR", error.message));
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error-handler.js.map