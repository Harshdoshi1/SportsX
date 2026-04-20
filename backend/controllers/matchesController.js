import { matchesService } from "../services/matchesService.js";
import { paginate } from "../utils/pagination.js";
import { ok } from "../utils/response.js";

const parsePage = (query) => query.page || 1;
const parseLimit = (query) => query.limit || 20;

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

  async getMatchDetails(req, res, next) {
    try {
      const result = await matchesService.getMatchDetails(req.params.id);
      ok(res, { match: result.data.match, scoreboard: result.data.scoreboard }, result.meta);
    } catch (error) {
      next(error);
    }
  },
};
