import { rapidApiService } from "./rapidApiService.js";
import { isIplText, normalizeSeriesList } from "../utils/normalizers.js";

export const seriesService = {
  async getAllSeries() {
    const response = await rapidApiService.getSeries();
    return {
      data: normalizeSeriesList(response.data),
      meta: response.meta,
    };
  },

  async getLeagueSeries() {
    const response = await rapidApiService.getLeagueSeries();
    return {
      data: normalizeSeriesList(response.data),
      meta: response.meta,
    };
  },

  async getIplSeries() {
    const response = await rapidApiService.getLeagueSeries();
    const normalized = normalizeSeriesList(response.data);

    return {
      data: normalized.filter((series) => isIplText(series.name)),
      meta: response.meta,
    };
  },
};
