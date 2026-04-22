import type { SportPageData, TeamRef, Leaderboard, LeaderboardRow, TeamStandingRow, FixtureRow } from "../sportTypes";
import { ICC_TEAMS, ICC_STANDINGS, ICC_BATTING_LEADERS, ICC_BOWLING_LEADERS, ICC_FIXTURES, ICC_RESULTS } from "../../data/iccData";

const toTeamRef = (id: string): TeamRef => {
  const t = ICC_TEAMS.find(t => t.id === id);
  return t ? { id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl } : { id, name: id, shortName: id.toUpperCase() };
};

export async function mapIccToSportPageData(): Promise<SportPageData> {
  const teams: TeamRef[] = ICC_TEAMS.map(t => ({ id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl }));

  const standings: TeamStandingRow[] = ICC_STANDINGS.map((s, i) => ({
    rank: i + 1,
    team: toTeamRef(s.team),
    played: s.played,
    won: s.won,
    lost: s.lost,
    drawn: s.drawn,
    points: s.points,
    additional: { NRR: s.nrr },
  }));

  const battingLeaderboard: Leaderboard = {
    key: "mostRuns",
    title: "Top Run Scorers",
    subtitle: "Most runs in the tournament",
    accent: "orange",
    rows: ICC_BATTING_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Batter", country: toTeamRef(p.team).name },
      value: String(p.runs),
      valueLabel: "Runs",
      meta: { Mat: p.matches, Avg: p.average, SR: p.strikeRate, "50s": p.fifties, "100s": p.hundreds },
    })),
  };

  const bowlingLeaderboard: Leaderboard = {
    key: "mostWickets",
    title: "Top Wicket Takers",
    subtitle: "Most wickets in the tournament",
    accent: "purple",
    rows: ICC_BOWLING_LEADERS.map((p, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: p.player.toLowerCase().replace(/\s+/g, "-"), name: p.player, imageUrl: p.image, team: toTeamRef(p.team), role: "Bowler", country: toTeamRef(p.team).name },
      value: String(p.wickets),
      valueLabel: "Wkts",
      meta: { Mat: p.matches, Econ: p.economy, Avg: p.average, BBI: p.bbi },
    })),
  };

  const fixtures: FixtureRow[] = ICC_FIXTURES.map(f => ({
    id: f.id, date: f.date, homeTeam: toTeamRef(f.home), awayTeam: toTeamRef(f.away), venue: f.venue, status: f.status, matchLabel: f.matchLabel,
  }));

  const results: FixtureRow[] = ICC_RESULTS.map(r => ({
    id: r.id, date: r.date, homeTeam: toTeamRef(r.home), awayTeam: toTeamRef(r.away), homeScore: r.homeScore, awayScore: r.awayScore, venue: r.venue, status: r.status, result: r.result, matchLabel: r.matchLabel,
  }));

  return {
    sport: "icc",
    leagueId: "wc",
    leagueName: "ICC World Cup 2026",
    seasonLabel: "2026",
    sportColor: "#0078D7",
    sportIcon: "🌍",
    teams,
    standings,
    featuredLeaderboards: [battingLeaderboard, bowlingLeaderboard],
    fixtures,
    results,
  };
}
