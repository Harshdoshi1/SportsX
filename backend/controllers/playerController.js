import { crexPlayerService } from "../services/crexPlayerService.js";
import { ok } from "../utils/response.js";

const normalizeNameKey = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const playerController = {
  async resolvePlayerImage(req, res, next) {
    try {
      const name = String(req.query?.name || "").trim();
      if (!name) {
        return ok(res, { imageUrl: null, source: null, crexSlug: null });
      }

      const meta = await crexPlayerService.findPlayerMetaAsync(name);
      if (!meta?.crexSlug) {
        return ok(res, { imageUrl: null, source: "not-found", crexSlug: null });
      }

      const crexSlug = String(meta.crexSlug);
      const profileUrl = `https://crex.com/player/${crexSlug}`;

      const cacheKey = normalizeNameKey(crexSlug);
      if (!global.__sportsxPlayerImageCache) {
        global.__sportsxPlayerImageCache = new Map();
      }
      const cache = global.__sportsxPlayerImageCache;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return ok(res, { imageUrl: cached.imageUrl, source: cached.source, crexSlug });
      }

      let imageUrl = null;
      try {
        const resp = await fetch(profileUrl, { headers: { "user-agent": "SportsXBot/1.0" } });
        const html = await resp.text();
        const og = html.match(/property=[\"']og:image[\"'][^>]*content=[\"']([^\"']+)[\"']/i)?.[1];
        const tw = html.match(/name=[\"']twitter:image[\"'][^>]*content=[\"']([^\"']+)[\"']/i)?.[1];
        imageUrl = String(og || tw || "").trim() || null;
      } catch {
        imageUrl = null;
      }

      cache.set(cacheKey, {
        imageUrl,
        source: imageUrl ? "og:image" : "profile",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      return ok(res, { imageUrl, source: imageUrl ? "og:image" : "profile", crexSlug });
    } catch (error) {
      next(error);
    }
  },
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
