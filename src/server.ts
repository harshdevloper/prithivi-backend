import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { startWorkers } from "./workers/index.js";

const start = async (): Promise<void> => {
  const app = await buildApp();
  const workers = startWorkers(app);

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "shutting down");
    try {
      await Promise.all(workers.map((worker) => worker.close()));
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Swagger docs available at http://localhost:${env.PORT}${env.SWAGGER_ROUTE}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
