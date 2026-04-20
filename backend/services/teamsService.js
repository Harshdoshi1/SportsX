import { iplTeamPlayersService } from "./iplTeamPlayersService.js";
import { iplPlayerProfileService } from "./iplPlayerProfileService.js";
import { iplScraperService } from "./iplScraperService.js";

const normalizeNameKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isRcbTeam = (teamName) => {
  const normalized = String(teamName || "").toLowerCase();
  return normalized.includes("royal challengers") || normalized === "rcb";
};

const mergePlayers = (rapidPlayers, scrapedPlayers, teamName = null) => {
  const byName = new Map();

  for (const player of rapidPlayers || []) {
    byName.set(normalizeNameKey(player.name), {
      ...player,
      team: player.team || teamName || null,
    });
  }

  for (const player of scrapedPlayers || []) {
    const key = normalizeNameKey(player.name);
    const existing = byName.get(key);

    if (!existing) {
      byName.set(key, {
        ...player,
        team: teamName || null,
      });
      continue;
    }

    byName.set(key, {
      ...existing,
      id: existing.id || player.id,
      name: existing.name || player.name,
      role: player.role || existing.role,
      image: player.image || existing.image,
      team: existing.team || teamName || null,
      matches: player.matches ?? existing.matches,
      runs: player.runs ?? existing.runs,
      wickets: player.wickets ?? existing.wickets,
      average: player.average ?? existing.average,
      strikeRate: player.strikeRate ?? existing.strikeRate,
      economy: player.economy ?? existing.economy,
      season: player.season || existing.season,
      profileUrl: player.profileUrl || existing.profileUrl,
    });
  }

  return Array.from(byName.values());
};

const mergeLinkedProfiles = (players, linkedProfiles, teamName = null) => {
  if (!Array.isArray(linkedProfiles) || linkedProfiles.length === 0) {
    return players;
  }

  const byId = new Map(players.map((player) => [String(player.id || ""), player]));
  const byName = new Map(players.map((player) => [normalizeNameKey(player.name), player]));

  for (const profile of linkedProfiles) {
    const byProfileId = byId.get(String(profile.id || ""));
    const byProfileName = byName.get(normalizeNameKey(profile.name));
    const existing = byProfileId || byProfileName;

    if (!existing) {
      continue;
    }

    const merged = {
      ...existing,
      id: existing.id || profile.id,
      name: existing.name || profile.name,
      role: profile.role || existing.role,
      team: existing.team || teamName || null,
      season: profile.season || existing.season,
      matches: profile.matches ?? existing.matches,
      runs: profile.runs ?? existing.runs,
      wickets: profile.wickets ?? existing.wickets,
      average: profile.average ?? existing.average,
      strikeRate: profile.strikeRate ?? existing.strikeRate,
      economy: profile.economy ?? existing.economy,
      profileUrl: profile.profileUrl || existing.profileUrl,
    };

    byId.set(String(merged.id || ""), merged);
    byName.set(normalizeNameKey(merged.name), merged);
  }

  const merged = Array.from(new Map(Array.from(byName.values()).map((player) => [normalizeNameKey(player.name), player])).values());
  return merged;
};

export const teamsService = {
  async getTeams() {
    const [catalog, points] = await Promise.all([
      iplTeamPlayersService.getTeamCatalog(),
      iplScraperService.scrapePointsTable(),
    ]);

    const byShort = new Map(points.map((row) => [String(row?.team || "").toUpperCase(), row]));
    const deduped = catalog.map((team) => {
      const row = byShort.get(team.short);
      return {
        id: team.short,
        name: team.name,
        shortName: team.short,
        played: Number(row?.played ?? 0),
        won: Number(row?.win ?? 0),
        lost: Number(row?.loss ?? 0),
        pts: Number(row?.points ?? 0),
        nrr: String(row?.nrr ?? "-"),
      };
    });

    return {
      data: deduped,
      meta: {
        provider: "iplt20-scraper",
        count: deduped.length,
      },
    };
  },

  async getPlayersByTeam(teamId, teamName = null) {
    const requestedName = String(teamName || teamId || "").trim();
    const catalog = iplTeamPlayersService.getTeamCatalog();
    const normalized = requestedName.toLowerCase();
    const team =
      catalog.find((item) => item.short.toLowerCase() === normalized) ||
      catalog.find((item) => item.slug.toLowerCase() === normalized) ||
      catalog.find((item) => item.name.toLowerCase() === normalized) ||
      null;

    const resolvedTeamName = team?.name || teamName || String(teamId || "");
    const [scrapedPlayers, linkedProfiles] = await Promise.all([
      iplTeamPlayersService.scrapeTeamPlayersWithStats(resolvedTeamName),
      isRcbTeam(resolvedTeamName) ? iplPlayerProfileService.getProvidedPlayerProfiles() : Promise.resolve([]),
    ]);

    const merged = mergeLinkedProfiles(mergePlayers([], scrapedPlayers, resolvedTeamName), linkedProfiles, resolvedTeamName);

    return {
      data: merged,
      meta: {
        provider: "iplt20-scraper+links",
        scrapedPlayers: scrapedPlayers.length,
        linkedProfiles: linkedProfiles.length,
      },
    };
  },
};
