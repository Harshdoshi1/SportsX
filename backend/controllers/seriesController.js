import { seriesService } from "../services/seriesService.js";
import { paginate } from "../utils/pagination.js";
import { ok } from "../utils/response.js";

const parsePage = (query) => query.page || 1;
const parseLimit = (query) => query.limit || 20;

export const seriesController = {
  async getAll(req, res, next) {
    try {
      const result = await seriesService.getAllSeries();
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { series: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getLeagues(req, res, next) {
    try {
      const result = await seriesService.getLeagueSeries();
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { series: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getIpl(req, res, next) {
    try {
      const result = await seriesService.getIplSeries();
      const paginated = paginate(result.data, parsePage(req.query), parseLimit(req.query));
      ok(res, { series: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },
};
