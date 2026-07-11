"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerConfig = void 0;
const env_js_1 = require("./env.js");
exports.loggerConfig = {
    level: env_js_1.env.LOG_LEVEL,
    transport: env_js_1.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
            },
        }
        : undefined,
};
//# sourceMappingURL=logger.js.map