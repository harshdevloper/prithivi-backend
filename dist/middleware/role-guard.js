"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminOnly = exports.adminOnly = exports.requireRoles = void 0;
const errors_js_1 = require("../common/errors.js");
/** Must run after authGuard. Allows only the given roles. */
const requireRoles = (...roles) => {
    return async (request, _reply) => {
        if (!request.user) {
            throw new errors_js_1.UnauthorizedError();
        }
        if (!roles.includes(request.user.role)) {
            throw new errors_js_1.ForbiddenError("Insufficient permissions");
        }
    };
};
exports.requireRoles = requireRoles;
exports.adminOnly = (0, exports.requireRoles)("ADMIN", "SUPER_ADMIN");
exports.superAdminOnly = (0, exports.requireRoles)("SUPER_ADMIN");
//# sourceMappingURL=role-guard.js.map