/* ─── Shared UI Models for Multi-Sport Framework ─── */

export type SportKey = "ipl" | "icc" | "bbl" | "hundred" | "f1" | "nba";

export type TeamRef = {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

export type PersonRef = {
  id: string;
  name: string;
  imageUrl?: string | null;
  team?: TeamRef | null;
  role?: string | null;
  country?: string | null;
};

export type LeaderboardRow = {
  rank: number;
  person: PersonRef;
  value: string;
  valueLabel?: string;
  meta?: Record<string, string | number | null>;
};

export type Leaderboard = {
  key: string;
  title: string;
  subtitle?: string;
  accent?: "orange" | "purple" | "blue" | "red" | "green" | "pink" | "cyan";
  rows: LeaderboardRow[];
};

export type FixtureRow = {
  id: string;
  date: string;
  time?: string;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  homeScore?: string;
  awayScore?: string;
  venue?: string;
  status: "upcoming" | "live" | "completed";
  result?: string;
  matchLabel?: string;
};

export type TeamStandingRow = {
  rank: number;
  team: TeamRef;
  played: number;
  won: number;
  lost: number;
  drawn?: number;
  points: number;
  additional?: Record<string, string | number | null>;
};

export type SportPageData = {
  sport: SportKey;
  leagueId: string;
  leagueName: string;
  seasonLabel?: string;
  sportColor: string;
  sportIcon: string;
  teams: TeamRef[];
  standings?: TeamStandingRow[];
  featuredLeaderboards: Leaderboard[];
  fixtures?: FixtureRow[];
  results?: FixtureRow[];
};

/* ─── Accent Color Map ─── */
export const ACCENT_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  orange: { bg: "rgba(255,145,0,0.14)", border: "rgba(255,145,0,0.25)", text: "#ffc57a", badge: "rgba(255,145,0,0.18)" },
  purple: { bg: "rgba(124,77,255,0.14)", border: "rgba(124,77,255,0.25)", text: "#c5a8ff", badge: "rgba(124,77,255,0.20)" },
  blue:   { bg: "rgba(59,212,231,0.14)", border: "rgba(59,212,231,0.25)", text: "#7ad6ff", badge: "rgba(59,212,231,0.18)" },
  red:    { bg: "rgba(255,77,141,0.14)", border: "rgba(255,77,141,0.25)", text: "#ff8ca8", badge: "rgba(255,77,141,0.18)" },
  green:  { bg: "rgba(0,230,118,0.14)", border: "rgba(0,230,118,0.25)", text: "#7affb8", badge: "rgba(0,230,118,0.18)" },
  pink:   { bg: "rgba(255,77,141,0.14)", border: "rgba(255,77,141,0.25)", text: "#ff8ca8", badge: "rgba(255,77,141,0.18)" },
  cyan:   { bg: "rgba(59,212,231,0.14)", border: "rgba(59,212,231,0.25)", text: "#7ad6ff", badge: "rgba(59,212,231,0.18)" },
};
