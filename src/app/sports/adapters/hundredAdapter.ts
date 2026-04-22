import type { SportPageData, TeamRef, Leaderboard, LeaderboardRow, TeamStandingRow } from "../sportTypes";
import { HUNDRED_TEAMS, HUNDRED_STANDINGS, HUNDRED_BATTING_LEADERS, HUNDRED_BOWLING_LEADERS } from "../../data/hundredData";

const toTeamRef = (id: string): TeamRef => {
  const t = HUNDRED_TEAMS.find(t => t.id === id);
  return t ? { id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl } : { id, name: id, shortName: id.toUpperCase() };
};

export async function mapHundredToSportPageData(): Promise<SportPageData> {
  const teams: TeamRef[] = HUNDRED_TEAMS.map(t => ({ id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl }));

  const standings: TeamStandingRow[] = HUNDRED_STANDINGS.map((s, i) => ({
    rank: i + 1, team: toTeamRef(s.team), played: s.played, won: s.won, lost: s.lost, points: s.points, additional: { NRR: s.nrr },
  }));

  const batting: Leaderboard = {
    key: "mostRuns", title: "Top Run Scorers", subtitle: "Most runs in The Hundred 2026", accent: "orange",
    rows: HUNDRED_BATTING_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Batter" },
      value: String(p.runs), valueLabel: "Runs",
      meta: { Mat: p.matches, Avg: p.average, SR: p.strikeRate },
    })),
  };

  const bowling: Leaderboard = {
    key: "mostWickets", title: "Top Wicket Takers", subtitle: "Most wickets in The Hundred 2026", accent: "purple",
    rows: HUNDRED_BOWLING_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Bowler" },
      value: String(p.wickets), valueLabel: "Wkts",
      meta: { Mat: p.matches, Econ: p.economy, Avg: p.average, BBI: p.bbi },
    })),
  };

  return { sport: "hundred", leagueId: "hundred", leagueName: "The Hundred 2026", seasonLabel: "2026", sportColor: "#7C4DFF", sportIcon: "💯", teams, standings, featuredLeaderboards: [batting, bowling] };
}
