import { matchesService } from "../services/matchesService.js";
import { paginate } from "../utils/pagination.js";
import { ok } from "../utils/response.js";

const parsePage = (query) => query.page || 1;
const parseLimit = (query) => query.limit || 20;
const parseFresh = (query) => {
  const value = String(query?.fresh || "").toLowerCase();
  return value === "1" || value === "true";
};

export const matchesController = {
  async getLive(req, res, next) {
    try {
      const result = await matchesService.getLiveMatches();
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { matches: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getUpcoming(req, res, next) {
    try {
      const result = await matchesService.getUpcomingMatches();
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { matches: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getRecent(req, res, next) {
    try {
      const result = await matchesService.getRecentMatches();
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { matches: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getIpl(req, res, next) {
    try {
      const result = await matchesService.getIplMatches();
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { matches: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getIccLive(req, res, next) {
    try {
      const result = await matchesService.getIccLiveMatches({ forceFresh: parseFresh(req.query) });
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { matches: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getIplLive(req, res, next) {
    try {
      const result = await matchesService.getIplLiveMatches({ forceFresh: parseFresh(req.query) });
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { matches: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getMatchDetails(req, res, next) {
    try {
      const forceFresh = parseFresh(req.query);
      const result = await matchesService.getMatchDetails(req.params.id, { forceFresh });
      ok(res, { match: result.data.match, scoreboard: result.data.scoreboard }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getMatchDetailsByUrl(req, res, next) {
    try {
      const forceFresh = parseFresh(req.query);
      const url = String(req.query?.url || "").trim();
      const tournamentId = String(req.query?.tournamentId || "admin").toLowerCase();
      const series = String(req.query?.series || "Admin Live Feed");
      const result = await matchesService.getMatchDetailsByUrl(url, { forceFresh, tournamentId, series });
      ok(res, { match: result.data.match, scoreboard: result.data.scoreboard }, result.meta);
    } catch (error) {
      next(error);
    }
  },
};
