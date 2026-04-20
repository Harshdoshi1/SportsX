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
};
