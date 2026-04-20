import { iplScraperService } from "./iplScraperService.js";

const buildIplSeries = (pointsRows) => {
  const season = String(new Date().getFullYear());
  const hasPoints = Array.isArray(pointsRows) && pointsRows.length > 0;

  return {
    id: `ipl-${season}`,
    name: `Indian Premier League ${season}`,
    startDate: null,
    endDate: null,
    category: "league",
    source: "cricbuzz-scraper",
    teamsCount: hasPoints ? pointsRows.length : 10,
  };
};

export const seriesService = {
  async getAllSeries() {
    const points = await iplScraperService.scrapePointsTable();
    return {
      data: [buildIplSeries(points)],
      meta: {
        provider: "cricbuzz-scraper",
      },
    };
  },

  async getLeagueSeries() {
    const points = await iplScraperService.scrapePointsTable();
    return {
      data: [buildIplSeries(points)],
      meta: {
        provider: "cricbuzz-scraper",
      },
    };
  },

  async getIplSeries() {
    const points = await iplScraperService.scrapePointsTable();

    return {
      data: [buildIplSeries(points)],
      meta: {
        provider: "cricbuzz-scraper",
      },
    };
  },
};
