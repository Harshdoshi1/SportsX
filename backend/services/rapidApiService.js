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

const request = async (path, params = {}) => {
  const cacheKey = buildCacheKey(path, params);

  return getOrSetCache(
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
};

export const rapidApiService = {
  getLiveMatches: () => request("/cricket-matches-live"),
  getUpcomingMatches: () => request("/cricket-matches-upcoming"),
  getRecentMatches: () => request("/cricket-matches-recent"),
  getMatchInfo: (matchId) => request("/cricket-match-info", { matchid: matchId }),
  getMatchScoreboard: (matchId) => request("/cricket-match-scoreboard", { matchid: matchId }),
  getSeries: () => request("/cricket-series"),
  getLeagueSeries: () => request("/cricket-series-leagues"),
  getTeams: () => request("/cricket-teams"),
  getLeagueTeams: () => request("/cricket-teams-league"),
  getPlayersByTeam: (teamId) => request("/cricket-players", { teamid: teamId }),
};
