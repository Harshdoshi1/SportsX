import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Calendar } from "lucide-react";
import { cricketApi } from "../../services/cricketApi";
import { deriveTeamShort, getTeamLogoProps, isIplTeamName, isUpcomingStatus, normalizeText, safeArray, slugify } from "../../services/cricketUi";
import { getIplTeamByShort } from "../../data/iplTeams";
import { IPL_PLAYER_IMAGES, IPL_STATS_SECTIONS } from "../../data/ipl2026";

type LeagueKey = "ipl" | "f1-2026" | "epl";

type IplTeamRow = {
  teamId: string;
  short: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  pts: number;
  nrr: string;
};

type IplMatchRow = {
  id: string;
  date: string;
  startTime: string;
  team1: string;
  team2: string;
  team1Display: string;
  team2Display: string;
  team1Score: string;
  team2Score: string;
  matchNo: string;
  result: string;
  venue: string;
  status: string;
};

type IplStatsRow = {
  player: string;
  image: string | null;
  teamShort: string | null;
  teamName: string | null;
  matches: number | null;
  innings: number | null;
  runs: number | null;
  average: string;
  strikeRate: string;
  fours: number | null;
  sixes: number | null;
};

type IplBowlingStatsRow = {
  player: string;
  image: string | null;
  teamShort: string | null;
  teamName: string | null;
  matches: number | null;
  innings: number | null;
  overs: string;
  runsConceded: number | null;
  wickets: number | null;
  bbi: string;
  average: string;
  economy: string;
  strikeRate: string;
};

type IplSimpleStatRow = {
  player: string;
  image: string | null;
  teamShort: string | null;
  teamName: string | null;
  value: string;
  rank: number;
};

type IplNewsItem = {
  title: string;
  summary: string | null;
  publishedAt: string;
  tag: string;
};

const tabs = ["Points Table", "Matches", "Stats", "News"];

const requiredBattingCategories = [
  "Most Runs",
  "Highest Scores",
  "Best Batting Average",
  "Best Batting Strike Rate",
  "Most Hundreds",
  "Most Fifties",
  "Most Fours",
  "Most Sixes",
  "Most Nineties",
];

const requiredBowlingCategories = [
  "Most Wickets",
  "Best Bowling Average",
  "Best Bowling",
  "Most 5 Wickets Haul",
  "Best Economy",
  "Best Bowling Strike Rate",
];

const genericSnapshots = {
  "f1-2026": {
    sportName: "Formula 1",
    title: "F1 2026",
    summary: "Kimi Antonelli leads with 97 points. Mercedes lead constructors with 135+.",
    bullets: ["Youngest ever WDC leader", "Bahrain and Saudi cancelled", "Next race: Miami GP (Apr 30-May 3)"],
  },
  epl: {
    sportName: "Football",
    title: "Premier League 2025-26",
    summary: "Arsenal top with 70 points, six clear of Manchester City.",
    bullets: ["Promoted: Sunderland, Burnley, Leeds", "Burnley and Wolves in relegation zone"],
  },
};

export function League() {
  const navigate = useNavigate();
  const { sportId, leagueId } = useParams<{ sportId: string; leagueId: string }>();
  const [activeTab, setActiveTab] = useState("Points Table");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iplTeams, setIplTeams] = useState<IplTeamRow[]>([]);
  const [iplMatches, setIplMatches] = useState<IplMatchRow[]>([]);
  const [iplStats, setIplStats] = useState<IplStatsRow[]>([]);
  const [iplBowlingStats, setIplBowlingStats] = useState<IplBowlingStatsRow[]>([]);
  const [mostHundreds, setMostHundreds] = useState<IplSimpleStatRow[]>([]);
  const [mostFifties, setMostFifties] = useState<IplSimpleStatRow[]>([]);
  const [highestScores, setHighestScores] = useState<IplSimpleStatRow[]>([]);
  const [bestBowling, setBestBowling] = useState<IplSimpleStatRow[]>([]);
  const [bestEconomy, setBestEconomy] = useState<IplSimpleStatRow[]>([]);
  const [mostSixes, setMostSixes] = useState<IplSimpleStatRow[]>([]);
  const [mostFours, setMostFours] = useState<IplSimpleStatRow[]>([]);
  const [statsCategories, setStatsCategories] = useState<{ batting: string[]; bowling: string[] }>({ batting: [], bowling: [] });
  const [iplNews, setIplNews] = useState<IplNewsItem[]>([]);
  const leagueKey: LeagueKey = leagueId === "f1-2026" ? "f1-2026" : leagueId === "epl" ? "epl" : "ipl";

  useEffect(() => {
    if (leagueKey !== "ipl") {
      return;
    }

    let active = true;

    const loadLeague = async () => {
      try {
        setLoading(true);
        setError(null);

        const [teamsRes, matchesRes, statsRes, newsRes] = await Promise.all([
          cricketApi.getIplPoints(),
          cricketApi.getIplScrapedMatches(),
          cricketApi.getIplStats(),
          cricketApi.getIplNews(),
        ]);

        if (!active) {
          return;
        }

        const teams = safeArray<any>((teamsRes as any).points)
          .filter((team) => isIplTeamName(team?.team))
          .map((team) => ({
            teamId: String(team?.team || "unknown-team"),
            short: deriveTeamShort(team?.team),
            name: team?.team || "Unknown Team",
            played: Number(team?.played ?? 0),
            won: Number(team?.win ?? 0),
            lost: Number(team?.loss ?? 0),
            pts: Number(team?.points ?? 0),
            nrr: String(team?.nrr ?? "-"),
          }))
          .sort((a, b) => b.pts - a.pts || b.won - a.won);

        const playerImageByName = new Map<string, { image: string | null; teamShort: string | null; teamName: string | null }>();
        const statsImageByName = new Map<string, string>();

        for (const section of IPL_STATS_SECTIONS) {
          for (const entry of section.entries) {
            const key = normalizeText(entry.player);
            if (key && entry.image && !statsImageByName.has(key)) {
              statsImageByName.set(key, entry.image);
            }
          }
        }
        const playerResponses = await Promise.allSettled(
          teams.map((team) =>
            cricketApi.getTeamPlayers(team.short, {
              page: 1,
              limit: 250,
              teamName: team.name,
            }),
          ),
        );

        for (let i = 0; i < playerResponses.length; i += 1) {
          const result = playerResponses[i];
          const team = teams[i];
          if (result.status !== "fulfilled") {
            continue;
          }

          const teamPlayers = safeArray<any>((result.value as any)?.players);
          for (const player of teamPlayers) {
            const key = normalizeText(player?.name);
            if (!key) {
              continue;
            }

            if (playerImageByName.has(key)) {
              continue;
            }

            playerImageByName.set(key, {
              image: player?.image ? String(player.image) : null,
              teamShort: team?.short || null,
              teamName: team?.name || null,
            });
          }
        }

        const matches = safeArray<any>((matchesRes as any).matches).map((match) => ({
          id: String(match?.id || `${match?.team1 || "team1"}-${match?.team2 || "team2"}`),
          date: String(match?.date || "").trim() || "TBA",
          startTime: String(match?.startTime || "").trim(),
          team1: String(match?.team1 || "Team A"),
          team2: String(match?.team2 || "Team B"),
          team1Display: String(match?.team1Name || match?.team1 || "Team A"),
          team2Display: String(match?.team2Name || match?.team2 || "Team B"),
          team1Score: String(match?.team1Score || "").trim(),
          team2Score: String(match?.team2Score || "").trim(),
          matchNo: String(match?.matchNo || "").trim(),
          result: match?.result || match?.status || "Status unavailable",
          venue: match?.venue || "Venue unavailable",
          status: String(match?.status || ""),
        }));

        const statsPayload: any = (statsRes as any)?.stats || {};

        const statsRows = safeArray<any>(statsPayload?.leaders).map((row) => {
          const playerName = String(row?.player || "Unknown Player");
          const key = normalizeText(playerName);
          const slug = slugify(playerName);
          const lookup = playerImageByName.get(key);

          // Priority: 1) Backend ESPN Cricinfo image, 2) Squad data, 3) Static mapping, 4) Stats data
          const image = row?.image
            ? String(row.image)
            : lookup?.image || IPL_PLAYER_IMAGES[slug] || statsImageByName.get(key) || null;

          return {
            player: playerName,
            image,
            teamShort: row?.teamShort || lookup?.teamShort || null,
            teamName: row?.teamName || lookup?.teamName || null,
            matches: row?.matches ?? null,
            innings: row?.innings ?? null,
            runs: row?.runs ?? null,
            average: String(row?.average ?? "-"),
            strikeRate: String(row?.strikeRate ?? "-"),
            fours: row?.fours ?? null,
            sixes: row?.sixes ?? null,
          };
        });

        const bowlingRows = safeArray<any>(statsPayload?.bowlingLeaders).map((row) => {
          const playerName = String(row?.player || "Unknown Player");
          const key = normalizeText(playerName);
          const slug = slugify(playerName);
          const lookup = playerImageByName.get(key);

          // Priority: 1) Backend ESPN Cricinfo image, 2) Squad data, 3) Static mapping, 4) Stats data
          const image = row?.image
            ? String(row.image)
            : lookup?.image || IPL_PLAYER_IMAGES[slug] || statsImageByName.get(key) || null;

          return {
            player: playerName,
            image,
            teamShort: row?.teamShort || lookup?.teamShort || null,
            teamName: row?.teamName || lookup?.teamName || null,
            matches: row?.matches ?? null,
            innings: row?.innings ?? null,
            overs: String(row?.overs ?? "-"),
            runsConceded: row?.runs ?? null,
            wickets: row?.wickets ?? null,
            bbi: String(row?.bbi ?? "-"),
            average: String(row?.average ?? "-"),
            economy: String(row?.economy ?? "-"),
            strikeRate: String(row?.strikeRate ?? "-"),
          };
        });

        const categories = {
          batting: safeArray<string>(statsPayload?.categories?.batting),
          bowling: safeArray<string>(statsPayload?.categories?.bowling),
        };

        const newsItems = safeArray<any>((newsRes as any)?.news).map((item) => ({
          title: String(item?.title || "Untitled"),
          summary: item?.summary ? String(item.summary) : null,
          publishedAt: String(item?.publishedAt || ""),
          tag: String(item?.tag || "IPL 2026"),
        }));

        // Parse additional category leaderboards from ESPN Cricinfo scraper
        const parseSimpleLeaderboard = (data: any[]): IplSimpleStatRow[] => {
          return safeArray<any>(data).map((row) => {
            const playerName = String(row?.player || "Unknown Player");
            const key = normalizeText(playerName);
            const slug = slugify(playerName);
            const lookup = playerImageByName.get(key);

            // Priority: 1) Backend ESPN Cricinfo image, 2) Squad data, 3) Static mapping, 4) Stats data
            const image = row?.image
              ? String(row.image)
              : lookup?.image || IPL_PLAYER_IMAGES[slug] || statsImageByName.get(key) || null;

            return {
              player: playerName,
              image,
              teamShort: row?.teamShort || lookup?.teamShort || null,
              teamName: row?.teamName || lookup?.teamName || null,
              value: String(row?.value || "-"),
              rank: Number(row?.rank) || 0,
            };
          });
        };

        setIplTeams(teams);
        setIplMatches(matches);
        setIplStats(statsRows);
        setIplBowlingStats(bowlingRows);
        setMostHundreds(parseSimpleLeaderboard(statsPayload?.mostHundreds));
        setMostFifties(parseSimpleLeaderboard(statsPayload?.mostFifties));
        setHighestScores(parseSimpleLeaderboard(statsPayload?.highestScores));
        setBestBowling(parseSimpleLeaderboard(statsPayload?.bestBowling));
        setBestEconomy(parseSimpleLeaderboard(statsPayload?.bestEconomy));
        setMostSixes(parseSimpleLeaderboard(statsPayload?.mostSixes));
        setMostFours(parseSimpleLeaderboard(statsPayload?.mostFours));
        setStatsCategories(categories);
        setIplNews(newsItems);
      } catch (fetchError: any) {
        if (!active) {
          return;
        }
        setError(fetchError?.message || "Failed to load IPL data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadLeague();

    return () => {
      active = false;
    };
  }, [leagueKey]);

  const matchOrder = (value: string) => {
    const parsed = Number(String(value || "").match(/\d+/)?.[0]);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  };

  const completedResults = useMemo(
    () =>
      iplMatches
        .filter((match) => match.status === "Completed")
        .sort((a, b) => matchOrder(b.matchNo) - matchOrder(a.matchNo))
        .slice(0, 40),
    [iplMatches],
  );

  const upcomingFixtures = useMemo(
    () =>
      iplMatches
        .filter((match) => isUpcomingStatus(match.status))
        .sort((a, b) => matchOrder(a.matchNo) - matchOrder(b.matchNo))
        .slice(0, 40),
    [iplMatches],
  );

  const runLeaders = useMemo(
    () =>
      iplStats
        .slice()
        .sort((a, b) => Number(b.runs ?? 0) - Number(a.runs ?? 0) || Number(b.matches ?? 0) - Number(a.matches ?? 0))
        .map((row, index) => ({ ...row, rank: index + 1 })),
    [iplStats],
  );

  const topRunLeaders = useMemo(() => runLeaders.slice(0, 10), [runLeaders]);

  const runRankByPlayer = useMemo(() => {
    const rankMap = new Map<string, number>();
    for (const row of runLeaders) {
      const key = normalizeText(row.player);
      if (key && !rankMap.has(key)) {
        rankMap.set(key, row.rank);
      }
    }
    return rankMap;
  }, [runLeaders]);

  const wicketLeaders = useMemo(
    () =>
      iplBowlingStats
        .slice()
        .sort((a, b) => Number(b.wickets ?? 0) - Number(a.wickets ?? 0) || Number(b.matches ?? 0) - Number(a.matches ?? 0))
        .map((row, index) => ({ ...row, rank: index + 1 })),
    [iplBowlingStats],
  );

  const topWicketLeaders = useMemo(() => wicketLeaders.slice(0, 10), [wicketLeaders]);

  const wicketRankByPlayer = useMemo(() => {
    const rankMap = new Map<string, number>();
    for (const row of wicketLeaders) {
      const key = normalizeText(row.player);
      if (key && !rankMap.has(key)) {
        rankMap.set(key, row.rank);
      }
    }
    return rankMap;
  }, [wicketLeaders]);

  const displayedBattingCategories = useMemo(
    () => Array.from(new Set([...requiredBattingCategories, ...safeArray(statsCategories.batting)])),
    [statsCategories.batting],
  );

  const displayedBowlingCategories = useMemo(
    () => Array.from(new Set([...requiredBowlingCategories, ...safeArray(statsCategories.bowling)])),
    [statsCategories.bowling],
  );

  if (leagueKey !== "ipl") {
    const generic = genericSnapshots[leagueKey];
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <BackButton to={sportId ? `/sport/${sportId}` : "/dashboard"} />
            <Breadcrumbs items={[{ label: generic.sportName, path: `/sport/${sportId}` }, { label: generic.title }]} />
          </div>
          <GlassCard className="p-8">
            <h1 className="text-3xl font-black text-white mb-3">{generic.title}</h1>
            <p className="text-white/55 mb-5">{generic.summary}</p>
            <div className="space-y-2">
              {generic.bullets.map((b) => (
                <p key={b} className="text-sm text-white/65">- {b}</p>
              ))}
            </div>
          </GlassCard>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to={sportId ? `/sport/${sportId}` : "/dashboard"} />
          <Breadcrumbs items={[{ label: "Cricket", path: `/sport/${sportId}` }, { label: "IPL 2026" }]} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-8 mb-8"
          style={{
            background: "linear-gradient(140deg, rgba(24, 17, 54, 0.85) 0%, rgba(13, 26, 50, 0.9) 100%)",
            border: "1px solid rgba(160,180,255,0.16)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-white/35 text-xs uppercase tracking-widest mb-1">Indian Premier League</p>
              <h1 className="text-4xl font-black text-white mb-2">IPL Live Data</h1>
              <p className="text-white/55 text-sm">League cards are now powered by backend API responses. Missing fields are shown as "-" when the provider does not expose them.</p>
              {error && <p className="text-[#ff8ca8] text-xs mt-2">{error}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[ [String(iplTeams.length), "Teams"], [String(iplMatches.length), "Matches"], [String(completedResults.length), "Completed"] ].map(([v, l]) => (
                <div key={l} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-2xl font-black text-white">{v}</div>
                  <div className="text-xs text-white/30">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="flex gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={
                activeTab === tab
                  ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white", boxShadow: "0 0 20px rgba(59,212,231,0.25)" }
                  : { color: "rgba(255,255,255,0.45)" }
              }
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "Points Table" && (
            <motion.div key="points" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <GlassCard className="overflow-hidden">
                <div className="grid grid-cols-[2.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.8fr] gap-2 px-6 py-4 text-xs uppercase tracking-wider text-white/30 font-semibold" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span>Team</span>
                  <span className="text-center">P</span>
                  <span className="text-center">W</span>
                  <span className="text-center">L</span>
                  <span className="text-center">Pts</span>
                  <span className="text-center hidden md:block">NRR</span>
                </div>

                {loading && (
                  <div className="px-6 py-5 text-sm text-white/45">Loading IPL teams...</div>
                )}

                {!loading && iplTeams.length === 0 && (
                  <div className="px-6 py-5 text-sm text-white/45">No IPL team rows were returned by the API.</div>
                )}

                {iplTeams.map((row, idx) => {
                  const logo = getTeamLogoProps(row.name);
                  return (
                  <motion.div
                    key={row.teamId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="grid grid-cols-[2.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.8fr] gap-2 px-6 py-4 items-center cursor-pointer group"
                    style={{
                      borderBottom: idx < iplTeams.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      background: idx < 4 ? "linear-gradient(90deg, rgba(65, 117, 255, 0.08), rgba(40, 185, 255, 0.03))" : "transparent",
                    }}
                    whileHover={{ background: "rgba(255,255,255,0.07)" }}
                    onClick={() => navigate(`/sport/${sportId}/league/${leagueId}/team/${row.teamId}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-white/20 text-xs w-4 text-right">{idx + 1}</span>
                      <TeamLogo teamId={logo.teamId} short={row.short} size={34} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm group-hover:text-[#7ad6ff] transition-colors">{row.short}</p>
                        <p className="text-white/35 text-xs truncate">{row.name}</p>
                      </div>
                    </div>
                    <span className="text-center text-white/65 text-sm">{row.played}</span>
                    <span className="text-center text-sm" style={{ color: "#00E676" }}>{row.won}</span>
                    <span className="text-center text-sm" style={{ color: "#FF4D8D" }}>{row.lost}</span>
                    <span className="text-center text-white font-black">{row.pts}</span>
                    <span className="text-center text-xs font-mono hidden md:block" style={{ color: row.nrr.startsWith("+") ? "#00E676" : row.nrr.startsWith("-") ? "#FF4D8D" : "#a6b0c4" }}>{row.nrr}</span>
                  </motion.div>
                );})}

                <div className="px-6 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(59,212,231,0.05)" }}>
                  <span className="w-2 h-2 rounded-full bg-[#3BD4E7]" />
                  <span className="text-white/35 text-xs">Click any team row to open team analysis with live squad data.</span>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "Matches" && (
            <motion.div key="matches" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold">Upcoming Fixtures</h3>
                  <span className="text-white/35 text-xs">Live schedule from IPLT20</span>
                </div>
                {upcomingFixtures.length === 0 && <div className="px-6 py-5 text-sm text-white/45">No upcoming IPL fixtures available in the current response.</div>}
                <div className="space-y-3 p-4 md:p-6">
                  {upcomingFixtures.map((fixture, index) => {
                    const homeTeam = getIplTeamByShort(String(fixture.team1 || "").toUpperCase());
                    const awayTeam = getIplTeamByShort(String(fixture.team2 || "").toUpperCase());
                    const homeLogo = homeTeam ? { teamId: homeTeam.id, short: homeTeam.short } : getTeamLogoProps(fixture.team1);
                    const awayLogo = awayTeam ? { teamId: awayTeam.id, short: awayTeam.short } : getTeamLogoProps(fixture.team2);
                    return (
                      <motion.div
                        key={fixture.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="rounded-2xl p-4 md:p-5"
                        style={{
                          background:
                            index === 0
                              ? "linear-gradient(135deg, rgba(59,212,231,0.16), rgba(124,77,255,0.16))"
                              : "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-center gap-4 md:gap-6">
                            <div className="flex items-center gap-3 min-w-0">
                              <TeamLogo teamId={homeLogo.teamId} short={fixture.team1} size={42} />
                              <div className="min-w-0">
                                <p className="text-white font-semibold text-sm md:text-base truncate">{fixture.team1Display}</p>
                                <p className="text-white/35 text-xs">{fixture.team1}</p>
                              </div>
                            </div>
                            <span className="text-white/45 font-black tracking-wide">VS</span>
                            <div className="flex items-center gap-3 min-w-0">
                              <TeamLogo teamId={awayLogo.teamId} short={fixture.team2} size={42} />
                              <div className="min-w-0">
                                <p className="text-white font-semibold text-sm md:text-base truncate">{fixture.team2Display}</p>
                                <p className="text-white/35 text-xs">{fixture.team2}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs md:text-sm">
                            {index === 0 && <span className="px-2 py-1 rounded-md font-bold" style={{ background: "rgba(59,212,231,0.18)", color: "#7ad6ff" }}>NEXT</span>}
                            <span className="px-2 py-1 rounded-md text-white/85" style={{ background: "rgba(255,255,255,0.08)" }}>
                              <Calendar size={12} className="inline mr-1.5" />
                              {fixture.date || "TBA"}
                            </span>
                            <span className="px-2 py-1 rounded-md font-semibold" style={{ background: "rgba(255,145,0,0.18)", color: "#ffc57a" }}>
                              {fixture.startTime || "Time TBA"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 text-xs text-white/45" style={{ borderTop: "1px dashed rgba(255,255,255,0.14)" }}>
                          {fixture.matchNo ? `${fixture.matchNo} • ` : ""}
                          {fixture.venue}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>

              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold">Completed Matches</h3>
                </div>
                {completedResults.length === 0 && <div className="px-6 py-5 text-sm text-white/45">No completed IPL matches available in the current response.</div>}
                <div className="space-y-3 p-4 md:p-6">
                  {completedResults.map((match, index) => {
                    const homeTeam = getIplTeamByShort(String(match.team1 || "").toUpperCase());
                    const awayTeam = getIplTeamByShort(String(match.team2 || "").toUpperCase());
                    const homeLogo = homeTeam ? { teamId: homeTeam.id, short: homeTeam.short } : getTeamLogoProps(match.team1);
                    const awayLogo = awayTeam ? { teamId: awayTeam.id, short: awayTeam.short } : getTeamLogoProps(match.team2);
                    return (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.015 }}
                        className="rounded-2xl p-4 md:p-5"
                        style={{
                          background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-center gap-4 md:gap-6">
                            <div className="flex items-center gap-3 min-w-0">
                              <TeamLogo teamId={homeLogo.teamId} short={match.team1} size={38} />
                              <div className="min-w-0">
                                <p className="text-white font-semibold text-sm truncate">{match.team1Display}</p>
                                <p className="text-[#7ad6ff] text-xs font-mono">{match.team1Score || "-"}</p>
                              </div>
                            </div>
                            <span className="text-white/45 font-black tracking-wide">VS</span>
                            <div className="flex items-center gap-3 min-w-0">
                              <TeamLogo teamId={awayLogo.teamId} short={match.team2} size={38} />
                              <div className="min-w-0">
                                <p className="text-white font-semibold text-sm truncate">{match.team2Display}</p>
                                <p className="text-[#7ad6ff] text-xs font-mono">{match.team2Score || "-"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-white text-sm font-semibold">{match.result}</p>
                            <p className="text-white/45 text-xs mt-1">{match.date || "Date unavailable"}{match.startTime ? ` • ${match.startTime}` : ""}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 text-xs text-white/45" style={{ borderTop: "1px dashed rgba(255,255,255,0.14)" }}>
                          {match.matchNo ? `${match.matchNo} • ` : ""}
                          {match.venue}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "Stats" && (
            <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {iplStats.length === 0 && (
                <GlassCard className="p-6 text-sm text-white/45">No IPL stats were returned by the scraper.</GlassCard>
              )}

              {iplStats.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-base">Orange Cap Race</h3>
                      <p className="text-white/45 text-xs mt-1">Top run scorers</p>
                    </div>
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ background: "rgba(255,145,0,0.18)", color: "#ffc57a" }}>
                      Top 10
                    </span>
                  </div>

                  <div className="space-y-4">
                    {topRunLeaders.map((row, idx) => {
                    const playerRank = runRankByPlayer.get(normalizeText(row.player)) ?? null;
                    const logo = row.teamShort ? getTeamLogoProps(row.teamShort) : null;

                    return (
                      <motion.div
                        key={`${row.player}-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                      >
                        <div
                          className="rounded-2xl px-4 py-3 md:px-5 md:py-4"
                          style={{
                            background: "linear-gradient(90deg, rgba(6,10,22,0.92) 0%, rgba(8,12,28,0.9) 55%, rgba(6,10,22,0.92) 100%)",
                            border: "1px solid rgba(150,170,255,0.14)",
                          }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 items-stretch">
                            <div className="flex items-center gap-3 min-w-0 h-full md:self-center">
                              {playerRank && (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                                  style={{
                                    background:
                                      playerRank === 1
                                        ? "linear-gradient(135deg, rgba(255,193,102,0.40), rgba(255,145,0,0.28))"
                                        : "rgba(255,255,255,0.06)",
                                    border:
                                      playerRank === 1
                                        ? "1px solid rgba(255,193,102,0.45)"
                                        : "1px solid rgba(255,255,255,0.10)",
                                    color: playerRank === 1 ? "#fff2c2" : "rgba(255,255,255,0.65)",
                                    flexShrink: 0,
                                  }}
                                >
                                  #{playerRank}
                                </div>
                              )}

                              <div
                                className="rounded-full overflow-hidden flex items-center justify-center"
                                style={{ width: 48, height: 48, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}
                              >
                                {row.image ? (
                                  <ImageWithFallback
                                    src={row.image}
                                    alt={row.player}
                                    fallbackMode="person"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  <span className="text-white/50 text-xs font-bold">N/A</span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-white font-semibold text-sm md:text-base leading-tight truncate">{row.player}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {logo && <TeamLogo teamId={logo.teamId} short={logo.short} size={18} />}
                                  <p className="text-white/45 text-xs truncate">{row.teamName || row.teamShort || "IPL"}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 md:items-end">
                              <div className="grid grid-cols-3 gap-2 md:w-[340px]">
                                <div className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(59,212,231,0.14)", border: "1px solid rgba(59,212,231,0.16)" }}>
                                  <p className="text-white/40 text-[10px] uppercase tracking-wide">Mat</p>
                                  <p className="text-[#7ad6ff] font-black text-sm">{row.matches ?? "-"}</p>
                                </div>
                                <div className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(0,230,118,0.14)", border: "1px solid rgba(0,230,118,0.16)" }}>
                                  <p className="text-white/40 text-[10px] uppercase tracking-wide">Runs</p>
                                  <p className="text-[#00E676] font-black text-sm">{row.runs ?? "-"}</p>
                                </div>
                                <div className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(255,145,0,0.16)", border: "1px solid rgba(255,145,0,0.16)" }}>
                                  <p className="text-white/40 text-[10px] uppercase tracking-wide">SR</p>
                                  <p className="text-[#ffc57a] font-black text-sm">{row.strikeRate}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-xs text-white/60 md:max-w-[340px] md:ml-auto">
                                <div>Avg: <span className="text-white/85">{row.average}</span></div>
                                <div>4s: <span className="text-white/85">{row.fours ?? "-"}</span></div>
                                <div>6s: <span className="text-white/85">{row.sixes ?? "-"}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                    })}
                  </div>

                  {topWicketLeaders.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mt-8 mb-4">
                        <div>
                          <h3 className="text-white font-bold text-base">Purple Cap Race</h3>
                          <p className="text-white/45 text-xs mt-1">Most wickets</p>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ background: "rgba(124,77,255,0.20)", color: "#c5a8ff" }}>
                          Top 10
                        </span>
                      </div>

                      <div className="space-y-4">
                        {topWicketLeaders.map((row, idx) => {
                          const playerRank = wicketRankByPlayer.get(normalizeText(row.player)) ?? null;
                          const logo = row.teamShort ? getTeamLogoProps(row.teamShort) : null;

                          return (
                            <motion.div
                              key={`${row.player}-${idx}-wickets`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.02 }}
                            >
                              <div
                                className="rounded-2xl px-4 py-3 md:px-5 md:py-4"
                                style={{
                                  background: "linear-gradient(90deg, rgba(6,10,22,0.92) 0%, rgba(8,12,28,0.9) 55%, rgba(6,10,22,0.92) 100%)",
                                  border: "1px solid rgba(150,170,255,0.14)",
                                }}
                              >
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 items-stretch">
                                  <div className="flex items-center gap-3 min-w-0 h-full md:self-center">
                                    {playerRank && (
                                      <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                                        style={{
                                          background:
                                            playerRank === 1
                                              ? "linear-gradient(135deg, rgba(124,77,255,0.45), rgba(124,77,255,0.25))"
                                              : "rgba(255,255,255,0.06)",
                                          border:
                                            playerRank === 1
                                              ? "1px solid rgba(124,77,255,0.55)"
                                              : "1px solid rgba(255,255,255,0.10)",
                                          color: playerRank === 1 ? "#efe8ff" : "rgba(255,255,255,0.65)",
                                          flexShrink: 0,
                                        }}
                                      >
                                        #{playerRank}
                                      </div>
                                    )}

                                    <div
                                      className="rounded-full overflow-hidden flex items-center justify-center"
                                      style={{ width: 48, height: 48, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}
                                    >
                                      {row.image ? (
                                        <ImageWithFallback
                                          src={row.image}
                                          alt={row.player}
                                          fallbackMode="person"
                                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                      ) : (
                                        <span className="text-white/50 text-xs font-bold">N/A</span>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="text-white font-semibold text-sm md:text-base leading-tight truncate">{row.player}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {logo && <TeamLogo teamId={logo.teamId} short={logo.short} size={18} />}
                                        <p className="text-white/45 text-xs truncate">{row.teamName || row.teamShort || "IPL"}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-3 md:items-end">
                                    <div className="grid grid-cols-3 gap-2 md:w-[340px]">
                                      <div className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(59,212,231,0.14)", border: "1px solid rgba(59,212,231,0.16)" }}>
                                        <p className="text-white/40 text-[10px] uppercase tracking-wide">Mat</p>
                                        <p className="text-[#7ad6ff] font-black text-sm">{row.matches ?? "-"}</p>
                                      </div>
                                      <div className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(124,77,255,0.20)", border: "1px solid rgba(124,77,255,0.22)" }}>
                                        <p className="text-white/40 text-[10px] uppercase tracking-wide">Wkts</p>
                                        <p className="text-[#c5a8ff] font-black text-sm">{row.wickets ?? "-"}</p>
                                      </div>
                                      <div className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(0,230,118,0.14)", border: "1px solid rgba(0,230,118,0.16)" }}>
                                        <p className="text-white/40 text-[10px] uppercase tracking-wide">Econ</p>
                                        <p className="text-[#00E676] font-black text-sm">{row.economy}</p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-xs text-white/60 md:max-w-[340px] md:ml-auto">
                                      <div>Avg: <span className="text-white/85">{row.average}</span></div>
                                      <div>SR: <span className="text-white/85">{row.strikeRate}</span></div>
                                      <div>BBI: <span className="text-white/85">{row.bbi}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Additional Category Leaderboards */}
                  {mostHundreds.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mt-8 mb-4">
                        <div>
                          <h3 className="text-white font-bold text-base">Most Hundreds</h3>
                          <p className="text-white/45 text-xs mt-1">Century makers</p>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ background: "rgba(255,193,102,0.20)", color: "#ffd8a8" }}>
                          Top 10
                        </span>
                      </div>
                      <div className="space-y-4">
                        {mostHundreds.slice(0, 10).map((row, idx) => {
                          const logo = row.teamShort ? getTeamLogoProps(row.teamShort) : null;
                          return (
                            <motion.div key={`${row.player}-${idx}-100s`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                              <div className="rounded-2xl px-4 py-3 md:px-5 md:py-4" style={{ background: "linear-gradient(90deg, rgba(6,10,22,0.92) 0%, rgba(8,12,28,0.9) 55%, rgba(6,10,22,0.92) 100%)", border: "1px solid rgba(150,170,255,0.14)" }}>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 items-stretch">
                                  <div className="flex items-center gap-3 min-w-0 h-full md:self-center">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(255,193,102,0.20)", border: "1px solid rgba(255,193,102,0.35)", color: "#ffd8a8", flexShrink: 0 }}>#{idx + 1}</div>
                                    <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 48, height: 48, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
                                      {row.image ? <ImageWithFallback src={row.image} alt={row.player} fallbackMode="person" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="text-white/50 text-xs font-bold">N/A</span>}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-white font-semibold text-sm md:text-base leading-tight truncate">{row.player}</p>
                                      <div className="flex items-center gap-2 mt-1">{logo && <TeamLogo teamId={logo.teamId} short={logo.short} size={18} />}<p className="text-white/45 text-xs truncate">{row.teamName || row.teamShort || "IPL"}</p></div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end md:w-[120px]">
                                    <div className="px-4 py-2 rounded-xl text-center" style={{ background: "rgba(255,193,102,0.16)", border: "1px solid rgba(255,193,102,0.20)" }}>
                                      <p className="text-white/40 text-[10px] uppercase tracking-wide">100s</p>
                                      <p className="text-[#ffd8a8] font-black text-lg">{row.value}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {mostFifties.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mt-8 mb-4">
                        <div>
                          <h3 className="text-white font-bold text-base">Most Fifties</h3>
                          <p className="text-white/45 text-xs mt-1">Half-century makers</p>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ background: "rgba(59,212,231,0.20)", color: "#7ad6ff" }}>
                          Top 10
                        </span>
                      </div>
                      <div className="space-y-4">
                        {mostFifties.slice(0, 10).map((row, idx) => {
                          const logo = row.teamShort ? getTeamLogoProps(row.teamShort) : null;
                          return (
                            <motion.div key={`${row.player}-${idx}-50s`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                              <div className="rounded-2xl px-4 py-3 md:px-5 md:py-4" style={{ background: "linear-gradient(90deg, rgba(6,10,22,0.92) 0%, rgba(8,12,28,0.9) 55%, rgba(6,10,22,0.92) 100%)", border: "1px solid rgba(150,170,255,0.14)" }}>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 items-stretch">
                                  <div className="flex items-center gap-3 min-w-0 h-full md:self-center">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(59,212,231,0.15)", border: "1px solid rgba(59,212,231,0.25)", color: "#7ad6ff", flexShrink: 0 }}>#{idx + 1}</div>
                                    <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 48, height: 48, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
                                      {row.image ? <ImageWithFallback src={row.image} alt={row.player} fallbackMode="person" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="text-white/50 text-xs font-bold">N/A</span>}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-white font-semibold text-sm md:text-base leading-tight truncate">{row.player}</p>
                                      <div className="flex items-center gap-2 mt-1">{logo && <TeamLogo teamId={logo.teamId} short={logo.short} size={18} />}<p className="text-white/45 text-xs truncate">{row.teamName || row.teamShort || "IPL"}</p></div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end md:w-[120px]">
                                    <div className="px-4 py-2 rounded-xl text-center" style={{ background: "rgba(59,212,231,0.14)", border: "1px solid rgba(59,212,231,0.18)" }}>
                                      <p className="text-white/40 text-[10px] uppercase tracking-wide">50s</p>
                                      <p className="text-[#7ad6ff] font-black text-lg">{row.value}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {mostSixes.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mt-8 mb-4">
                        <div>
                          <h3 className="text-white font-bold text-base">Most Sixes</h3>
                          <p className="text-white/45 text-xs mt-1">Maximum hitters</p>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ background: "rgba(255,77,141,0.20)", color: "#ff9dc0" }}>
                          Top 10
                        </span>
                      </div>
                      <div className="space-y-4">
                        {mostSixes.slice(0, 10).map((row, idx) => {
                          const logo = row.teamShort ? getTeamLogoProps(row.teamShort) : null;
                          return (
                            <motion.div key={`${row.player}-${idx}-6s`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                              <div className="rounded-2xl px-4 py-3 md:px-5 md:py-4" style={{ background: "linear-gradient(90deg, rgba(6,10,22,0.92) 0%, rgba(8,12,28,0.9) 55%, rgba(6,10,22,0.92) 100%)", border: "1px solid rgba(150,170,255,0.14)" }}>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 items-stretch">
                                  <div className="flex items-center gap-3 min-w-0 h-full md:self-center">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.25)", color: "#ff9dc0", flexShrink: 0 }}>#{idx + 1}</div>
                                    <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 48, height: 48, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
                                      {row.image ? <ImageWithFallback src={row.image} alt={row.player} fallbackMode="person" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="text-white/50 text-xs font-bold">N/A</span>}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-white font-semibold text-sm md:text-base leading-tight truncate">{row.player}</p>
                                      <div className="flex items-center gap-2 mt-1">{logo && <TeamLogo teamId={logo.teamId} short={logo.short} size={18} />}<p className="text-white/45 text-xs truncate">{row.teamName || row.teamShort || "IPL"}</p></div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end md:w-[120px]">
                                    <div className="px-4 py-2 rounded-xl text-center" style={{ background: "rgba(255,77,141,0.14)", border: "1px solid rgba(255,77,141,0.18)" }}>
                                      <p className="text-white/40 text-[10px] uppercase tracking-wide">6s</p>
                                      <p className="text-[#ff9dc0] font-black text-lg">{row.value}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {mostFours.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mt-8 mb-4">
                        <div>
                          <h3 className="text-white font-bold text-base">Most Fours</h3>
                          <p className="text-white/45 text-xs mt-1">Boundary hitters</p>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ background: "rgba(0,230,118,0.20)", color: "#00E676" }}>
                          Top 10
                        </span>
                      </div>
                      <div className="space-y-4">
                        {mostFours.slice(0, 10).map((row, idx) => {
                          const logo = row.teamShort ? getTeamLogoProps(row.teamShort) : null;
                          return (
                            <motion.div key={`${row.player}-${idx}-4s`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                              <div className="rounded-2xl px-4 py-3 md:px-5 md:py-4" style={{ background: "linear-gradient(90deg, rgba(6,10,22,0.92) 0%, rgba(8,12,28,0.9) 55%, rgba(6,10,22,0.92) 100%)", border: "1px solid rgba(150,170,255,0.14)" }}>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 items-stretch">
                                  <div className="flex items-center gap-3 min-w-0 h-full md:self-center">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.22)", color: "#00E676", flexShrink: 0 }}>#{idx + 1}</div>
                                    <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 48, height: 48, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
                                      {row.image ? <ImageWithFallback src={row.image} alt={row.player} fallbackMode="person" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="text-white/50 text-xs font-bold">N/A</span>}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-white font-semibold text-sm md:text-base leading-tight truncate">{row.player}</p>
                                      <div className="flex items-center gap-2 mt-1">{logo && <TeamLogo teamId={logo.teamId} short={logo.short} size={18} />}<p className="text-white/45 text-xs truncate">{row.teamName || row.teamShort || "IPL"}</p></div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end md:w-[120px]">
                                    <div className="px-4 py-2 rounded-xl text-center" style={{ background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.16)" }}>
                                      <p className="text-white/40 text-[10px] uppercase tracking-wide">4s</p>
                                      <p className="text-[#00E676] font-black text-lg">{row.value}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}

                </>
              )}
            </motion.div>
          )}

          {activeTab === "News" && (
            <motion.div key="news" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {iplNews.length === 0 && <GlassCard className="p-5 text-sm text-white/45">No IPL news was returned by the scraper.</GlassCard>}
              {iplNews.map((item, idx) => (
                <GlassCard key={`${item.title}-${idx}`} className="p-5" glow="none">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(255,77,141,0.16)", color: "#ff9dc0" }}>
                      {item.tag}
                    </span>
                    <span className="text-white/35 text-xs">{item.publishedAt}</span>
                  </div>
                  <h4 className="text-white font-semibold text-lg leading-snug">{item.title}</h4>
                  {item.summary && <p className="text-white/60 text-sm mt-2">{item.summary}</p>}
                </GlassCard>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
