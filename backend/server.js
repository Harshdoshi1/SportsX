import dotenv from "dotenv";

dotenv.config();

import { app } from "./app.js";
import { assertRequiredEnv, env } from "./config/env.js";

const start = async () => {
  try {
    assertRequiredEnv();

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
