"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const index_js_1 = require("./workers/index.js");
const start = async () => {
    const app = await (0, app_js_1.buildApp)();
    const workers = (0, index_js_1.startWorkers)(app);
    const shutdown = async (signal) => {
        app.log.info({ signal }, "shutting down");
        try {
            await Promise.all(workers.map((worker) => worker.close()));
            await app.close();
            process.exit(0);
        }
        catch (error) {
            app.log.error(error);
            process.exit(1);
        }
    };
    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    try {
        await app.listen({ port: env_js_1.env.PORT, host: env_js_1.env.HOST });
        app.log.info(`Swagger docs available at http://localhost:${env_js_1.env.PORT}${env_js_1.env.SWAGGER_ROUTE}`);
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};
void start();
//# sourceMappingURL=server.js.map