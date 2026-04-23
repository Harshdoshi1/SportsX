import { supabaseIplSyncService } from "../services/supabaseIplSyncService.js";
import { ok } from "../utils/response.js";

const IPL_ENDPOINT_TTL_MS = 90 * 1000;

const endpointCache = {
  points: { data: null, meta: null, updatedAt: 0, pending: null },
  matches: { data: null, meta: null, updatedAt: 0, pending: null },
  stats: { data: null, meta: null, updatedAt: 0, pending: null },
  squads: { data: null, meta: null, updatedAt: 0, pending: null },
  news: { data: null, meta: null, updatedAt: 0, pending: null },
};

const setNoStore = (res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
};

const shouldUseCached = (entry, forceFresh) => {
  if (forceFresh) {
    return false;
  }
  if (entry.data === null || entry.updatedAt <= 0) {
    return false;
  }
  return Date.now() - entry.updatedAt < IPL_ENDPOINT_TTL_MS;
};

const resolveEndpoint = async (key, forceFresh, fetcher, metaFactory) => {
  const entry = endpointCache[key];

  if (shouldUseCached(entry, forceFresh)) {
    return {
      data: entry.data,
      meta: entry.meta,
      cached: true,
    };
  }

  if (entry.pending) {
    return entry.pending;
  }

  entry.pending = (async () => {
    const data = await fetcher();
    const meta = {
      ...metaFactory(data),
      scrapedAt: new Date().toISOString(),
    };

    entry.data = data;
    entry.meta = meta;
    entry.updatedAt = Date.now();

    return {
      data,
      meta,
      cached: false,
    };
  })();

  try {
    return await entry.pending;
  } finally {
    entry.pending = null;
  }
};

export const iplController = {
  async getPoints(req, res, next) {
    try {
      setNoStore(res);
      const forceFresh = String(req.query?.fresh || "") === "1";
      const result = await resolveEndpoint(
        "points",
        forceFresh,
        () => supabaseIplSyncService.getPoints(forceFresh),
        (points) => ({ source: "cricbuzz-scraper", count: points.length }),
      );
      ok(
        res,
        {
          points: result.data,
        },
        {
          ...result.meta,
          cached: result.cached,
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getMatches(req, res, next) {
    try {
      setNoStore(res);
      const forceFresh = String(req.query?.fresh || "") === "1";
      const result = await resolveEndpoint(
        "matches",
        forceFresh,
        () => supabaseIplSyncService.getMatches(forceFresh),
        (matches) => ({ source: "iplt20-scraper", count: matches.length }),
      );
      ok(
        res,
        {
          matches: result.data,
        },
        {
          ...result.meta,
          cached: result.cached,
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getStats(req, res, next) {
    try {
      setNoStore(res);
      const forceFresh = String(req.query?.fresh || "") === "1";
      const result = await resolveEndpoint(
        "stats",
        forceFresh,
        () => supabaseIplSyncService.getStats(forceFresh),
        (stats) => ({ source: "cricbuzz-scraper", count: stats?.leaders?.length || 0 }),
      );
      ok(
        res,
        {
          stats: result.data,
        },
        {
          ...result.meta,
          cached: result.cached,
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getSquads(req, res, next) {
    try {
      setNoStore(res);
      const forceFresh = String(req.query?.fresh || "") === "1";
      const result = await resolveEndpoint(
        "squads",
        forceFresh,
        () => supabaseIplSyncService.getSquads(forceFresh),
        (squads) => ({ source: "cricbuzz-scraper", count: squads?.players?.length || 0 }),
      );
      ok(
        res,
        {
          squads: result.data,
        },
        {
          ...result.meta,
          cached: result.cached,
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getNews(req, res, next) {
    try {
      setNoStore(res);
      const forceFresh = String(req.query?.fresh || "") === "1";
      const result = await resolveEndpoint(
        "news",
        forceFresh,
        () => supabaseIplSyncService.getNews(forceFresh),
        (news) => ({ source: "cricbuzz-scraper", count: news.length }),
      );
      ok(
        res,
        {
          news: result.data,
        },
        {
          ...result.meta,
          cached: result.cached,
        },
      );
    } catch (error) {
      next(error);
    }
  },
};
