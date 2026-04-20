import dotenv from "dotenv";
import http from "node:http";

dotenv.config();

import { app } from "./app.js";
import { assertRequiredEnv, env } from "./config/env.js";
import { playerProfileScheduler } from "./services/playerProfileScheduler.js";

const checkExistingServer = async () =>
  new Promise((resolve) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port: env.port,
        path: "/api/health",
        timeout: 2000,
      },
      (res) => {
        resolve(res.statusCode === 200);
      },
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });

const start = async () => {
  try {
    try {
      assertRequiredEnv();
    } catch (configError) {
      // eslint-disable-next-line no-console
      console.warn("Backend configuration warning:", configError?.message || configError);
    }

    const server = app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Cricket backend is running on port ${env.port}`);
      playerProfileScheduler.start();
    });

    server.on("error", async (listenError) => {
      if (listenError?.code === "EADDRINUSE") {
        const isHealthy = await checkExistingServer();
        if (isHealthy) {
          // eslint-disable-next-line no-console
          console.log(`Backend already running on port ${env.port}`);
          process.exit(0);
          return;
        }
      }

      // eslint-disable-next-line no-console
      console.error("Failed to start backend", listenError);
      process.exit(1);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend", error);
    process.exit(1);
  }
};

start();
