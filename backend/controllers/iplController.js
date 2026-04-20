import { iplScraperService } from "../services/iplScraperService.js";
import { ok } from "../utils/response.js";

export const iplController = {
  async getPoints(_req, res, next) {
    try {
      const points = await iplScraperService.scrapePointsTable();
      ok(
        res,
        {
          points,
        },
        {
          source: "cricbuzz-scraper",
          scrapedAt: new Date().toISOString(),
          count: points.length,
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getMatches(_req, res, next) {
    try {
      const matches = await iplScraperService.scrapeMatches();
      ok(
        res,
        {
          matches,
        },
        {
          source: "cricbuzz-scraper",
          scrapedAt: new Date().toISOString(),
          count: matches.length,
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getStats(_req, res, next) {
    try {
      const stats = await iplScraperService.scrapeStats();
      ok(
        res,
        {
          stats,
        },
        {
          source: "cricbuzz-scraper",
          scrapedAt: new Date().toISOString(),
          count: stats?.leaders?.length || 0,
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getSquads(_req, res, next) {
    try {
      const squads = await iplScraperService.scrapeSquads();
      ok(
        res,
        {
          squads,
        },
        {
          source: "cricbuzz-scraper",
          scrapedAt: new Date().toISOString(),
          count: squads?.players?.length || 0,
        },
      );
    } catch (error) {
      next(error);
    }
  },

  async getNews(_req, res, next) {
    try {
      const news = await iplScraperService.scrapeNews();
      ok(
        res,
        {
          news,
        },
        {
          source: "cricbuzz-scraper",
          scrapedAt: new Date().toISOString(),
          count: news.length,
        },
      );
    } catch (error) {
      next(error);
    }
  },
};
