"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditPlugin = exports.staticPlugin = exports.securityPlugin = exports.firebasePlugin = exports.swaggerPlugin = exports.jwtPlugin = exports.redisPlugin = exports.prismaPlugin = void 0;
var prisma_plugin_js_1 = require("./prisma.plugin.js");
Object.defineProperty(exports, "prismaPlugin", { enumerable: true, get: function () { return __importDefault(prisma_plugin_js_1).default; } });
var redis_plugin_js_1 = require("./redis.plugin.js");
Object.defineProperty(exports, "redisPlugin", { enumerable: true, get: function () { return __importDefault(redis_plugin_js_1).default; } });
var jwt_plugin_js_1 = require("./jwt.plugin.js");
Object.defineProperty(exports, "jwtPlugin", { enumerable: true, get: function () { return __importDefault(jwt_plugin_js_1).default; } });
var swagger_plugin_js_1 = require("./swagger.plugin.js");
Object.defineProperty(exports, "swaggerPlugin", { enumerable: true, get: function () { return __importDefault(swagger_plugin_js_1).default; } });
var firebase_plugin_js_1 = require("./firebase.plugin.js");
Object.defineProperty(exports, "firebasePlugin", { enumerable: true, get: function () { return __importDefault(firebase_plugin_js_1).default; } });
var security_plugin_js_1 = require("./security.plugin.js");
Object.defineProperty(exports, "securityPlugin", { enumerable: true, get: function () { return __importDefault(security_plugin_js_1).default; } });
var static_plugin_js_1 = require("./static.plugin.js");
Object.defineProperty(exports, "staticPlugin", { enumerable: true, get: function () { return __importDefault(static_plugin_js_1).default; } });
var audit_plugin_js_1 = require("./audit.plugin.js");
Object.defineProperty(exports, "auditPlugin", { enumerable: true, get: function () { return __importDefault(audit_plugin_js_1).default; } });
//# sourceMappingURL=index.js.map