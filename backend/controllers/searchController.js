import { teamsService } from "../services/teamsService.js";
import { paginate } from "../utils/pagination.js";
import { ok } from "../utils/response.js";

const SEARCH_CACHE_TTL_MS = 90 * 1000;

let searchCatalogCache = {
  teams: [],
  players: [],
  expiresAt: 0,
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const buildSearchCatalog = async () => {
  if (Date.now() < searchCatalogCache.expiresAt) {
    return searchCatalogCache;
  }

  const teamsResult = await teamsService.getTeams();
  const allTeams = Array.isArray(teamsResult?.data) ? teamsResult.data : [];

  const playerFetches = allTeams.map((team) => teamsService.getPlayersByTeam(team.id, team.name));
  const playerResults = await Promise.allSettled(playerFetches);

  const players = playerResults
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value.data || []);

  const dedupedPlayers = Array.from(
    new Map(
      players.map((player) => {
        const key = `${normalize(player?.name)}::${normalize(player?.team)}`;
        return [key, player];
      }),
    ).values(),
  );

  searchCatalogCache = {
    teams: allTeams,
    players: dedupedPlayers,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  };

  return searchCatalogCache;
};

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

      const catalog = await buildSearchCatalog();
      const allTeams = catalog.teams;

      const teams = allTeams.filter((team) => {
        const name = normalize(team?.name);
        const short = normalize(team?.shortName);
        return name.startsWith(query) || short.startsWith(query);
      });

      let players = [];
      if (type !== "team") {
        players = catalog.players.filter((player) => {
          const name = normalize(player?.name);
          return name.startsWith(query);
        });
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
          { source: "search-catalog", cacheHit: Date.now() < searchCatalogCache.expiresAt }
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
          { source: "search-catalog", cacheHit: Date.now() < searchCatalogCache.expiresAt }
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
        { source: "search-catalog", cacheHit: Date.now() < searchCatalogCache.expiresAt }
      );
    } catch (error) {
      next(error);
    }
  },
};
