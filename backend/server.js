import dotenv from "dotenv";

dotenv.config();

import { app } from "./app.js";
import { assertRequiredEnv, env } from "./config/env.js";

const start = async () => {
  try {
    try {
      assertRequiredEnv();
    } catch (configError) {
      // eslint-disable-next-line no-console
      console.warn(
        "Backend started without RAPID_API_KEY. API endpoints will fail until the key is configured.",
      );
    }

    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Cricket backend is running on port ${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend", error);
    process.exit(1);
  }
};

start();
