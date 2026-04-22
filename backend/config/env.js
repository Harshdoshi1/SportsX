import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const rootDir = process.cwd();

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  providerMode: process.env.PROVIDER_MODE || "scraper",
  cricApiBaseUrl: process.env.CRIC_API_BASE_URL || "https://api.cricapi.com/v1",
  cricApiKey: process.env.CRIC_API_KEY || "",
  cricApiTimeoutMs: Number(process.env.CRIC_API_TIMEOUT_MS || 15000),
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
  supabaseUrl:
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseAllowPublishableWrites:
    String(process.env.SUPABASE_ALLOW_PUBLISHABLE_WRITES || "false").toLowerCase() === "true",
  syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS || 300000),
  teamSyncIntervalMs: Number(process.env.TEAM_SYNC_INTERVAL_MS || 300000),
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS || 86400000),
  iplSeasonYear: Number(process.env.IPL_SEASON_YEAR || 2026),
};

export const assertRequiredEnv = () => {
  // Scraper-first backend does not require third-party API keys at startup.
  return true;
};
