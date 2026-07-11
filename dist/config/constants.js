"use strict";
/** Centralized application constants — single source of truth for magic values. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEADERS = exports.AUDIT = exports.UPLOADS = exports.PAGINATION = exports.QUEUES = exports.ROLES = void 0;
exports.ROLES = {
    USER: "USER",
    ADMIN: "ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
};
exports.QUEUES = {
    NOTIFICATIONS: "notifications",
    ANALYTICS: "analytics",
    AUDIT: "audit",
};
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
exports.UPLOADS = {
    ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    PUBLIC_PREFIX: "/uploads",
    CLOUDINARY_FOLDER: "rewardhub",
};
exports.AUDIT = {
    /** Only mutating verbs are audited. */
    METHODS: ["POST", "PATCH", "PUT", "DELETE"],
    /** Paths that must never land in the audit log (sensitive payloads). */
    EXCLUDED_PATH_FRAGMENTS: ["/auth/"],
};
exports.HEADERS = {
    REQUEST_ID: "x-request-id",
};
//# sourceMappingURL=constants.js.map