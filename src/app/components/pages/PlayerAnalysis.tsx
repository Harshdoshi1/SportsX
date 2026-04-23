import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Award, Target, TrendingUp, Shield, Star, Zap, CircleDot } from "lucide-react";
import { cricketApi } from "../../services/cricketApi";
import { getTeamLogoProps, safeArray, slugify } from "../../services/cricketUi";
import { getIplTeamByShort } from "../../data/iplTeams";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

/* ─── Team slug helpers ──────────────────────────────────────────────────── */
const TEAM_SLUG_BY_SHORT: Record<string, string> = {
  CSK: "chennai-super-kings", DC: "delhi-capitals", GT: "gujarat-titans",
  KKR: "kolkata-knight-riders", LSG: "lucknow-super-giants", MI: "mumbai-indians",
  PBKS: "punjab-kings", RR: "rajasthan-royals", RCB: "royal-challengers-bengaluru",
  SRH: "sunrisers-hyderabad",
};

const SHORT_BY_SLUG = Object.entries(TEAM_SLUG_BY_SHORT).reduce<Record<string, string>>((acc, [short, slug]) => {
  acc[slug] = short;
  return acc;
}, {});

const resolveTeamShort = (input?: string) => {
  const raw = String(input || "").trim();
  const upper = raw.toUpperCase();
  if (TEAM_SLUG_BY_SHORT[upper]) return upper;
  if (SHORT_BY_SLUG[raw.toLowerCase()]) return SHORT_BY_SLUG[raw.toLowerCase()];
  return "RCB";
};

/* ─── Types ──────────────────────────────────────────────────────────────── */
type ApiPlayer = {
  id: string | number;
  name: string;
  role?: string;
  image?: string;
  matches?: number;
  runs?: number;
  wickets?: number;
  average?: number;
  strikeRate?: number;
  economy?: number;
};

type ApiTeam = {
  id: string | number;
  name: string;
  played?: number;
  won?: number;
  lost?: number;
  pts?: number;
  nrr?: string;
};

type InningsEntry = {
  runs: number;
  balls: number;
  sr: number;
  fours: number;
  sixes: number;
  opponent: string;
  date?: string;
};

type OpponentStat = {
  opponent: string;
  opponentName: string;
  innings: number;
  avgRuns: number;
  avgSR: number;
  totalFours: number;
  totalSixes: number;
  totalRuns: number;
};

type PlayerCrexData = {
  innings: InningsEntry[];
  opponentStats: OpponentStat[];
  favouriteTarget: { opponent: string; opponentName: string; avgRuns: number } | null;
  team?: string;
  role?: string;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function v(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(digits);
}

const isBatterRole = (role?: string) => /(batter|bat|wk|wicket)/i.test(String(role || ""));
const isBowlerRole = (role?: string) => /bowler/i.test(String(role || ""));
const isAllRounderRole = (role?: string) => /all.?rounder/i.test(String(role || ""));

const OPPONENT_BAR_COLORS = [
  "#3BD4E7", "#FF9100", "#00E676", "#FF4D8D", "#7C4DFF",
  "#FFD600", "#00BCD4", "#E040FB", "#FF5252", "#69F0AE",
];

/* ─── Component ──────────────────────────────────────────────────────────── */
export function PlayerAnalysis() {
  const { sportId, leagueId, teamId, playerId } = useParams<{
    sportId: string; leagueId: string; teamId: string; playerId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<ApiTeam | null>(null);
  const [player, setPlayer] = useState<ApiPlayer | null>(null);
  const [crexData, setCrexData] = useState<PlayerCrexData | null>(null);
  const [crexLoading, setCrexLoading] = useState(false);

  /* ── Load base player data ─────────────────────────────────────────────── */
  useEffect(() => {
    let active = true;

    const loadPlayer = async () => {
      try {
        setLoading(true);
        setError(null);

        const short = resolveTeamShort(teamId);
        const teamMeta = getIplTeamByShort(short);
        const pointsRes = await cricketApi.getIplPoints();
        const row = safeArray<any>((pointsRes as any).points).find(
          (entry) => String(entry?.team || "").toUpperCase() === short,
        );

        const selectedTeam: ApiTeam = {
          id: short,
          name: teamMeta?.name || row?.team || short,
          played: Number(row?.played ?? 0),
          won: Number(row?.win ?? 0),
          lost: Number(row?.loss ?? 0),
          pts: Number(row?.points ?? 0),
          nrr: String(row?.nrr ?? "-"),
        };

        const playersRes = await cricketApi.getTeamPlayers(short, {
          page: 1, limit: 250, teamName: selectedTeam.name,
        });
        const players = safeArray<ApiPlayer>((playersRes as any).players);

        const selectedPlayer =
          players.find((item) => String(item.id) === String(playerId)) ||
          players.find((item) => slugify(item.name) === slugify(playerId)) ||
          players[0] || null;

        if (!selectedPlayer) {
          throw new Error("No players returned for selected team");
        }

        if (!active) return;

        setTeam(selectedTeam);
        setPlayer(selectedPlayer);
      } catch (fetchError: any) {
        if (!active) return;
        setError(fetchError?.message || "Failed to load player data");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPlayer();
    return () => { active = false; };
  }, [teamId, playerId]);

  /* ── Load crex innings data ────────────────────────────────────────────── */
  useEffect(() => {
    if (!player?.name) return;
    let active = true;

    const loadCrexData = async () => {
      try {
        setCrexLoading(true);
        const nameKey = String(player.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const res = await cricketApi.getPlayerInnings(nameKey) as any;

        if (!active) return;

        if (res?.innings || res?.opponentStats) {
          setCrexData({
            innings: res.innings || [],
            opponentStats: res.opponentStats || [],
            favouriteTarget: res.favouriteTarget || null,
            team: res.team,
            role: res.role,
          });
        }
      } catch {
        // Crex data is optional enhancement, don't block page
      } finally {
        if (active) setCrexLoading(false);
      }
    };

    loadCrexData();
    return () => { active = false; };
  }, [player?.name]);

  /* ── Derived data ──────────────────────────────────────────────────────── */
  const teamLogo = getTeamLogoProps(team?.name);
  const roleText = String(player?.role || crexData?.role || "").toLowerCase();
  const isBatter = isBatterRole(roleText) || (!isBowlerRole(roleText) && !isAllRounderRole(roleText));
  const isBowler = isBowlerRole(roleText);
  const isAllRounder = isAllRounderRole(roleText);
  const showBatting = isBatter || isAllRounder;
  const showBowling = isBowler || isAllRounder;

  const metrics = useMemo(() => {
    const base = [
      { label: "Matches", val: v(player?.matches, 0), color: "#3BD4E7" },
      { label: "Runs", val: v(player?.runs, 0), color: "#FF9100" },
      { label: "Average", val: v(player?.average), color: "#00E676" },
      { label: "Strike Rate", val: v(player?.strikeRate), color: "#FF4D8D" },
      { label: "Wickets", val: v(player?.wickets, 0), color: "#7C4DFF" },
      { label: "Economy", val: v(player?.economy), color: "#3BD4E7" },
    ];
    return base;
  }, [player]);

  /* ── Real form trend from crex innings ─────────────────────────────────── */
  const formTrend = useMemo(() => {
    if (crexData?.innings && crexData.innings.length > 0) {
      return crexData.innings.slice(0, 8).reverse().map((inn, idx) => ({
        match: `vs ${inn.opponent}`,
        value: inn.runs,
        balls: inn.balls,
        sr: inn.sr,
      }));
    }
    // Fallback: generate from season average (will be replaced once crex data loads)
    const runs = Number(player?.runs || 0);
    const matches = Math.max(Number(player?.matches || 0), 1);
    const base = Math.max(8, Math.round(runs / matches));
    return [
      { match: "M1", value: Math.max(0, base - 7), balls: 0, sr: 0 },
      { match: "M2", value: Math.max(0, base - 2), balls: 0, sr: 0 },
      { match: "M3", value: Math.max(0, base + 4), balls: 0, sr: 0 },
      { match: "M4", value: Math.max(0, base - 1), balls: 0, sr: 0 },
      { match: "M5", value: Math.max(0, base + 6), balls: 0, sr: 0 },
    ];
  }, [crexData, player]);

  /* ── Boundary mix from real data or estimated ──────────────────────────── */
  const boundaryMix = useMemo(() => {
    if (crexData?.innings && crexData.innings.length > 0) {
      const totalFours = crexData.innings.reduce((s, i) => s + (i.fours || 0), 0);
      const totalSixes = crexData.innings.reduce((s, i) => s + (i.sixes || 0), 0);
      if (totalFours > 0 || totalSixes > 0) {
        return [
          { name: "4s", value: totalFours, color: "#3BD4E7" },
          { name: "6s", value: totalSixes, color: "#FF9100" },
        ];
      }
    }
    const runs = Number(player?.runs || 0);
    const sr = Number(player?.strikeRate || 100);
    const est = Math.max(2, Math.round((runs / Math.max(sr, 80)) * 12));
    const fours = Math.max(1, Math.round(est * 0.68));
    const sixes = Math.max(1, est - fours);
    return [
      { name: "4s", value: fours, color: "#3BD4E7" },
      { name: "6s", value: sixes, color: "#FF9100" },
    ];
  }, [crexData, player]);

  /* ── vs Each Team data ─────────────────────────────────────────────────── */
  const opponentChartData = useMemo(() => {
    if (!crexData?.opponentStats || crexData.opponentStats.length === 0) return [];
    return crexData.opponentStats
      .filter((s) => s.innings > 0)
      .sort((a, b) => b.avgRuns - a.avgRuns)
      .map((s, idx) => ({
        team: s.opponent,
        avgRuns: s.avgRuns,
        avgSR: s.avgSR,
        innings: s.innings,
        totalRuns: s.totalRuns,
        fill: OPPONENT_BAR_COLORS[idx % OPPONENT_BAR_COLORS.length],
      }));
  }, [crexData]);

  const favouriteTarget = crexData?.favouriteTarget || null;

  /* ── Insight text ──────────────────────────────────────────────────────── */
  const insight = useMemo(() => {
    const name = player?.name || "This player";
    const sr = player?.strikeRate;
    const fav = favouriteTarget;

    if (showBatting && fav) {
      return `${name} has a standout record against ${fav.opponentName} with an average of ${fav.avgRuns} runs. ${sr ? `Season strike rate of ${sr.toFixed(1)} indicates ${sr > 140 ? "aggressive" : sr > 120 ? "balanced" : "anchor"} intent.` : ""}`;
    }

    if (showBowling) {
      return `${name} is contributing as a wicket-taking option with ${player?.wickets || 0} wickets this season at an economy of ${v(player?.economy)}.`;
    }

    return `${name} is carrying a ${sr ? sr.toFixed(1) : "steady"} strike-rate profile this IPL season.`;
  }, [player, favouriteTarget, showBatting, showBowling]);

  const hasCrexData = crexData && (crexData.innings.length > 0 || crexData.opponentStats.length > 0);
  const momentum = formTrend.length >= 2
    ? (formTrend[formTrend.length - 1].value >= formTrend[0].value ? "Upward" : "Volatile")
    : "Steady";

  /* ── RENDER ────────────────────────────────────────────────────────────── */
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between mb-8">
          <BackButton to={`/sport/${sportId}/league/${leagueId}/team/${teamId}`} />
          <Breadcrumbs
            items={[
              { label: "Cricket", path: `/sport/${sportId}` },
              { label: "IPL", path: `/sport/${sportId}/league/${leagueId}` },
              { label: team?.name || "Team", path: `/sport/${sportId}/league/${leagueId}/team/${teamId}` },
              { label: player?.name || "Player" },
            ]}
          />
        </div>

        {/* ─── Player Hero Card ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-10 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(59,212,231,0.18) 0%, rgba(124,77,255,0.12) 100%)",
            border: "1px solid rgba(59,212,231,0.45)",
          }}
        >
          <div className="relative grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-center">
            <div
              className="rounded-3xl flex items-center justify-center overflow-hidden w-[220px] h-[220px]"
              style={{ background: "rgba(6,10,24,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {player?.image ? (
                <ImageWithFallback src={player.image} alt={player.name} className="w-full h-full object-contain p-1" fallbackMode="person" />
              ) : (
                <span className="text-6xl">🏏</span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(59,212,231,0.2)", border: "1px solid rgba(59,212,231,0.35)", color: "#3BD4E7" }}>
                  {player?.role || "Cricketer"}
                </span>
                <span className="text-white/35 text-xs">{team?.name || "Team"}</span>
                {favouriteTarget && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(255,145,0,0.15)", border: "1px solid rgba(255,145,0,0.4)", color: "#FF9100" }}>
                    <Star size={11} /> Fav: {favouriteTarget.opponent}
                  </span>
                )}
              </div>
              <h1 className="font-black text-white mb-2 text-4xl md:text-5xl">{player?.name || "Loading..."}</h1>
              <div className="flex flex-wrap items-center gap-3 text-white/50 text-sm">
                <span className="flex items-center gap-1.5"><TeamLogo teamId={teamLogo.teamId} short={teamLogo.short} size={22} /> {team?.name || "Team"}</span>
                <span>Player ID: {player?.id || "-"}</span>
              </div>
              {error && <p className="text-[#ff8ca8] text-xs mt-2">{error}</p>}
              {loading && <p className="text-white/45 text-xs mt-2">Loading player profile...</p>}
            </div>
          </div>
        </motion.div>

        {/* ─── Stat Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {metrics.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                <div className="text-white/30 text-xs mt-1">{s.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* ─── Context Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><TrendingUp size={18} style={{ color: "#3BD4E7" }} /> Season Snapshot</h3>
            <p className="text-white/60 text-sm">
              {hasCrexData
                ? `Real match data loaded: ${crexData!.innings.length} innings tracked across ${crexData!.opponentStats.length} opponents.`
                : "Profile populated from live player endpoint. Detailed innings data loading..."
              }
            </p>
            {crexLoading && <p className="text-[#7ad6ff] text-xs mt-2 animate-pulse">Loading detailed match data...</p>}
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Target size={18} style={{ color: "#FF4D8D" }} /> Role Context</h3>
            <p className="text-white/70 text-sm">Primary role: {player?.role || "-"}</p>
            <p className="text-white/45 text-sm mt-1">Team: {team?.name || "-"}</p>
            {isAllRounder && <p className="text-[#7C4DFF] text-xs mt-2 font-semibold">All-rounder ∙ Batting + Bowling analysis</p>}
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Award size={18} style={{ color: "#FF9100" }} /> Team Context</h3>
            <p className="text-white/70 text-sm">Points: {team?.pts ?? "-"}</p>
            <p className="text-white/70 text-sm">NRR: {team?.nrr || "-"}</p>
            <p className="text-white/70 text-sm">Record: {team?.won ?? "-"}W - {team?.lost ?? "-"}L</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40"><Shield size={12} /> Live team standings</div>
          </GlassCard>
        </div>

        {/* ─── Last Played Innings Table ──────────────────────────────────── */}
        {crexData && crexData.innings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base uppercase tracking-wide flex items-center gap-2">
                  <Zap size={16} style={{ color: "#FF9100" }} /> Last Played Innings
                </h3>
                <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(59,212,231,0.14)", border: "1px solid rgba(59,212,231,0.35)", color: "#7ad6ff" }}>
                  IPL 2026
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/40 text-xs py-2 pr-3 font-medium">Opponent</th>
                      <th className="text-right text-white/40 text-xs py-2 px-3 font-medium">Runs</th>
                      <th className="text-right text-white/40 text-xs py-2 px-3 font-medium">Balls</th>
                      <th className="text-right text-white/40 text-xs py-2 px-3 font-medium">SR</th>
                      <th className="text-right text-white/40 text-xs py-2 px-3 font-medium">4s</th>
                      <th className="text-right text-white/40 text-xs py-2 px-3 font-medium">6s</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crexData.innings.map((inn, idx) => {
                      const oppMeta = getIplTeamByShort(inn.opponent);
                      const oppLogo = getTeamLogoProps(oppMeta?.name || inn.opponent);
                      return (
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * idx }}
                          className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              <TeamLogo teamId={oppLogo.teamId} short={oppLogo.short} size={20} />
                              <span className="text-white font-semibold">{inn.opponent}</span>
                              {inn.date && <span className="text-white/30 text-xs ml-1">{inn.date}</span>}
                            </div>
                          </td>
                          <td className="text-right py-3 px-3">
                            <span className={`font-bold ${inn.runs >= 50 ? "text-[#00E676]" : inn.runs >= 30 ? "text-white" : "text-white/70"}`}>
                              {inn.runs}
                            </span>
                          </td>
                          <td className="text-right py-3 px-3 text-white/60">{inn.balls}</td>
                          <td className="text-right py-3 px-3">
                            <span className={`font-semibold ${inn.sr >= 150 ? "text-[#FF9100]" : inn.sr >= 120 ? "text-[#3BD4E7]" : "text-white/60"}`}>
                              {inn.sr.toFixed(1)}
                            </span>
                          </td>
                          <td className="text-right py-3 px-3 text-[#3BD4E7]">{inn.fours || "-"}</td>
                          <td className="text-right py-3 px-3 text-[#FF9100]">{inn.sixes || "-"}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ─── Analysis Charts ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <GlassCard className="p-6 md:p-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base uppercase tracking-wide">Performance Analysis</h3>
              <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(59,212,231,0.14)", border: "1px solid rgba(59,212,231,0.35)", color: "#7ad6ff" }}>
                {momentum} Form
              </span>
            </div>

            <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-white/75 text-sm leading-relaxed">{insight}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
              {/* Form Trend — Real innings data */}
              <div>
                <p className="text-white/45 text-xs mb-2 uppercase tracking-wider">
                  {hasCrexData ? "Recent Innings (Real Data)" : "Estimated Form Trend"}
                </p>
                <ChartContainer
                  className="h-64 w-full"
                  config={{ value: { label: "Runs", color: "#3BD4E7" } }}
                >
                  <LineChart data={formTrend}>
                    <XAxis dataKey="match" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={3} dot={{ r: 4, fill: "#3BD4E7" }} />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* Boundary Mix */}
              <div className="grid grid-rows-2 gap-4">
                <div>
                  <p className="text-white/45 text-xs mb-2 uppercase tracking-wider">
                    {hasCrexData ? "Boundary Count (Real)" : "Estimated Boundaries"}
                  </p>
                  <ChartContainer
                    className="h-28 w-full"
                    config={{ value: { label: "Boundaries", color: "#FF9100" } }}
                  >
                    <PieChart>
                      <Pie data={boundaryMix} dataKey="value" nameKey="name" innerRadius={20} outerRadius={44} paddingAngle={3}>
                        {boundaryMix.map((slice) => (
                          <Cell key={slice.name} fill={slice.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>

                {/* Phase SR */}
                <div>
                  <p className="text-white/45 text-xs mb-2 uppercase tracking-wider">Phase Strike Rate</p>
                  <ChartContainer
                    className="h-28 w-full"
                    config={{ rate: { label: "Phase SR", color: "#7C4DFF" } }}
                  >
                    <BarChart data={[
                      { phase: "PP", rate: Number(((player?.strikeRate || 100) * 0.92).toFixed(1)) },
                      { phase: "Mid", rate: Number(((player?.strikeRate || 100) * 0.81).toFixed(1)) },
                      { phase: "Death", rate: Number(((player?.strikeRate || 100) * 1.16).toFixed(1)) },
                    ]}>
                      <XAxis dataKey="phase" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="rate" fill="var(--color-rate)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── vs Each Team Analysis ──────────────────────────────────────── */}
        {opponentChartData.length > 0 && showBatting && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8"
          >
            <GlassCard className="p-6 md:p-7">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base uppercase tracking-wide flex items-center gap-2">
                  <CircleDot size={16} style={{ color: "#FF4D8D" }} /> vs Each Team
                </h3>
                {favouriteTarget && (
                  <span className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-full font-bold" style={{
                    background: "linear-gradient(135deg, rgba(255,145,0,0.25), rgba(255,77,141,0.2))",
                    border: "1px solid rgba(255,145,0,0.5)",
                    color: "#FF9100",
                  }}>
                    <Star size={12} /> Favourite Target: {favouriteTarget.opponent} (Avg {favouriteTarget.avgRuns})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart of avg runs vs each team */}
                <ChartContainer
                  className="h-64 w-full"
                  config={{ avgRuns: { label: "Avg Runs", color: "#3BD4E7" } }}
                >
                  <BarChart data={opponentChartData} layout="vertical">
                    <XAxis type="number" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
                    <YAxis dataKey="team" type="category" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} width={45} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgRuns" radius={[0, 8, 8, 0]}>
                      {opponentChartData.map((entry, idx) => (
                        <Cell key={entry.team} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>

                {/* Stats table for opponent breakdown */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-white/40 text-xs py-2 font-medium">Team</th>
                        <th className="text-right text-white/40 text-xs py-2 font-medium">Inn</th>
                        <th className="text-right text-white/40 text-xs py-2 font-medium">Runs</th>
                        <th className="text-right text-white/40 text-xs py-2 font-medium">Avg</th>
                        <th className="text-right text-white/40 text-xs py-2 font-medium">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opponentChartData.map((row) => {
                        const isFav = favouriteTarget?.opponent === row.team;
                        return (
                          <tr key={row.team} className={`border-b border-white/5 ${isFav ? "bg-[#FF9100]/[0.06]" : ""}`}>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <TeamLogo teamId={row.team.toLowerCase()} short={row.team} size={18} />
                                <span className="text-white font-semibold">{row.team}</span>
                                {isFav && <Star size={12} className="text-[#FF9100]" />}
                              </div>
                            </td>
                            <td className="text-right text-white/60 py-2.5">{row.innings}</td>
                            <td className="text-right text-white font-semibold py-2.5">{row.totalRuns}</td>
                            <td className="text-right text-[#00E676] font-bold py-2.5">{row.avgRuns.toFixed(1)}</td>
                            <td className="text-right text-[#3BD4E7] py-2.5">{row.avgSR.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ─── Bowling Records (bowler or all-rounder) ───────────────────── */}
        {showBowling && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <GlassCard className="p-6 md:p-7">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base uppercase tracking-wide flex items-center gap-2">
                  <Target size={16} style={{ color: "#7C4DFF" }} /> Bowling Analysis
                </h3>
                <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(124,77,255,0.15)", border: "1px solid rgba(124,77,255,0.35)", color: "#B388FF" }}>
                  {isAllRounder ? "All-Rounder" : "Primary Bowler"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl p-4 text-center" style={{ background: "rgba(124,77,255,0.08)", border: "1px solid rgba(124,77,255,0.2)" }}>
                  <div className="text-2xl font-black text-[#7C4DFF]">{v(player?.wickets, 0)}</div>
                  <div className="text-white/30 text-xs mt-1">Wickets</div>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,77,141,0.08)", border: "1px solid rgba(255,77,141,0.2)" }}>
                  <div className="text-2xl font-black text-[#FF4D8D]">{v(player?.economy)}</div>
                  <div className="text-white/30 text-xs mt-1">Economy</div>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)" }}>
                  <div className="text-2xl font-black text-[#00E676]">{v(player?.average)}</div>
                  <div className="text-white/30 text-xs mt-1">Bowling Avg</div>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: "rgba(59,212,231,0.08)", border: "1px solid rgba(59,212,231,0.2)" }}>
                  <div className="text-2xl font-black text-[#3BD4E7]">{v(player?.strikeRate)}</div>
                  <div className="text-white/30 text-xs mt-1">Strike Rate</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
