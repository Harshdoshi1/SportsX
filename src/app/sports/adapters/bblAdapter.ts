import type { SportPageData, TeamRef, Leaderboard, LeaderboardRow, TeamStandingRow } from "../sportTypes";
import { BBL_TEAMS, BBL_STANDINGS, BBL_BATTING_LEADERS, BBL_BOWLING_LEADERS } from "../../data/bblData";

const toTeamRef = (id: string): TeamRef => {
  const t = BBL_TEAMS.find(t => t.id === id);
  return t ? { id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl } : { id, name: id, shortName: id.toUpperCase() };
};

export async function mapBblToSportPageData(): Promise<SportPageData> {
  const teams: TeamRef[] = BBL_TEAMS.map(t => ({ id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl }));

  const standings: TeamStandingRow[] = BBL_STANDINGS.map((s, i) => ({
    rank: i + 1, team: toTeamRef(s.team), played: s.played, won: s.won, lost: s.lost, points: s.points, additional: { NRR: s.nrr },
  }));

  const batting: Leaderboard = {
    key: "mostRuns", title: "Top Run Scorers", subtitle: "Most runs in BBL 2025", accent: "orange",
    rows: BBL_BATTING_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Batter" },
      value: String(p.runs), valueLabel: "Runs",
      meta: { Mat: p.matches, Avg: p.average, SR: p.strikeRate },
    })),
  };

  const bowling: Leaderboard = {
    key: "mostWickets", title: "Top Wicket Takers", subtitle: "Most wickets in BBL 2025", accent: "purple",
    rows: BBL_BOWLING_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Bowler" },
      value: String(p.wickets), valueLabel: "Wkts",
      meta: { Mat: p.matches, Econ: p.economy, Avg: p.average, BBI: p.bbi },
    })),
  };

  return { sport: "bbl", leagueId: "bbl", leagueName: "Big Bash League 2025", seasonLabel: "2025", sportColor: "#FF6600", sportIcon: "🔥", teams, standings, featuredLeaderboards: [batting, bowling] };
}
