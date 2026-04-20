import { rapidApiService } from "./rapidApiService.js";
import { normalizePlayerList, normalizeTeamList } from "../utils/normalizers.js";

export const teamsService = {
  async getTeams() {
    const [teams, leagueTeams] = await Promise.all([
      rapidApiService.getTeams(),
      rapidApiService.getLeagueTeams(),
    ]);

    const merged = [...normalizeTeamList(teams.data), ...normalizeTeamList(leagueTeams.data)];
    const deduped = Array.from(
      new Map(merged.map((team) => [String(team.id || team.name), team])).values()
    );

    return {
      data: deduped,
      meta: {
        cacheHit: teams.meta.cacheHit && leagueTeams.meta.cacheHit,
      },
    };
  },

  async getPlayersByTeam(teamId, teamName = null) {
    try {
      const response = await rapidApiService.getPlayersByTeam(teamId);

      return {
        data: normalizePlayerList(response.data, teamName),
        meta: {
          provider: "rapidapi",
          ...response.meta,
        },
      };
    } catch (error) {
      const statusCode = error?.statusCode || error?.response?.status || 502;

      // RapidAPI can intermittently fail for some team IDs (notably franchise IDs).
      // Return a safe empty list instead of surfacing a hard 5xx to the frontend.
      if (statusCode >= 500 || statusCode === 404) {
        return {
          data: [],
          meta: {
            provider: "rapidapi",
            cacheHit: false,
            fallback: true,
            fallbackReason: `players-upstream-${statusCode}`,
          },
        };
      }

      throw error;
    }
  },
};
