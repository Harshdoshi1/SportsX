import { supabaseIplSyncService } from "./supabaseIplSyncService.js";
import { crexLiveMatchService } from "./crexLiveMatchService.js";

const CACHE_TTL_MS = 2 * 60 * 1000;
let cacheData = null;
let cacheUntil = 0;
let inFlight = null;

const normalizeCrexLiveMatch = (match) => ({
  id: String(match?.id || "live-match"),
  name: `${match?.team1 || "Team A"} vs ${match?.team2 || "Team B"}`,
  series: match?.series || "Cricket",
  sport: "cricket",
  team1: match?.team1 || null,
  team2: match?.team2 || null,
  score: match?.score || null,
  status: match?.status || "Live",
  venue: match?.venue || null,
  date: match?.date || null,
  startTime: match?.startTime || null,
  result: match?.result || null,
  team1Name: match?.team1Name || match?.team1 || null,
  team2Name: match?.team2Name || match?.team2 || null,
  team1Score: match?.team1Score || null,
  team2Score: match?.team2Score || null,
  team1Overs: match?.team1Overs || null,
  team2Overs: match?.team2Overs || null,
  sourceUrl: match?.sourceUrl || null,
  tournamentId: match?.tournamentId || "icc",
  matchStarted: String(match?.status || "").toLowerCase() === "live",
  matchEnded: String(match?.status || "").toLowerCase() === "completed",
  fetchedAt: match?.fetchedAt || new Date().toISOString(),
  raw: match,
});

const normalizeStatus = (value) => String(value || "Upcoming");

const toSafeIdPart = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "na";

const buildMatchId = (match) =>
  [
    toSafeIdPart(match?.team1),
    toSafeIdPart(match?.team2),
    toSafeIdPart(match?.date),
    toSafeIdPart(match?.venue),
  ].join("_");

const buildScore = (match) => {
  const parts = [match?.team1Score, match?.team2Score].filter(Boolean).map((v) => String(v));
  return parts.length > 0 ? parts.join(" | ") : null;
};

const normalizeScrapedMatch = (match) => ({
  id: buildMatchId(match),
  name: `${match?.team1 || "Team A"} vs ${match?.team2 || "Team B"}`,
  series: "Indian Premier League 2026",
  team1: match?.team1 || null,
  team2: match?.team2 || null,
  score: buildScore(match),
  status: normalizeStatus(match?.status),
  venue: match?.venue || null,
  date: match?.date || null,
  startTime: match?.startTime || null,
  result: match?.result || null,
  matchStarted: String(match?.status || "").toLowerCase() === "live",
  matchEnded: String(match?.status || "").toLowerCase() === "completed",
  raw: match,
});

const loadMatches = async (forceRefresh = false) => {
  if (!forceRefresh && cacheData && cacheUntil > Date.now()) {
    return { matches: cacheData, cacheHit: true };
  }

  if (!forceRefresh && inFlight) {
    const data = await inFlight;
    return { matches: data, cacheHit: true };
  }

  inFlight = (async () => {
    const payload = await supabaseIplSyncService.getMatches(forceRefresh);
    const normalized = Array.isArray(payload) ? payload.map(normalizeScrapedMatch) : [];
    cacheData = normalized;
    cacheUntil = Date.now() + CACHE_TTL_MS;
    return normalized;
  })();

  try {
    const data = await inFlight;
    return { matches: data, cacheHit: false };
  } finally {
    inFlight = null;
  }
};

const byStatus = (matches, expected) =>
  matches.filter((match) => String(match?.status || "").toLowerCase() === expected);

export const matchesService = {
  async getLiveMatches() {
    const loaded = await loadMatches();
    return {
      data: byStatus(loaded.matches, "live"),
      meta: {
        provider: "iplt20-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },

  async getUpcomingMatches() {
    const loaded = await loadMatches();
    return {
      data: byStatus(loaded.matches, "upcoming"),
      meta: {
        provider: "iplt20-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },

  async getRecentMatches() {
    const loaded = await loadMatches();
    return {
      data: byStatus(loaded.matches, "completed"),
      meta: {
        provider: "iplt20-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },

  async getIplMatches() {
    const loaded = await loadMatches();
    return {
      data: loaded.matches,
      meta: {
        provider: "iplt20-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },

  async getIccLiveMatches(options = {}) {
    const forceFresh = Boolean(options?.forceFresh);
    const matches = await crexLiveMatchService.getConfiguredLiveMatches({
      tournamentId: "icc",
      forceFresh,
    });
    const normalized = matches.map(normalizeCrexLiveMatch);

    return {
      data: normalized,
      meta: {
        provider: "crex-live-scraper",
        cacheHit: normalized.every((item) => Boolean(item?.raw?._meta?.cacheHit)),
        fetchedAt: new Date().toISOString(),
        stale: normalized.some((item) => Boolean(item?.raw?._meta?.stale)),
      },
    };
  },

  async getIplLiveMatches(options = {}) {
    const forceFresh = Boolean(options?.forceFresh);
    const matches = await crexLiveMatchService.getConfiguredLiveMatches({
      tournamentId: "ipl",
      forceFresh,
    });
    const normalized = matches.map(normalizeCrexLiveMatch);

    return {
      data: normalized,
      meta: {
        provider: "crex-live-scraper",
        cacheHit: normalized.every((item) => Boolean(item?.raw?._meta?.cacheHit)),
        fetchedAt: new Date().toISOString(),
        stale: normalized.some((item) => Boolean(item?.raw?._meta?.stale)),
      },
    };
  },

  async getMatchDetails(matchId, options = {}) {
    const id = String(matchId || "");
    const forceFresh = Boolean(options?.forceFresh);

    const crexLiveMatch = await crexLiveMatchService.getLiveMatchById(id, { forceFresh });
    if (crexLiveMatch) {
      const normalizedMatch = normalizeCrexLiveMatch(crexLiveMatch);
      return {
        data: {
          match: {
            ...normalizedMatch,
            raw: normalizedMatch?.raw || crexLiveMatch,
          },
          scoreboard: {
            innings: crexLiveMatch?.scoreboard?.innings || [],
            events: crexLiveMatch?.scoreboard?.events || crexLiveMatch?.scoreboard?.commentary || [],
            commentary: crexLiveMatch?.scoreboard?.commentary || [],
            batters: crexLiveMatch?.scoreboard?.batters || [],
            bowlers: crexLiveMatch?.scoreboard?.bowlers || [],
            liveStats: crexLiveMatch?.scoreboard?.liveStats || {},
          },
        },
        meta: {
          provider: "crex-live-scraper",
          cacheHit: Boolean(crexLiveMatch?._meta?.cacheHit),
          fetchedAt: new Date().toISOString(),
          stale: Boolean(crexLiveMatch?._meta?.stale),
        },
      };
    }

    const loaded = await loadMatches();
    const match = loaded.matches.find((item) => String(item.id) === id) || null;

    return {
      data: {
        match,
        scoreboard: {
          innings: [],
          commentary: [],
        },
      },
      meta: {
        provider: "iplt20-scraper",
        cacheHit: loaded.cacheHit,
        fetchedAt: new Date().toISOString(),
      },
    };
  },

  async getMatchDetailsByUrl(sourceUrl, options = {}) {
    const url = String(sourceUrl || "").trim();
    if (!url) {
      return {
        data: { match: null, scoreboard: { innings: [], events: [], commentary: [], batters: [], bowlers: [], liveStats: {} } },
        meta: { provider: "crex-live-scraper", cacheHit: true, fetchedAt: new Date().toISOString(), stale: false },
      };
    }

    const forceFresh = Boolean(options?.forceFresh);
    const tournamentId = String(options?.tournamentId || "admin").toLowerCase();
    const series = String(options?.series || "Admin Live Feed");

    const crexLiveMatch = await crexLiveMatchService.getLiveMatchByUrl(url, { forceFresh, tournamentId, series });
    if (!crexLiveMatch) {
      return {
        data: { match: null, scoreboard: { innings: [], events: [], commentary: [], batters: [], bowlers: [], liveStats: {} } },
        meta: { provider: "crex-live-scraper", cacheHit: true, fetchedAt: new Date().toISOString(), stale: false },
      };
    }

    const normalizedMatch = normalizeCrexLiveMatch(crexLiveMatch);
    return {
      data: {
        match: {
          ...normalizedMatch,
          sourceUrl: url,
          raw: normalizedMatch?.raw || crexLiveMatch,
        },
        scoreboard: {
          innings: crexLiveMatch?.scoreboard?.innings || [],
          events: crexLiveMatch?.scoreboard?.events || crexLiveMatch?.scoreboard?.commentary || [],
          commentary: crexLiveMatch?.scoreboard?.commentary || [],
          batters: crexLiveMatch?.scoreboard?.batters || [],
          bowlers: crexLiveMatch?.scoreboard?.bowlers || [],
          liveStats: crexLiveMatch?.scoreboard?.liveStats || {},
        },
      },
      meta: {
        provider: "crex-live-scraper",
        cacheHit: Boolean(crexLiveMatch?._meta?.cacheHit),
        fetchedAt: new Date().toISOString(),
        stale: Boolean(crexLiveMatch?._meta?.stale),
      },
    };
  },
};
