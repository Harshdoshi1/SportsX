import { iplScraperService } from "./iplScraperService.js";

const CACHE_TTL_MS = 2 * 60 * 1000;
let cacheData = null;
let cacheUntil = 0;
let inFlight = null;

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
    const scraped = await iplScraperService.scrapeMatches();
    const normalized = Array.isArray(scraped) ? scraped.map(normalizeScrapedMatch) : [];
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
        provider: "cricbuzz-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },

  async getUpcomingMatches() {
    const loaded = await loadMatches();
    return {
      data: byStatus(loaded.matches, "upcoming"),
      meta: {
        provider: "cricbuzz-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },

  async getRecentMatches() {
    const loaded = await loadMatches();
    return {
      data: byStatus(loaded.matches, "completed"),
      meta: {
        provider: "cricbuzz-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },

  async getIplMatches() {
    const loaded = await loadMatches();
    return {
      data: loaded.matches,
      meta: {
        provider: "cricbuzz-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },

  async getMatchDetails(matchId) {
    const loaded = await loadMatches();
    const id = String(matchId || "");
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
        provider: "cricbuzz-scraper",
        cacheHit: loaded.cacheHit,
      },
    };
  },
};
