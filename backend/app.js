import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";

import apiRoutes from "./routes/index.js";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./utils/response.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.use(env.teamImageBaseUrl, express.static(env.teamImageDir));
app.use(env.playerImageBaseUrl, express.static(env.playerImageDir));
app.use("/assets", express.static(path.join(process.cwd(), "public", "assets")));

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);
