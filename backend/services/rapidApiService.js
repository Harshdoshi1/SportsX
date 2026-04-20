import { env } from "../config/env.js";
import { rapidApiClient } from "../config/rapidApiClient.js";
import { getOrSetCache } from "../utils/cache.js";
import { retry } from "../utils/retry.js";

const buildCacheKey = (path, params) => {
  const sortedParams = Object.entries(params || {})
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `rapidapi:${path}?${sortedParams}`;
};

const mapUpstreamError = (error) => {
  const upstreamStatus = error?.response?.status;

  if (upstreamStatus === 429) {
    const rateLimitError = new Error(
      "RapidAPI rate limit reached. Please retry in a minute.",
    );
    rateLimitError.statusCode = 429;
    return rateLimitError;
  }

  if (upstreamStatus === 401 || upstreamStatus === 403) {
    const authError = new Error(
      "RapidAPI authentication failed. Verify RAPID_API_KEY and subscription plan.",
    );
    authError.statusCode = upstreamStatus;
    return authError;
  }

  const genericError = new Error(error?.message || "Failed to fetch upstream cricket data.");
  genericError.statusCode = upstreamStatus || 502;
  return genericError;
};

const request = async (path, params = {}) => {
  if (!env.rapidApiKey || env.rapidApiKey === "replace_with_your_rapidapi_key") {
    const configError = new Error(
      "RAPID_API_KEY is not configured. Add it in .env to enable live cricket data.",
    );
    configError.statusCode = 503;
    throw configError;
  }

  const cacheKey = buildCacheKey(path, params);

  try {
    return await getOrSetCache(
      cacheKey,
      async () => {
        const response = await retry(
          () => rapidApiClient.get(path, { params }),
          {
            retries: env.retryCount,
            baseDelayMs: env.retryDelayMs,
          }
        );

        return response.data;
      },
      env.cacheTtlSeconds
    );
  } catch (error) {
    throw mapUpstreamError(error);
  }
};

const requestWithFallback = async (paths, params = {}) => {
  let lastError;

  for (const path of paths) {
    try {
      return await request(path, params);
    } catch (error) {
      lastError = error;

      const statusCode = error?.statusCode || error?.response?.status;
      // On auth/rate-limit, avoid burning more calls on fallback endpoints.
      if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const rapidApiService = {
  getLiveMatches: () => requestWithFallback(["/cricket-livescores", "/cricket-matches-live"]),
  getUpcomingMatches: () =>
    requestWithFallback(["/cricket-schedule", "/cricket-schedule-all", "/cricket-matches-upcoming"]),
  getRecentMatches: () => requestWithFallback(["/cricket-matches-recent", "/cricket-schedule-all"]),
  getMatchInfo: (matchId) =>
    requestWithFallback(["/cricket-match-info"], { matchid: matchId }),
  getMatchScoreboard: (matchId) =>
    requestWithFallback(["/cricket-match-scoreboard"], { matchid: matchId }),
  getSeries: () => requestWithFallback(["/cricket-series", "/cricket-series-international"]),
  getLeagueSeries: () => requestWithFallback(["/cricket-series-leagues", "/cricket-series"]),
  getTeams: () => requestWithFallback(["/cricket-teams", "/cricket-teams-domestic"]),
  getLeagueTeams: () => requestWithFallback(["/cricket-teams-league", "/cricket-teams"]),
  getPlayersByTeam: (teamId) => request("/cricket-players", { teamid: teamId }),
};
