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
    const response = await rapidApiService.getPlayersByTeam(teamId);

    return {
      data: normalizePlayerList(response.data, teamName),
      meta: response.meta,
    };
  },
};
