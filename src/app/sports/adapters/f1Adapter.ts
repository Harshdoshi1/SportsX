import type { SportPageData, TeamRef, Leaderboard, LeaderboardRow, TeamStandingRow, FixtureRow } from "../sportTypes";
import { F1_CONSTRUCTORS, F1_DRIVERS, F1_CONSTRUCTOR_STANDINGS, F1_RACE_CALENDAR } from "../../data/f1Data";

const toTeamRef = (id: string): TeamRef => {
  const t = F1_CONSTRUCTORS.find(t => t.id === id);
  return t ? { id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl } : { id, name: id, shortName: id.toUpperCase() };
};

export async function mapF1ToSportPageData(): Promise<SportPageData> {
  const teams: TeamRef[] = F1_CONSTRUCTORS.map(t => ({ id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor, logoUrl: t.logoUrl }));

  // Constructor standings as team standings
  const standings: TeamStandingRow[] = F1_CONSTRUCTOR_STANDINGS.map((s, i) => ({
    rank: i + 1, team: toTeamRef(s.team), played: 4, won: s.wins, lost: 0, points: s.points,
  }));

  // Driver standings leaderboard
  const driverStandings: Leaderboard = {
    key: "driverStandings", title: "Driver Standings", subtitle: "2026 Championship Points", accent: "orange",
    rows: F1_DRIVERS.sort((a, b) => b.points - a.points).slice(0, 10).map((d, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: d.id, name: d.name, imageUrl: d.image, team: toTeamRef(d.team), role: "Driver", country: d.country },
      value: `${d.points} PTS`,
      valueLabel: "Points",
      meta: { Wins: d.wins, Poles: d.poles, FL: d.fastestLaps, "#": d.number },
    })),
  };

  // Most wins leaderboard
  const mostWins: Leaderboard = {
    key: "mostWins", title: "Most Wins", subtitle: "Race victories in 2026", accent: "red",
    rows: F1_DRIVERS.filter(d => d.wins > 0).sort((a, b) => b.wins - a.wins).slice(0, 10).map((d, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: d.id, name: d.name, imageUrl: d.image, team: toTeamRef(d.team), role: "Driver", country: d.country },
      value: String(d.wins),
      valueLabel: "Wins",
      meta: { PTS: d.points, Poles: d.poles },
    })),
  };

  // Most poles leaderboard
  const mostPoles: Leaderboard = {
    key: "mostPoles", title: "Most Pole Positions", subtitle: "Qualifying best in 2026", accent: "cyan",
    rows: F1_DRIVERS.filter(d => d.poles > 0).sort((a, b) => b.poles - a.poles).slice(0, 10).map((d, i): LeaderboardRow => ({
      rank: i + 1,
      person: { id: d.id, name: d.name, imageUrl: d.image, team: toTeamRef(d.team), role: "Driver", country: d.country },
      value: String(d.poles),
      valueLabel: "Poles",
      meta: { PTS: d.points, Wins: d.wins },
    })),
  };

  // Race calendar as fixtures
  const fixtures: FixtureRow[] = F1_RACE_CALENDAR.filter(r => r.status === "upcoming").map(r => ({
    id: r.id, date: r.date, homeTeam: { id: r.id, name: r.name, shortName: r.name.replace(/ GP$/, "").substring(0, 4).toUpperCase() },
    awayTeam: { id: "circuit", name: r.circuit, shortName: "CIR" }, venue: r.circuit, status: r.status, matchLabel: r.name,
  }));

  const results: FixtureRow[] = F1_RACE_CALENDAR.filter(r => r.status === "completed").map(r => ({
    id: r.id, date: r.date, homeTeam: { id: r.id, name: r.name, shortName: r.name.replace(/ GP$/, "").substring(0, 4).toUpperCase() },
    awayTeam: { id: "circuit", name: r.circuit, shortName: "CIR" }, venue: r.circuit, status: r.status, result: `Winner: ${r.winner}`, matchLabel: r.name,
  }));

  return {
    sport: "f1", leagueId: "f1-2026", leagueName: "F1 World Championship 2026", seasonLabel: "2026",
    sportColor: "#FF9100", sportIcon: "🏎️", teams, standings,
    featuredLeaderboards: [driverStandings, mostWins, mostPoles], fixtures, results,
  };
}
