import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Trophy, TrendingUp, Target, Shield } from "lucide-react";
import { cricketApi } from "../../services/cricketApi";
import { deriveTeamShort, getTeamLogoProps, isIplTeamName, normalizeText, safeArray } from "../../services/cricketUi";
import { getIplTeamByShort } from "../../data/iplTeams";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

const tabs = ["Playing XI", "Full Squad", "Analytics"];

const TEAM_SLUG_BY_SHORT: Record<string, string> = {
  CSK: "chennai-super-kings",
  DC: "delhi-capitals",
  GT: "gujarat-titans",
  KKR: "kolkata-knight-riders",
  LSG: "lucknow-super-giants",
  MI: "mumbai-indians",
  PBKS: "punjab-kings",
  RR: "rajasthan-royals",
  RCB: "royal-challengers-bengaluru",
  SRH: "sunrisers-hyderabad",
};

const SHORT_BY_SLUG = Object.entries(TEAM_SLUG_BY_SHORT).reduce<Record<string, string>>((acc, [short, slug]) => {
  acc[slug] = short;
  return acc;
}, {});

const resolveTeamSelection = (input: string | undefined) => {
  const raw = String(input || "").trim();
  const normalized = raw.toLowerCase();
  const upper = raw.toUpperCase();

  if (TEAM_SLUG_BY_SHORT[upper]) {
    return { short: upper, slug: TEAM_SLUG_BY_SHORT[upper] };
  }

  if (SHORT_BY_SLUG[normalized]) {
    return { short: SHORT_BY_SLUG[normalized], slug: normalized };
  }

  return { short: "RCB", slug: TEAM_SLUG_BY_SHORT.RCB };
};

type TeamFixedLineup = {
  openers: string[];
  middle: string[];
  finishers: string[];
  bowlers: string[];
  impactPlayers: string[];
};

const TEAM_FIXED_LINEUPS: Record<string, TeamFixedLineup> = {
  RCB: {
    openers: ["Virat Kohli", "Phil Salt"],
    middle: ["Devdutt Padikkal", "Rajat Patidar", "Jitesh Sharma"],
    finishers: ["Tim David", "Romario Shepherd", "Krunal Pandya"],
    bowlers: ["Suyash Sharma", "Bhuvneshwar Kumar", "Josh Hazlewood"],
    impactPlayers: ["Rasikh Dar", "Jacob Bethell", "Swapnil Singh"],
  },
  MI: {
    openers: ["Rohit", "DeCock"],
    middle: ["Surya", "Tilak", "Naman Dhir"],
    finishers: ["Rutherford", "Hardik"],
    bowlers: ["Santner", "Allah", "Bumrah", "Ashwini"],
    impactPlayers: [],
  },
  CSK: {
    openers: ["Sanju", "Ruturaj"],
    middle: ["Ayush", "Sarfaraz", "Brevis"],
    finishers: ["Shivam", "MS Dhoni"],
    bowlers: ["Anshul", "Noor", "Gurjapneet", "Jamie Overton"],
    impactPlayers: ["Hosein"],
  },
  PBKS: {
    openers: ["Priyansh", "Prabh Simran"],
    middle: ["Cooper", "Shreyas", "Nehal"],
    finishers: ["Stoinis", "Shashank", "Jansen"],
    bowlers: ["Bartlett", "Arshdeep", "Chahal"],
    impactPlayers: [],
  },
  SRH: {
    openers: ["Abhishek", "Head"],
    middle: ["Kishan", "Klaasen", "Nitish"],
    finishers: ["Salil", "Aniket"],
    bowlers: ["Pat Cummins", "Eshan Malinga", "Shivang", "Sakib"],
    impactPlayers: ["Livingstone"],
  },
  DC: {
    openers: ["Rahul", "Nissanka"],
    middle: ["Axar", "Stubs", "Sameer"],
    finishers: ["Miller", "Ashutosh"],
    bowlers: ["Ngidi", "Natarajan", "Mukesh", "Kuldeep"],
    impactPlayers: ["Starc"],
  },
  KKR: {
    openers: ["Fin", "Rahane"],
    middle: ["Raghuvanshi", "Green", "Anukul"],
    finishers: ["Rinku", "Powell", "Narine", "Ramandeep"],
    bowlers: ["Varun", "Arora", "Tyagi"],
    impactPlayers: [],
  },
  RR: {
    openers: ["Vaibhav", "Jaiswal"],
    middle: ["Jurel", "Parag", "Donovan"],
    finishers: ["Hetmyer", "Jadeja"],
    bowlers: ["Archer", "Bishnoi", "Sandeep", "Burger"],
    impactPlayers: [],
  },
  LSG: {
    openers: ["Marsh", "Markram"],
    middle: ["Pant", "Badoni", "Pooran"],
    finishers: ["Samad", "Mukul"],
    bowlers: ["Prince", "Digvesh", "Shami", "Avesh"],
    impactPlayers: [],
  },
  GT: {
    openers: ["Gill", "Sai"],
    middle: ["Buttler", "Sunder", "Phillips"],
    finishers: ["Tewatia", "Shahrukh"],
    bowlers: ["Rashid", "Rabada", "Krishna", "Siraj"],
    impactPlayers: [],
  },
};

type ApiTeam = {
  id: string | number;
  name: string;
  image?: string;
  played?: number;
  won?: number;
  lost?: number;
  pts?: number;
  nrr?: string;
};

type ApiPlayer = {
  id: string | number;
  name: string;
  role?: string;
  image?: string;
  season?: string;
  matches?: number;
  runs?: number;
  wickets?: number;
  average?: number;
  strikeRate?: number;
  economy?: number;
};

type IplMatch = {
  team1?: string;
  team2?: string;
  date?: string;
  startTime?: string;
  venue?: string;
  status?: string;
  result?: string;
};

type NextMatchCard = {
  opponentShort: string;
  opponentName: string;
  date: string;
  time: string;
  venue: string;
};

type StatsLeader = {
  player?: string;
  matches?: number;
  runs?: number;
  fours?: number;
  sixes?: number;
};

const isBatterRole = (role?: string | null) => /(batter|batsman|wk|wicket)/i.test(String(role || ""));
const isBowlingRole = (role?: string | null) => /(bowler|all.?rounder)/i.test(String(role || ""));

const normalizeNameKey = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const parseScoreRuns = (value?: string | null) => {
  const match = String(value || "").match(/^(\d{1,3})/);
  return match ? Number(match[1]) : null;
};

const parseScoreWickets = (value?: string | null) => {
  const match = String(value || "").match(/^\d{1,3}-(\d{1,2})/);
  return match ? Number(match[1]) : null;
};

const isCompletedStatus = (status?: string | null) => /completed|won|result|stumps|abandoned|no result|tied/i.test(String(status || ""));
const isUpcomingStatus = (status?: string | null) => /upcoming|starts|scheduled|fixture|not started|toss/i.test(String(status || ""));

const matchesTeam = (label: string | undefined, teamName: string, teamShort: string) => {
  const normalizedLabel = normalizeText(label);
  const normalizedTeamName = normalizeText(teamName);
  const normalizedShort = normalizeText(teamShort);
  return normalizedLabel === normalizedShort || normalizedLabel === normalizedTeamName;
};

const uniqueNames = (names: string[]) => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const name of names) {
    const key = normalizeNameKey(name);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    ordered.push(name);
  }
  return ordered;
};

const pickBestPlayingXi = (squad: ApiPlayer[]) => {
  const asStats = (player: ApiPlayer) => ({
    ...player,
    matches: toNumberSafe(player.matches, 0),
    runs: toNumberSafe(player.runs, 0),
    wickets: toNumberSafe(player.wickets, 0),
  });

  const players = squad.map(asStats);

  const batters = players
    .filter((player) => isBatterRole(player.role))
    .sort((left, right) => right.runs - left.runs || right.matches - left.matches || right.wickets - left.wickets);

  const bowlersAndAllRounders = players
    .filter((player) => isBowlingRole(player.role))
    .sort((left, right) => right.wickets - left.wickets || right.runs - left.runs || right.matches - left.matches);

  const overall = players
    .slice()
    .sort(
      (left, right) =>
        (right.runs + right.wickets * 30 + right.matches * 2) -
          (left.runs + left.wickets * 30 + left.matches * 2) ||
        String(left.name || "").localeCompare(String(right.name || "")),
    );

  const selected: ApiPlayer[] = [];
  const seen = new Set<string>();

  const addPlayer = (player?: ApiPlayer) => {
    if (!player) {
      return;
    }
    const key = normalizeNameKey(player.name);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    selected.push(player);
  };

  batters.slice(0, 7).forEach(addPlayer);
  bowlersAndAllRounders.forEach(addPlayer);
  overall.forEach(addPlayer);

  return selected.slice(0, 11);
};

const findPlayerByName = (players: ApiPlayer[], requestedName: string) => {
  const target = normalizeNameKey(requestedName);
  if (!target) return null;

  const exact = players.find((player) => normalizeNameKey(player.name) === target);
  if (exact) return exact;

  const containsMatch = players.find((player) => {
    const key = normalizeNameKey(player.name);
    return key.includes(target) || target.includes(key);
  });
  if (containsMatch) return containsMatch;

  const requestedTokens = String(requestedName)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);

  if (requestedTokens.length === 0) {
    return null;
  }

  const scored = players
    .map((player) => {
      const playerTokens = String(player.name || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 1);

      const score = requestedTokens.reduce((acc, token) => {
        const tokenMatched = playerTokens.some((playerToken) => playerToken.includes(token) || token.includes(playerToken));
        return tokenMatched ? acc + 1 : acc;
      }, 0);

      return { player, score };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0]?.score > 0 ? scored[0].player : null;
};

const pickPlayersByNames = (players: ApiPlayer[], names: string[]) => {
  return names.map((name) => {
    const found = findPlayerByName(players, name);
    if (found) {
      return found;
    }

    // Keep card visible even when API naming differs from the custom XI list.
    return {
      id: `manual-${normalizeNameKey(name)}`,
      name,
      role: "Custom Selection",
      season: "2026",
      matches: 0,
      runs: 0,
      wickets: 0,
      average: 0,
      strikeRate: 0,
      economy: 0,
    } as ApiPlayer;
  });
};

const buildLineupGroups = (xiPlayers, allPlayers, teamName?: string | null) => {
  const teamShort = deriveTeamShort(teamName);
  const fixedLineup = TEAM_FIXED_LINEUPS[teamShort];

  if (fixedLineup) {
    return {
      groups: [
        { title: "Openers", players: pickPlayersByNames(allPlayers, fixedLineup.openers) },
        { title: "Middle order", players: pickPlayersByNames(allPlayers, fixedLineup.middle) },
        { title: "Finishers", players: pickPlayersByNames(allPlayers, fixedLineup.finishers) },
        { title: "Bowlers", players: pickPlayersByNames(allPlayers, fixedLineup.bowlers) },
      ],
      impactPlayers: pickPlayersByNames(allPlayers, fixedLineup.impactPlayers),
    };
  }

  const players = xiPlayers.slice();

  const byRuns = players
    .slice()
    .sort((left, right) => toNumberSafe(right.runs, 0) - toNumberSafe(left.runs, 0));

  const openers = byRuns
    .filter((player) => isBatterRole(player.role))
    .slice(0, 2);

  const selected = new Set(openers.map((player) => normalizeNameKey(player.name)));

  const remaining = players.filter((player) => !selected.has(normalizeNameKey(player.name)));

  const middleOrder = remaining
    .filter((player) => isBatterRole(player.role) || /all.?rounder/i.test(String(player.role || "")))
    .sort((left, right) => toNumberSafe(right.runs, 0) - toNumberSafe(left.runs, 0))
    .slice(0, 3);

  middleOrder.forEach((player) => selected.add(normalizeNameKey(player.name)));

  const remainingAfterMiddle = players.filter((player) => !selected.has(normalizeNameKey(player.name)));

  const finishers = remainingAfterMiddle
    .filter((player) => /all.?rounder|wk|batter|batsman/i.test(String(player.role || "")))
    .sort(
      (left, right) =>
        (toNumberSafe(right.runs, 0) + toNumberSafe(right.wickets, 0) * 20) -
        (toNumberSafe(left.runs, 0) + toNumberSafe(left.wickets, 0) * 20),
    )
    .slice(0, 2);

  finishers.forEach((player) => selected.add(normalizeNameKey(player.name)));

  const remainingAfterFinishers = players.filter((player) => !selected.has(normalizeNameKey(player.name)));

  const bowlers = remainingAfterFinishers
    .slice()
    .sort((left, right) => toNumberSafe(right.wickets, 0) - toNumberSafe(left.wickets, 0))
    .slice(0, 4);

  return {
    groups: [
      { title: "Openers", players: openers },
      { title: "Middle order", players: middleOrder },
      { title: "Finishers", players: finishers },
      { title: "Bowlers", players: bowlers },
    ],
    impactPlayers: [],
  };
};

function formatValue(value?: number | null, decimals = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(decimals);
}

const toNumberSafe = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function PlayerCard({ player, onClick }: { player: ApiPlayer; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,12,28,0.9)", border: "1px solid rgba(150,170,255,0.14)" }}
    >
      <div className="p-4 pb-3">
        <div
          className="w-full h-24 rounded-xl mb-3 flex items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(20,28,56,0.95), rgba(14,22,48,0.95))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {player.image ? (
            <ImageWithFallback src={player.image} alt={player.name} className="w-full h-full object-contain p-1" fallbackMode="person" />
          ) : (
            <span className="text-4xl">🏏</span>
          )}
        </div>
        <h4 className="text-white font-bold text-sm leading-tight truncate">{player.name}</h4>
        <p className="text-white/40 text-xs mt-0.5">{player.role || "Cricketer"}</p>
        {player.season && <p className="text-[#7ad6ff] text-[11px] mt-0.5">Season {player.season}</p>}
      </div>
      <div className="px-4 pb-4 space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-white/30">Matches</span><span className="text-white/80 font-semibold">{formatValue(player.matches, 0)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">Runs</span><span className="text-white/80 font-semibold">{formatValue(player.runs, 0)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">Wkts</span><span className="text-white/80 font-semibold">{formatValue(player.wickets, 0)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">Avg</span><span className="text-white/80 font-semibold">{formatValue(player.average)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">SR</span><span className="text-white/80 font-semibold">{formatValue(player.strikeRate)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">Econ</span><span className="text-white/80 font-semibold">{formatValue(player.economy)}</span></div>
      </div>
    </motion.div>
  );
}

export function TeamAnalysis() {
  const navigate = useNavigate();
  const { sportId, leagueId, teamId } = useParams<{ sportId: string; leagueId: string; teamId: string }>();
  const [activeTab, setActiveTab] = useState("Playing XI");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<ApiTeam | null>(null);
  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [nextMatch, setNextMatch] = useState<NextMatchCard | null>(null);
  const [lastPlayingXiNames, setLastPlayingXiNames] = useState<string[]>([]);
  const [teamCompletedMatches, setTeamCompletedMatches] = useState<IplMatch[]>([]);
  const [statsLeaders, setStatsLeaders] = useState<StatsLeader[]>([]);

  useEffect(() => {
    let active = true;

    const loadTeam = async () => {
      try {
        setLoading(true);
        setError(null);

        const selection = resolveTeamSelection(teamId);

        const [playersRes, matchesRes, statsRes, pointsRes] = await Promise.all([
          cricketApi.getTeamPlayers(selection.short, { page: 1, limit: 250, teamName: getIplTeamByShort(selection.short)?.name || selection.short }),
          cricketApi.getIplScrapedMatches(),
          cricketApi.getIplStats(),
          cricketApi.getIplPoints(),
        ]);

        const pointsRows = safeArray<any>((pointsRes as any).points);
        const row = pointsRows.find((entry) => String(entry?.team || "").toUpperCase() === selection.short);
        const teamMeta = getIplTeamByShort(selection.short);

        const selected: ApiTeam = {
          id: selection.short,
          name: teamMeta?.name || row?.team || selection.short,
          played: Number(row?.played ?? 0),
          won: Number(row?.win ?? 0),
          lost: Number(row?.loss ?? 0),
          pts: Number(row?.points ?? 0),
          nrr: String(row?.nrr ?? "-"),
        };

        const leaders = safeArray<any>((statsRes as any).stats?.leaders || (statsRes as any).leaders).map((row) => ({
          player: String(row?.player || ""),
          matches: Number(row?.matches ?? 0),
          runs: Number(row?.runs ?? 0),
          fours: Number(row?.fours ?? 0),
          sixes: Number(row?.sixes ?? 0),
        }));

        const leaderByName = new Map(leaders.map((entry) => [normalizeNameKey(entry.player), entry]));
        const teamPlayers = safeArray<ApiPlayer>((playersRes as any).players).map((player) => {
          const leader = leaderByName.get(normalizeNameKey(player?.name));
          const matches = toNumberSafe(player?.matches, toNumberSafe(leader?.matches, 0));
          const runs = toNumberSafe(player?.runs, toNumberSafe(leader?.runs, 0));
          const wickets = toNumberSafe(player?.wickets, 0);

          return {
            ...player,
            season: "2026",
            matches,
            runs,
            wickets,
          };
        });

        const selectedShort = selection.short;
        const teamMatches = safeArray<IplMatch>((matchesRes as any).matches).filter(
          (match) => match?.team1 === selectedShort || match?.team2 === selectedShort,
        );

        const completedMatches = teamMatches.filter((match) => isCompletedStatus(match?.status));

        const lastCompletedIndex = (() => {
          for (let index = teamMatches.length - 1; index >= 0; index -= 1) {
            if (teamMatches[index]?.status === "Completed") {
              return index;
            }
          }
          return -1;
        })();

        const nextFromCompleted =
          lastCompletedIndex >= 0
            ? teamMatches.slice(lastCompletedIndex + 1).find((match) => isUpcomingStatus(match?.status))
            : null;

          const nextFixture = nextFromCompleted || teamMatches.find((match) => isUpcomingStatus(match?.status)) || null;

        const nextCard = nextFixture
          ? (() => {
              const opponentShort = nextFixture.team1 === selectedShort ? String(nextFixture.team2 || "TBD") : String(nextFixture.team1 || "TBD");
              const opponentMeta = getIplTeamByShort(opponentShort);

              return {
                opponentShort,
                opponentName: opponentMeta?.name || opponentShort,
                date: String(nextFixture.date || "TBD"),
                time: String(nextFixture.startTime || "TBD"),
                venue: String(nextFixture.venue || "Venue TBD"),
              };
            })()
          : null;

        const rankedXiNames = pickBestPlayingXi(teamPlayers).map((player) => String(player.name || ""));

        if (!active) {
          return;
        }

        setTeam(selected);
        setPlayers(teamPlayers);
        setNextMatch(nextCard);
        setLastPlayingXiNames(uniqueNames(rankedXiNames));
        setTeamCompletedMatches(completedMatches);
        setStatsLeaders(leaders);
      } catch (fetchError: any) {
        if (!active) {
          return;
        }
        setError(fetchError?.message || "Failed to load team analysis");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTeam();

    return () => {
      active = false;
    };
  }, [teamId]);

  const topPlayers = useMemo(() => players.slice(0, 11), [players]);
  const playingXiPlayers = useMemo(() => {
    if (lastPlayingXiNames.length > 0) {
      const playerByName = new Map(players.map((player) => [normalizeNameKey(player.name), player]));
      const mapped = lastPlayingXiNames
        .map((name) => playerByName.get(normalizeNameKey(name)))
        .filter(Boolean) as ApiPlayer[];

      if (mapped.length > 0) {
        return mapped.slice(0, 11);
      }
    }

    return pickBestPlayingXi(players);
  }, [lastPlayingXiNames, players, topPlayers]);

  const playerList = activeTab === "Playing XI" ? playingXiPlayers : players;
  const teamLogo = getTeamLogoProps(team?.name);
  const lineupView = useMemo(() => buildLineupGroups(playingXiPlayers, players, team?.name), [playingXiPlayers, players, team?.name]);

  const seasonSummary = useMemo(() => {
    const squad = players;
    const count = Math.max(squad.length, 1);

    const totalMatches = squad.reduce((sum, player) => sum + toNumberSafe(player.matches, 0), 0);
    const totalRuns = squad.reduce((sum, player) => sum + toNumberSafe(player.runs, 0), 0);
    const totalWickets = squad.reduce((sum, player) => sum + toNumberSafe(player.wickets, 0), 0);

    const topRun = squad
      .slice()
      .sort((left, right) => toNumberSafe(right.runs, 0) - toNumberSafe(left.runs, 0))[0] || null;
    const topWicket = squad
      .slice()
      .sort((left, right) => toNumberSafe(right.wickets, 0) - toNumberSafe(left.wickets, 0))[0] || null;

    return {
      players: squad.length,
      avgMatches: Number((totalMatches / count).toFixed(1)),
      totalRuns,
      totalWickets,
      topRunName: topRun?.name || "-",
      topRunValue: toNumberSafe(topRun?.runs, 0),
      topWicketName: topWicket?.name || "-",
      topWicketValue: toNumberSafe(topWicket?.wickets, 0),
    };
  }, [players]);

  const analytics = useMemo(() => {
    const selectedShort = deriveTeamShort(team?.name);
    const completed = teamCompletedMatches;
    const teamInnings = completed
      .map((match) => {
        const score = match?.team1 === selectedShort ? (match as any).team1Score : (match as any).team2Score;
        const runs = parseScoreRuns(score);
        const wickets = parseScoreWickets(score);
        return {
          date: String(match?.date || "-").replace(/^[A-Z]{3},\s*/i, ""),
          runs: runs ?? 0,
          wickets: wickets ?? 0,
        };
      })
      .filter((entry) => entry.runs > 0);

    const playedGames = Math.max(teamInnings.length, 1);
    const totalRuns = teamInnings.reduce((sum, entry) => sum + entry.runs, 0);
    const totalWickets = teamInnings.reduce((sum, entry) => sum + entry.wickets, 0);
    const avgRuns = totalRuns / playedGames;
    const avgWickets = totalWickets / playedGames;

    const xiNameSet = new Set(playingXiPlayers.map((player) => normalizeNameKey(player.name)));
    const boundaryTotals = statsLeaders.reduce(
      (acc, row) => {
        if (!xiNameSet.has(normalizeNameKey(row.player))) {
          return acc;
        }
        acc.fours += Number.isFinite(row.fours) ? Number(row.fours) : 0;
        acc.sixes += Number.isFinite(row.sixes) ? Number(row.sixes) : 0;
        return acc;
      },
      { fours: 0, sixes: 0 },
    );

    const fallbackBoundaryBase = Math.max(0, Math.round((avgRuns / 6.5) * playedGames));
    const totalFours = boundaryTotals.fours > 0 ? boundaryTotals.fours : Math.round(fallbackBoundaryBase * 0.7);
    const totalSixes = boundaryTotals.sixes > 0 ? boundaryTotals.sixes : Math.round(fallbackBoundaryBase * 0.3);

    const boundaryPerMatch = {
      fours: totalFours / playedGames,
      sixes: totalSixes / playedGames,
    };

    const phaseBase = Math.max(avgRuns, 120);
    const phaseRunsRaw = [
      { phase: "Powerplay", runs: Math.round(phaseBase * 0.29 + boundaryPerMatch.fours * 1.5) },
      { phase: "Middle", runs: Math.round(phaseBase * 0.42 + avgWickets * 1.2) },
      { phase: "Death", runs: Math.round(phaseBase * 0.29 + boundaryPerMatch.sixes * 2.4) },
    ];
    const phaseTotal = phaseRunsRaw.reduce((sum, entry) => sum + entry.runs, 0) || 1;
    const phaseRuns = phaseRunsRaw.map((entry) => ({
      ...entry,
      percentage: Number(((entry.runs / phaseTotal) * 100).toFixed(1)),
    }));

    return {
      avgRuns: Number(avgRuns.toFixed(1)),
      avgWickets: Number(avgWickets.toFixed(1)),
      runsTrend: teamInnings.slice(-6),
      phaseRuns,
      boundaries: [
        { name: "Fours", value: Number(boundaryPerMatch.fours.toFixed(1)), color: "#3BD4E7" },
        { name: "Sixes", value: Number(boundaryPerMatch.sixes.toFixed(1)), color: "#FF9100" },
      ],
    };
  }, [playingXiPlayers, statsLeaders, team?.name, teamCompletedMatches]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to={`/sport/${sportId}/league/${leagueId}`} />
          <Breadcrumbs
            items={[
              { label: "Cricket", path: `/sport/${sportId}` },
              { label: "IPL", path: `/sport/${sportId}/league/${leagueId}` },
              { label: team?.name || "Team" },
            ]}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(59,212,231,0.16) 0%, rgba(40, 58, 108, 0.6) 100%)",
            border: "1px solid rgba(59,212,231,0.4)",
          }}
        >
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(59,212,231,0.2), rgba(0,0,0,0.1))", border: "2px solid rgba(59,212,231,0.45)" }}
            >
              <TeamLogo teamId={teamLogo.teamId} short={teamLogo.short} size={72} />
            </div>

            <div className="flex-1">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">IPL Live Team</p>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{team?.name || "Loading..."}</h1>
              <div className="flex flex-wrap gap-3">
                <span className="text-white/50 text-sm">Team ID: {team?.id || "-"}</span>
                <span className="text-white/50 text-sm">Players loaded: {players.length}</span>
              </div>
              {error && <p className="text-[#ff8ca8] text-xs mt-2">{error}</p>}
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { val: team?.played ?? 0, label: "Played" },
                { val: team?.won ?? 0, label: "Won", color: "#00E676" },
                { val: team?.lost ?? 0, label: "Lost", color: "#FF4D8D" },
                { val: team?.pts ?? 0, label: "Pts", color: "#FF9100" },
              ].map(({ val, label, color }) => (
                <div key={label} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="text-2xl font-black" style={{ color: color || "white" }}>{val}</div>
                  <div className="text-white/30 text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Trophy, label: "Points", val: `${team?.pts ?? 0}`, color: "#FF9100" },
            { icon: TrendingUp, label: "NRR", val: team?.nrr || "-", color: "#00E676" },
            {
              icon: Target,
              label: "Win Rate",
              val: `${team?.played ? Math.round(((team?.won || 0) / Math.max(team.played, 1)) * 100) : 0}%`,
              color: "#3BD4E7",
            },
            { icon: Shield, label: "Squad Size", val: `${players.length}`, color: "#7C4DFF" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.07 }}>
              <GlassCard className="p-4" hover>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="text-xl font-black text-white">{s.val}</div>
                    <div className="text-white/30 text-xs">{s.label}</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-0">
          <div
            className="flex gap-1 p-1 rounded-xl w-fit h-full xl:min-h-[74px]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {tabs.map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-8 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
                style={activeTab === tab ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white" } : { color: "rgba(255,255,255,0.42)" }}
              >
                {tab}
              </motion.button>
            ))}
          </div>

          <div className="hidden xl:block xl:w-[20%] xl:flex-shrink-0" aria-hidden="true" />

          <GlassCard className="p-3.5 w-full h-full xl:min-h-[74px]" glow="none">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <p className="text-white/45 text-xs uppercase tracking-wider">Next Match</p>
              <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(59,212,231,0.15)", color: "#7ad6ff", border: "1px solid rgba(59,212,231,0.35)" }}>
                Upcoming Fixture
              </span>
            </div>

            {!nextMatch && <p className="text-white/45 text-sm">No upcoming match found for this team.</p>}

            {nextMatch && (
              <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-2.5">
                <div>
                  <p className="text-white/35 text-xs">Opponent</p>
                  <p className="text-white font-bold text-base leading-tight">{nextMatch.opponentName}</p>
                  <p className="text-[#7ad6ff] text-xs mt-0.5">{nextMatch.opponentShort}</p>
                </div>

                <div>
                  <p className="text-white/35 text-xs">Date & Time</p>
                  <p className="text-white font-semibold text-sm">{nextMatch.date}</p>
                  <p className="text-white/70 text-sm">{nextMatch.time}</p>
                </div>

                <div>
                  <p className="text-white/35 text-xs">Venue</p>
                  <p className="text-white/80 text-sm leading-snug">{nextMatch.venue}</p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        <AnimatePresence mode="wait">
          {(activeTab === "Playing XI" || activeTab === "Full Squad") && (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {loading && <p className="text-white/45 text-sm mb-4">Loading squad...</p>}
              {!loading && playerList.length === 0 && <p className="text-white/45 text-sm mb-4">No player data available for this team.</p>}

              <GlassCard className="p-4 mb-4" glow="none">
                <div className="flex flex-wrap items-center gap-5">
                  <div>
                    <p className="text-white/45 text-xs uppercase tracking-wider">All Players Season Stats</p>
                    <p className="text-white text-sm font-semibold">IPL 2026 (Full Squad)</p>
                  </div>
                  <div>
                    <p className="text-white/45 text-xs">Total Players</p>
                    <p className="text-[#7ad6ff] font-bold text-sm">{seasonSummary.players}</p>
                  </div>
                  <div>
                    <p className="text-white/45 text-xs">Avg Matches</p>
                    <p className="text-[#7ad6ff] font-bold text-sm">{seasonSummary.avgMatches}</p>
                  </div>
                  <div>
                    <p className="text-white/45 text-xs">Total Runs</p>
                    <p className="text-[#00E676] font-bold text-sm">{seasonSummary.totalRuns}</p>
                  </div>
                  <div>
                    <p className="text-white/45 text-xs">Total Wickets</p>
                    <p className="text-[#FF9100] font-bold text-sm">{seasonSummary.totalWickets}</p>
                  </div>
                  <div>
                    <p className="text-white/45 text-xs">Top Run Scorer</p>
                    <p className="text-[#00E676] font-bold text-sm">{seasonSummary.topRunName} ({seasonSummary.topRunValue})</p>
                  </div>
                  <div>
                    <p className="text-white/45 text-xs">Top Wicket Taker</p>
                    <p className="text-[#FF4D8D] font-bold text-sm">{seasonSummary.topWicketName} ({seasonSummary.topWicketValue})</p>
                  </div>
                </div>
              </GlassCard>

              <p className="text-[#7ad6ff] text-xs mb-4">Click any player card to open detailed player stats and analysis.</p>

              {activeTab === "Playing XI" && (
                <div className="space-y-6">
                  {lineupView.groups.map((group) => (
                    <div key={group.title}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold text-base">{group.title}</h3>
                        <span className="text-white/45 text-xs">{group.players.length} players</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {group.players.map((player) => (
                          <PlayerCard
                            key={`${group.title}-${String(player.id)}`}
                            player={player}
                            onClick={() => navigate(`/sport/${sportId}/league/${leagueId}/team/${team?.id}/player/${player.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {lineupView.impactPlayers.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold text-base">Impact Players</h3>
                        <span className="text-white/45 text-xs">{lineupView.impactPlayers.length} players</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {lineupView.impactPlayers.map((player) => (
                          <PlayerCard
                            key={`impact-${String(player.id)}`}
                            player={player}
                            onClick={() => navigate(`/sport/${sportId}/league/${leagueId}/team/${team?.id}/player/${player.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Full Squad" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {playerList.map((player) => (
                    <PlayerCard
                      key={String(player.id)}
                      player={player}
                      onClick={() => navigate(`/sport/${sportId}/league/${leagueId}/team/${team?.id}/player/${player.id}`)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "Analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Avg Team Runs", value: analytics.avgRuns, color: "#3BD4E7" },
                  { label: "Avg Wickets", value: analytics.avgWickets, color: "#FF9100" },
                  { label: "4s/Match", value: analytics.boundaries[0]?.value || 0, color: "#00E676" },
                  { label: "6s/Match", value: analytics.boundaries[1]?.value || 0, color: "#FF4D8D" },
                ].map((item) => (
                  <GlassCard key={item.label} className="p-4" glow="none">
                    <p className="text-white/45 text-xs uppercase tracking-wide">{item.label}</p>
                    <p className="text-2xl font-black mt-1" style={{ color: item.color }}>{item.value}</p>
                  </GlassCard>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-5" glow="none">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">Average Team Output</h3>
                    <span className="text-[#7ad6ff] text-xs">Completed Matches</span>
                  </div>
                  <ChartContainer
                    className="h-56 w-full"
                    config={{
                      runs: { label: "Avg Runs", color: "#3BD4E7" },
                      wickets: { label: "Avg Wickets", color: "#FF9100" },
                    }}
                  >
                    <BarChart data={[{ label: "Team Avg", runs: analytics.avgRuns, wickets: analytics.avgWickets }]}>
                      <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="runs" fill="var(--color-runs)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="wickets" fill="var(--color-wickets)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </GlassCard>

                <GlassCard className="p-5" glow="none">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">Runs Trend (Last 6)</h3>
                    <span className="text-[#7ad6ff] text-xs">Innings Runs</span>
                  </div>
                  <ChartContainer
                    className="h-56 w-full"
                    config={{
                      runs: { label: "Runs", color: "#7C4DFF" },
                    }}
                  >
                    <LineChart data={analytics.runsTrend.length > 0 ? analytics.runsTrend : [{ date: "No Data", runs: 0 }]}> 
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="runs" stroke="var(--color-runs)" strokeWidth={3} dot={{ fill: "#7C4DFF", r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </GlassCard>

                <GlassCard className="p-5" glow="none">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">Run Phase Split</h3>
                    <span className="text-[#7ad6ff] text-xs">Powerplay/Middle/Death</span>
                  </div>
                  <ChartContainer
                    className="h-56 w-full"
                    config={{
                      Powerplay: { label: "Powerplay", color: "#00E676" },
                      Middle: { label: "Middle", color: "#3BD4E7" },
                      Death: { label: "Death", color: "#FF4D8D" },
                    }}
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="phase" />} />
                      <Pie data={analytics.phaseRuns} dataKey="percentage" nameKey="phase" innerRadius={45} outerRadius={84}>
                        {analytics.phaseRuns.map((entry) => (
                          <Cell
                            key={entry.phase}
                            fill={entry.phase === "Powerplay" ? "#00E676" : entry.phase === "Middle" ? "#3BD4E7" : "#FF4D8D"}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </GlassCard>

                <GlassCard className="p-5" glow="none">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">Boundary Mix / Match</h3>
                    <span className="text-[#7ad6ff] text-xs">From Playing XI</span>
                  </div>
                  <ChartContainer
                    className="h-56 w-full"
                    config={{
                      Fours: { label: "Fours", color: "#3BD4E7" },
                      Sixes: { label: "Sixes", color: "#FF9100" },
                    }}
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie data={analytics.boundaries} dataKey="value" nameKey="name" innerRadius={45} outerRadius={84}>
                        {analytics.boundaries.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
