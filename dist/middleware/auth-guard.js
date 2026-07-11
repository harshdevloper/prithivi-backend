"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authGuard = void 0;
const errors_js_1 = require("../common/errors.js");
/** Requires a valid access token; populates request.user. */
const authGuard = async (request, _reply) => {
    try {
        await request.jwtVerify();
    }
    catch {
        throw new errors_js_1.UnauthorizedError("Invalid or missing authentication token");
    }
};
exports.authGuard = authGuard;
/** Verifies the token if present, but allows anonymous requests through. */
const optionalAuth = async (request) => {
    try {
        await request.jwtVerify();
    }
    catch {
        // anonymous request — request.user stays undefined
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth-guard.js.map