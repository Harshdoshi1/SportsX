import path from "node:path";

const rootDir = process.cwd();

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  rapidApiBaseUrl:
    process.env.RAPID_API_BASE_URL || "https://cricket-api-free-data.p.rapidapi.com",
  rapidApiHost:
    process.env.RAPID_API_HOST || "cricket-api-free-data.p.rapidapi.com",
  rapidApiKey: process.env.RAPID_API_KEY || "",
  rapidApiTimeoutMs: Number(process.env.RAPID_API_TIMEOUT_MS || 15000),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 600),
  cacheCheckPeriodSeconds: Number(process.env.CACHE_CHECK_PERIOD_SECONDS || 120),
  retryCount: Number(process.env.RETRY_COUNT || 2),
  retryDelayMs: Number(process.env.RETRY_DELAY_MS || 400),
  teamImageDir: process.env.TEAM_IMAGE_DIR || path.join(rootDir, "public", "assets", "teams"),
  teamImageBaseUrl: process.env.TEAM_IMAGE_BASE_URL || "/assets/teams",
  playerImageDir:
    process.env.PLAYER_IMAGE_DIR || path.join(rootDir, "public", "assets", "players"),
  playerImageBaseUrl: process.env.PLAYER_IMAGE_BASE_URL || "/assets/players",
};

export const assertRequiredEnv = () => {
  if (!env.rapidApiKey) {
    throw new Error("Missing RAPID_API_KEY in environment");
  }
};
