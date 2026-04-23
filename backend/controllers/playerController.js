import { crexPlayerService } from "../services/crexPlayerService.js";
import { ok } from "../utils/response.js";

const normalizeNameKey = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const playerController = {
  async getPlayerInnings(req, res, next) {
    try {
      const { playerId } = req.params;
      const slug = String(playerId || "").trim();
      const forceRefresh = ["1", "true", "yes"].includes(String(req.query?.fresh || "").toLowerCase());

      // Try by crex slug first, then by name key
      let data = await crexPlayerService.getPlayerInnings(slug, { forceRefresh });

      if (!data) {
        data = await crexPlayerService.getPlayerData(slug, forceRefresh);
      }

      if (!data) {
        return ok(res, {
          innings: [],
          opponentStats: [],
          favouriteTarget: null,
          message: `No data found for player: ${slug}`,
        });
      }

      ok(res, {
        innings: data.innings || [],
        bowlingInnings: data.bowlingInnings || [],
        opponentStats: data.opponentStats || [],
        favouriteTarget: data.favouriteTarget || null,
        team: data.team,
        role: data.role,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPlayerOpponentAnalysis(req, res, next) {
    try {
      const { playerId } = req.params;
      const data = await crexPlayerService.getPlayerData(playerId);

      if (!data) {
        return ok(res, {
          opponentStats: [],
          favouriteTarget: null,
        });
      }

      ok(res, {
        opponentStats: data.opponentStats || [],
        favouriteTarget: data.favouriteTarget || null,
        innings: data.innings?.length || 0,
        team: data.team,
        role: data.role,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPlayerList(_req, res, next) {
    try {
      const list = crexPlayerService.getPlayerList();
      ok(res, {
        players: list.map((p) => ({
          nameKey: p.nameKey,
          crexSlug: p.crexSlug,
          team: p.team,
          role: p.role,
        })),
        total: list.length,
      });
    } catch (error) {
      next(error);
    }
  },

  async refreshPlayerData(_req, res, next) {
    try {
      const all = await crexPlayerService.getAllPlayerData(true);
      ok(res, {
        message: "Player data refresh started",
        playersRefreshed: all.length,
      });
    } catch (error) {
      next(error);
    }
  },
};
