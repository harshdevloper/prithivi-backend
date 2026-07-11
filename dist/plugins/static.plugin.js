"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const static_1 = __importDefault(require("@fastify/static"));
const env_js_1 = require("../config/env.js");
const constants_js_1 = require("../config/constants.js");
/**
 * Serves locally stored uploads at /uploads/* — the fallback storage when
 * Cloudinary is not configured. In production nginx should serve this
 * directory directly for performance; this plugin keeps the URL working
 * either way.
 */
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const root = node_path_1.default.resolve(process.cwd(), env_js_1.env.UPLOADS_DIR);
    (0, node_fs_1.mkdirSync)(root, { recursive: true });
    await app.register(static_1.default, {
        root,
        prefix: `${constants_js_1.UPLOADS.PUBLIC_PREFIX}/`,
        decorateReply: false,
        index: false,
        list: false,
        maxAge: "7d",
    });
});
//# sourceMappingURL=static.plugin.js.map