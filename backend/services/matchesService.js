import { env } from "../config/env.js";
import { cricApiService } from "./cricApiService.js";
import { rapidApiService } from "./rapidApiService.js";
import { isIplText, normalizeMatch, normalizeMatchList } from "../utils/normalizers.js";

const filterIplMatches = (matches) =>
  matches.filter((match) =>
    isIplText([match.series, match.name, match.status, match.team1, match.team2].join(" "))
  );

const asTimeMs = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }

  const asDate = Date.parse(String(value));
  return Number.isFinite(asDate) ? asDate : null;
};

const isUpcomingMatch = (match) => {
  if (match?.matchStarted === false) {
    return true;
  }

  const startTime = asTimeMs(match?.date);
  if (!startTime) {
    return false;
  }

  return startTime > Date.now();
};

const isRecentMatch = (match) => {
  if (match?.matchEnded === true) {
    return true;
  }

  const statusText = String(match?.status || "").toLowerCase();
  if (/(won|result|completed|ended|no result|draw|stumps)/.test(statusText)) {
    return true;
  }

  const startTime = asTimeMs(match?.date);
  if (!startTime) {
    return false;
  }

  return startTime < Date.now();
};

const shouldTryCricApi = () => {
  const mode = String(env.providerMode || "hybrid").toLowerCase();
  return mode === "cricapi" || mode === "hybrid";
};

const shouldTryRapidApi = () => {
  const mode = String(env.providerMode || "hybrid").toLowerCase();
  return mode === "rapidapi" || mode === "hybrid";
};

const responseMeta = (provider, meta, extras = {}) => ({
  provider,
  cacheHit: meta?.cacheHit || false,
  fallback: meta?.fallback || false,
  ...extras,
});

const getLiveFromCricApi = async () => {
  const response = await cricApiService.getCurrentMatches();
  const normalized = normalizeMatchList(response.data);
  return {
    data: normalized,
    meta: responseMeta("cricapi", response.meta),
  };
};

const getUpcomingFromCricApi = async () => {
  const response = await cricApiService.getAllMatches();
  const normalized = normalizeMatchList(response.data).filter(isUpcomingMatch);
  return {
    data: normalized,
    meta: responseMeta("cricapi", response.meta),
  };
};

const getRecentFromCricApi = async () => {
  const response = await cricApiService.getAllMatches();
  const normalized = normalizeMatchList(response.data).filter(isRecentMatch);
  return {
    data: normalized,
    meta: responseMeta("cricapi", response.meta),
  };
};

const getLiveFromRapidApi = async () => {
  const response = await rapidApiService.getLiveMatches();
  return {
    data: normalizeMatchList(response.data),
    meta: responseMeta("rapidapi", response.meta),
  };
};

const getUpcomingFromRapidApi = async () => {
  const response = await rapidApiService.getUpcomingMatches();
  return {
    data: normalizeMatchList(response.data),
    meta: responseMeta("rapidapi", response.meta),
  };
};

const getRecentFromRapidApi = async () => {
  const response = await rapidApiService.getRecentMatches();
  return {
    data: normalizeMatchList(response.data),
    meta: responseMeta("rapidapi", response.meta),
  };
};

const getPreferredMatches = async (cricFetcher, rapidFetcher) => {
  let cricError = null;

  if (shouldTryCricApi()) {
    try {
      const cricResult = await cricFetcher();
      if (cricResult.data.length > 0) {
        return cricResult;
      }

      if (!shouldTryRapidApi()) {
        return {
          data: [],
          meta: {
            ...cricResult.meta,
            fallbackReason: "cricapi-empty",
          },
        };
      }
    } catch (error) {
      cricError = error;
      if (!shouldTryRapidApi()) {
        throw error;
      }
    }
  }

  if (!shouldTryRapidApi()) {
    return {
      data: [],
      meta: {
        provider: "none",
        cacheHit: false,
      },
    };
  }

  const rapidResult = await rapidFetcher();
  return {
    ...rapidResult,
    meta: {
      ...rapidResult.meta,
      fallbackReason: cricError ? "cricapi-error" : "cricapi-empty",
    },
  };
};

export const matchesService = {
  async getLiveMatches() {
    return getPreferredMatches(getLiveFromCricApi, getLiveFromRapidApi);
  },

  async getUpcomingMatches() {
    return getPreferredMatches(getUpcomingFromCricApi, getUpcomingFromRapidApi);
  },

  async getRecentMatches() {
    return getPreferredMatches(getRecentFromCricApi, getRecentFromRapidApi);
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
