import { teamsService } from "../services/teamsService.js";
import { paginate } from "../utils/pagination.js";
import { ok } from "../utils/response.js";

const parsePage = (query) => query.page || 1;
const parseLimit = (query) => query.limit || 20;

export const teamsController = {
  async getTeams(req, res, next) {
    try {
      const result = await teamsService.getTeams();
      const query = String(req.query.q || "").trim().toLowerCase();
      const filtered = query
        ? result.data.filter((team) =>
            [team.name, team.shortName].filter(Boolean).join(" ").toLowerCase().includes(query)
          )
        : result.data;

      const paginated = paginate(filtered, parsePage(req.query), parseLimit(req.query));
      ok(res, { teams: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },

  async getPlayersByTeam(req, res, next) {
    try {
      const teamName = req.query.teamName || null;
      const result = await teamsService.getPlayersByTeam(req.params.id, teamName);

      const query = String(req.query.q || "").trim().toLowerCase();
      const filtered = query
        ? result.data.filter((player) =>
            [player.name, player.team, player.role].filter(Boolean).join(" ").toLowerCase().includes(query)
          )
        : result.data;

      const paginated = paginate(filtered, parsePage(req.query), parseLimit(req.query));
      ok(res, { players: paginated.data, pagination: paginated.pagination }, result.meta);
    } catch (error) {
      next(error);
    }
  },
};
