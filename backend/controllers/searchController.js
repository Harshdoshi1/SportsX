import { teamsService } from "../services/teamsService.js";
import { paginate } from "../utils/pagination.js";
import { ok } from "../utils/response.js";

export const searchController = {
  async search(req, res, next) {
    try {
      const query = String(req.query.q || "").trim().toLowerCase();
      const type = String(req.query.type || "all").toLowerCase();
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;

      if (!query) {
        ok(
          res,
          {
            teams: [],
            players: [],
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          },
          { cacheHit: true }
        );
        return;
      }

      const teamsResult = await teamsService.getTeams();
      const teams = teamsResult.data.filter((team) =>
        [team.name, team.shortName].filter(Boolean).join(" ").toLowerCase().includes(query)
      );

      let players = [];
      if (type !== "team") {
        const playerFetches = teams.slice(0, 6).map((team) => teamsService.getPlayersByTeam(team.id, team.name));
        const playerResults = await Promise.allSettled(playerFetches);
        players = playerResults
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value.data)
          .filter((player) =>
            [player.name, player.team, player.role].filter(Boolean).join(" ").toLowerCase().includes(query)
          );
      }

      if (type === "team") {
        const paginatedTeams = paginate(teams, page, limit);
        ok(
          res,
          {
            teams: paginatedTeams.data,
            players: [],
            pagination: paginatedTeams.pagination,
          },
          teamsResult.meta
        );
        return;
      }

      if (type === "player") {
        const paginatedPlayers = paginate(players, page, limit);
        ok(
          res,
          {
            teams: [],
            players: paginatedPlayers.data,
            pagination: paginatedPlayers.pagination,
          },
          teamsResult.meta
        );
        return;
      }

      const merged = [
        ...teams.map((team) => ({ entityType: "team", ...team })),
        ...players.map((player) => ({ entityType: "player", ...player })),
      ];

      const paginated = paginate(merged, page, limit);
      ok(
        res,
        {
          results: paginated.data,
          teams,
          players,
          pagination: paginated.pagination,
        },
        teamsResult.meta
      );
    } catch (error) {
      next(error);
    }
  },
};
