import { adminMatchesService } from "../services/adminMatchesService.js";
import { ok, fail } from "../utils/response.js";

export const adminMatchController = {
  async addLiveMatch(req, res) {
    try {
      const { url, sport, section, title } = req.body;

      if (!url || !sport || !section || !title) {
        return fail(res, 400, "Missing required fields: url, sport, section, title");
      }

      const match = await adminMatchesService.addLiveMatch({
        url,
        sport,
        section,
        title,
        tournamentId: req.body.tournamentId,
        series: req.body.series,
        team1: req.body.team1,
        team2: req.body.team2,
        category: req.body.category,
      });

      return ok(res, { match, message: "Live match added successfully" });
    } catch (error) {
      console.error("Error adding live match:", error);
      return fail(res, 500, error?.message || "Failed to add live match");
    }
  },

  async addUpcomingMatch(req, res) {
    try {
      const { url, sport, section, title, date, time } = req.body;

      if (!url || !sport || !section || !title || !date || !time) {
        return fail(res, 400, "Missing required fields: url, sport, section, title, date, time");
      }

      const match = await adminMatchesService.addUpcomingMatch({
        url,
        sport,
        section,
        title,
        date,
        time,
        tournamentId: req.body.tournamentId,
        series: req.body.series,
        team1: req.body.team1,
        team2: req.body.team2,
        category: req.body.category,
      });

      return ok(res, { match, message: "Upcoming match added successfully" });
    } catch (error) {
      console.error("Error adding upcoming match:", error);
      return fail(res, 500, error?.message || "Failed to add upcoming match");
    }
  },

  async getAllMatches(req, res) {
    try {
      const result = await adminMatchesService.getAllAdminMatches();

      if (!result.success) {
        return fail(res, 500, result.message);
      }

      return ok(res, { matches: result.data, message: result.message });
    } catch (error) {
      console.error("Error fetching admin matches:", error);
      return fail(res, 500, error?.message || "Failed to fetch matches");
    }
  },

  async getLiveMatchData(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return fail(res, 400, "Match ID is required");
      }

      const result = await adminMatchesService.getLiveMatchData(id, {
        forceFresh: true,
      });

      return ok(res, result, "Live match data retrieved successfully");
    } catch (error) {
      console.error("Error fetching live match data:", error);
      return fail(res, 500, error?.message || "Failed to fetch live match data");
    }
  },

  async deleteMatch(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return fail(res, 400, "Match ID is required");
      }

      const result = await adminMatchesService.deleteMatch(id);

      return ok(res, { id: result.id, message: "Match deleted successfully" });
    } catch (error) {
      console.error("Error deleting match:", error);
      return fail(res, 500, error?.message || "Failed to delete match");
    }
  },

  async getAllLiveMatches(req, res) {
    try {
      const result = await adminMatchesService.getAllLiveMatchesWithData({
        forceFresh: req.query.fresh === "true" || req.query.fresh === "1",
      });

      if (!result.success) {
        return fail(res, 500, result.message);
      }

      return ok(res, { matches: result.data, message: result.message });
    } catch (error) {
      console.error("Error fetching live matches:", error);
      return fail(res, 500, error?.message || "Failed to fetch live matches");
    }
  },
};
