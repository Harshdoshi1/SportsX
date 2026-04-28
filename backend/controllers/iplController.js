import { supabaseIplSyncService } from "../services/supabaseIplSyncService.js";
import { ok } from "../utils/response.js";

const IPL_ENDPOINT_TTL_MS = 90 * 1000;
const IPL_BACKGROUND_REFRESH_THRESHOLD_MS = 70 * 1000;

const endpointCache = {
  points: { data: null, meta: null, updatedAt: 0, pending: null },
  matches: { data: null, meta: null, updatedAt: 0, pending: null },
  stats: { data: null, meta: null, updatedAt: 0, pending: null },
  squads: { data: null, meta: null, updatedAt: 0, pending: null },
  news: { data: null, meta: null, updatedAt: 0, pending: null },
  refreshing: new Set(),
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

const shouldRefreshInBackground = (entry) => {
  if (entry.data === null || entry.updatedAt <= 0) {
    return false;
  }
  return Date.now() - entry.updatedAt >= IPL_BACKGROUND_REFRESH_THRESHOLD_MS;
};

const resolveEndpoint = async (key, forceFresh, fetcher, metaFactory) => {
  const entry = endpointCache[key];
  const isSlowEndpoint = key === "stats" || key === "squads" || key === "news";

  if (shouldUseCached(entry, forceFresh)) {
    if (isSlowEndpoint && shouldRefreshInBackground(entry) && !endpointCache.refreshing.has(key)) {
      endpointCache.refreshing.add(key);
      fetcher()
        .then((data) => {
          entry.data = data;
          entry.meta = { ...metaFactory(data), scrapedAt: new Date().toISOString() };
          entry.updatedAt = Date.now();
        })
        .catch(() => {})
        .finally(() => endpointCache.refreshing.delete(key));
    }
    return {
      data: entry.data,
      meta: entry.meta,
      cached: true,
    };
  }

  if (isSlowEndpoint && entry.data && !forceFresh) {
    if (!endpointCache.refreshing.has(key)) {
      endpointCache.refreshing.add(key);
      fetcher()
        .then((data) => {
          entry.data = data;
          entry.meta = { ...metaFactory(data), scrapedAt: new Date().toISOString() };
          entry.updatedAt = Date.now();
        })
        .catch(() => {})
        .finally(() => endpointCache.refreshing.delete(key));
    }
    return {
      data: entry.data,
      meta: entry.meta,
      cached: true,
      stale: true,
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
  async getPointsQuick(req, res, next) {
    try {
      setNoStore(res);
      const result = await resolveEndpoint(
        "points",
        false,
        () => supabaseIplSyncService.getPoints(false),
        (points) => ({ source: "supabase-cache", count: points.length }),
      );
      ok(
        res,
        {
          points: result.data,
        },
        {
          ...result.meta,
          cached: result.cached,
          mode: "quick",
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getMatchesQuick(req, res, next) {
    try {
      setNoStore(res);
      const result = await resolveEndpoint(
        "matches",
        false,
        () => supabaseIplSyncService.getMatches(false),
        (matches) => ({ source: "supabase-cache", count: matches.length }),
      );
      ok(
        res,
        {
          matches: result.data,
        },
        {
          ...result.meta,
          cached: result.cached,
          mode: "quick",
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getStatsQuick(req, res, next) {
    try {
      setNoStore(res);
      const result = await resolveEndpoint(
        "stats",
        false,
        () => supabaseIplSyncService.getStats(false),
        (stats) => ({ source: "supabase-cache", count: stats?.leaders?.length || 0 }),
      );
      ok(
        res,
        {
          stats: result.data,
        },
        {
          ...result.meta,
          cached: result.cached,
          mode: "quick",
          stale: result.stale || false,
        },
      );
    } catch (error) {
      next(error);
    }
  },

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
