import type { SportPageData, TeamRef, Leaderboard, LeaderboardRow, TeamStandingRow } from "../sportTypes";
import { NBA_TEAMS, NBA_STANDINGS, NBA_PPG_LEADERS, NBA_RPG_LEADERS, NBA_APG_LEADERS, NBA_BLK_LEADERS } from "../../data/nbaData";

const toTeamRef = (id: string): TeamRef => {
  const t = NBA_TEAMS.find(t => t.id === id);
  return t ? { id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl } : { id, name: id, shortName: id.toUpperCase() };
};

export async function mapNbaToSportPageData(): Promise<SportPageData> {
  const teams: TeamRef[] = NBA_TEAMS.map(t => ({ id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl }));

  const standings: TeamStandingRow[] = NBA_STANDINGS.map((s, i) => ({
    rank: i + 1, team: toTeamRef(s.team), played: s.played, won: s.won, lost: s.lost, points: 0,
    additional: { "Win%": s.winPct },
  }));

  const ppgLeaderboard: Leaderboard = {
    key: "ppg", title: "Points Per Game", subtitle: "Scoring leaders", accent: "red",
    rows: NBA_PPG_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Guard/Forward" },
      value: `${p.ppg}`, valueLabel: "PPG",
      meta: { RPG: p.rpg, APG: p.apg },
    })),
  };

  const rpgLeaderboard: Leaderboard = {
    key: "rpg", title: "Rebounds Per Game", subtitle: "Rebounding leaders", accent: "blue",
    rows: NBA_RPG_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Center/Forward" },
      value: `${p.rpg}`, valueLabel: "RPG",
      meta: { PPG: p.ppg, APG: p.apg },
    })),
  };

  const apgLeaderboard: Leaderboard = {
    key: "apg", title: "Assists Per Game", subtitle: "Playmaking leaders", accent: "green",
    rows: NBA_APG_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Guard" },
      value: `${p.apg}`, valueLabel: "APG",
      meta: { PPG: p.ppg, RPG: p.rpg },
    })),
  };

  const blkLeaderboard: Leaderboard = {
    key: "bpg", title: "Blocks Per Game", subtitle: "Shot blocking leaders", accent: "purple",
    rows: NBA_BLK_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Center" },
      value: `${p.bpg}`, valueLabel: "BPG",
      meta: { PPG: p.ppg, RPG: p.rpg },
    })),
  };

  return {
    sport: "nba", leagueId: "nba", leagueName: "NBA 2025-26", seasonLabel: "2025/26",
    sportColor: "#FF4D8D", sportIcon: "🏀", teams, standings,
    featuredLeaderboards: [ppgLeaderboard, rpgLeaderboard, apgLeaderboard, blkLeaderboard],
  };
}
