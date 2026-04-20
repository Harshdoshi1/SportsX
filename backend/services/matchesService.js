import { rapidApiService } from "./rapidApiService.js";
import { isIplText, normalizeMatch, normalizeMatchList } from "../utils/normalizers.js";

const filterIplMatches = (matches) =>
  matches.filter((match) =>
    isIplText([match.series, match.name, match.status, match.team1, match.team2].join(" "))
  );

export const matchesService = {
  async getLiveMatches() {
    const response = await rapidApiService.getLiveMatches();
    return {
      data: normalizeMatchList(response.data),
      meta: response.meta,
    };
  },

  async getUpcomingMatches() {
    const response = await rapidApiService.getUpcomingMatches();
    return {
      data: normalizeMatchList(response.data),
      meta: response.meta,
    };
  },

  async getRecentMatches() {
    const response = await rapidApiService.getRecentMatches();
    return {
      data: normalizeMatchList(response.data),
      meta: response.meta,
    };
  },

  async getIplMatches() {
    const [live, upcoming, recent] = await Promise.all([
      rapidApiService.getLiveMatches(),
      rapidApiService.getUpcomingMatches(),
      rapidApiService.getRecentMatches(),
    ]);

    const all = [...normalizeMatchList(live.data), ...normalizeMatchList(upcoming.data), ...normalizeMatchList(recent.data)];

    const dedupedById = Array.from(
      new Map(all.map((match) => [String(match.id || `${match.team1}-${match.team2}-${match.date}`), match])).values()
    );

    return {
      data: filterIplMatches(dedupedById),
      meta: {
        cacheHit: live.meta.cacheHit && upcoming.meta.cacheHit && recent.meta.cacheHit,
        sourceGroups: ["live", "upcoming", "recent"],
      },
    };
  },

  async getMatchDetails(matchId) {
    const [info, scoreboard] = await Promise.all([
      rapidApiService.getMatchInfo(matchId),
      rapidApiService.getMatchScoreboard(matchId),
    ]);

    return {
      data: {
        match: normalizeMatch(info.data),
        scoreboard: scoreboard.data,
      },
      meta: {
        cacheHit: info.meta.cacheHit && scoreboard.meta.cacheHit,
      },
    };
  },
};
