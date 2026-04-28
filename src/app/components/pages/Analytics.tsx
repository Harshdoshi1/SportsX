import { motion } from "motion/react";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { cricketApi } from "../../services/cricketApi";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { TrendingUp, Award, Target, Activity, Zap, BarChart2, UserRound, Sparkles } from "lucide-react";

const safeArray = <T,>(value: any): T[] => {
  return Array.isArray(value) ? value : [];
};

const runProgressData = [
  { over: "1-5", rcb: 52, mi: 48, csk: 45, avg: 46 },
  { over: "6-10", rcb: 38, mi: 35, csk: 42, avg: 37 },
  { over: "11-15", rcb: 49, mi: 51, csk: 48, avg: 49 },
  { over: "16-20", rcb: 68, mi: 58, csk: 62, avg: 61 },
];

const teamRunsData = [
  { team: "RCB", runs: 867, avg: 173.4 }, { team: "MI", runs: 834, avg: 166.8 },
  { team: "CSK", runs: 798, avg: 159.6 }, { team: "KKR", runs: 812, avg: 162.4 },
  { team: "DC", runs: 776, avg: 155.2 }, { team: "SRH", runs: 765, avg: 153.0 },
];

const playerCompare = [
  { name: "Kohli", match1: 68, match2: 45, match3: 112, match4: 29, match5: 55, match6: 89 },
  { name: "Gill", match1: 54, match2: 78, match3: 22, match4: 91, match5: 43, match6: 67 },
  { name: "Maxwell", match1: 32, match2: 58, match3: 67, match4: 14, match5: 78, match6: 52 },
];

const xMatchLabels = ["M1", "M2", "M3", "M4", "M5", "M6"];
const playerScores = xMatchLabels.map((m, i) => ({
  match: m,
  Kohli: playerCompare[0][`match${i + 1}` as keyof typeof playerCompare[0]] as number,
  Gill: playerCompare[1][`match${i + 1}` as keyof typeof playerCompare[1]] as number,
  Maxwell: playerCompare[2][`match${i + 1}` as keyof typeof playerCompare[2]] as number,
}));

const runDistribution = [
  { name: "Fours", value: 38, color: "#3BD4E7" },
  { name: "Sixes", value: 24, color: "#7C4DFF" },
  { name: "Singles", value: 28, color: "#FF4D8D" },
  { name: "Twos/Threes", value: 10, color: "#FF9100" },
];

const winRateData = [
  { team: "RCB", winRate: 80, color: "#FF4D8D" },
  { team: "MI", winRate: 70, color: "#1364fa" },
  { team: "CSK", winRate: 60, color: "#ffe600" },
  { team: "KKR", winRate: 60, color: "#5218f3" },
  { team: "DC", winRate: 50, color: "#009cf7" },
  { team: "SRH", winRate: 50, color: "#ff3c00" },
];

const weeklyEngagement = [
  { day: "Mon", matches: 4, users: 24000 }, { day: "Tue", matches: 6, users: 38000 },
  { day: "Wed", matches: 3, users: 18000 }, { day: "Thu", matches: 7, users: 52000 },
  { day: "Fri", matches: 5, users: 41000 }, { day: "Sat", matches: 9, users: 89000 },
  { day: "Sun", matches: 8, users: 76000 },
];

const radarData = [
  { category: "Batting Avg", ipl: 92, wc: 78, bbl: 68 },
  { category: "Bowling Econ", ipl: 85, wc: 72, bbl: 64 },
  { category: "Win Rate", ipl: 80, wc: 65, bbl: 70 },
  { category: "Run Rate", ipl: 88, wc: 74, bbl: 72 },
  { category: "Boundary %", ipl: 76, wc: 68, bbl: 60 },
  { category: "Powerplay", ipl: 84, wc: 70, bbl: 65 },
];

const kpiCards = [
  { icon: Activity, label: "Avg Run Rate", value: "9.2", change: "+0.4", color: "#3BD4E7", up: true },
  { icon: Target, label: "Wickets/Match", value: "6.8", change: "+0.2", color: "#FF4D8D", up: true },
  { icon: TrendingUp, label: "Avg First Innings", value: "168", change: "+12", color: "#7C4DFF", up: true },
  { icon: Award, label: "Boundaries/Match", value: "28.4", change: "-1.2", color: "#FF9100", up: false },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl" style={{ background: "rgba(8,5,24,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <p className="text-white/50 text-xs mb-1.5">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export function Analytics() {
  const [searchParams] = useSearchParams();
  const selectedPlayerName = String(searchParams.get("player") || "").trim();
  const selectedPlayerTeam = String(searchParams.get("team") || "").trim();
  const selectedPlayerRole = String(searchParams.get("role") || "").trim();
  const selectedPlayerImage = String(searchParams.get("image") || "").trim();
  const [battingLeaders, setBattingLeaders] = useState<any[]>([]);
  const [bowlingLeaders, setBowlingLeaders] = useState<any[]>([]);
  const [playerScoresReal, setPlayerScoresReal] = useState(playerScores);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const statsRes = await cricketApi.getIplStats();
        const statsData = (statsRes as any)?.stats || {};

        const batting = safeArray<any>(statsData?.leaders || statsData?.battingLeaders).slice(0, 6);
        const bowling = safeArray<any>(statsData?.bowlingLeaders).slice(0, 6);

        setBattingLeaders(batting);
        setBowlingLeaders(bowling);

        if (batting.length > 0) {
          const realPlayerScores = batting.map((p: any, i: number) => ({
            match: `P${i + 1}`,
            [p.player]: Number(p.runs || 0),
          })).slice(0, 6);

          if (realPlayerScores.length > 0) {
            setPlayerScoresReal(realPlayerScores);
          }
        }
      } catch (error) {
        console.warn("Failed to load player stats", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <BackButton to="/dashboard" />
          <Breadcrumbs items={[{ label: "Analytics Dashboard" }]} />
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Analytics Dashboard</h1>
          <p className="text-white/40">Deep insights across IPL 2026 — interactive charts, live stats & trend analysis</p>
        </motion.div>

        {selectedPlayerName && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mb-8">
            <GlassCard className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedPlayerImage ? (
                    <img
                      src={selectedPlayerImage}
                      alt={selectedPlayerName}
                      className="w-14 h-14 rounded-2xl object-cover"
                      style={{ border: "1px solid rgba(255, 255, 255, 0.16)" }}
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}
                    >
                      <UserRound size={24} className="text-white/70" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-white/35 text-xs uppercase tracking-wider">Selected Player</p>
                    <h2 className="text-white text-xl md:text-2xl font-black truncate">{selectedPlayerName}</h2>
                    <p className="text-white/45 text-sm truncate">
                      {selectedPlayerTeam || "IPL"}
                      {selectedPlayerRole ? ` • ${selectedPlayerRole}` : ""}
                    </p>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: "rgba(59,212,231,0.16)", border: "1px solid rgba(59,212,231,0.35)", color: "#7ad6ff" }}>
                  <Sparkles size={12} /> Search Spotlight
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
              <GlassCard className="p-5" hover>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                    <kpi.icon size={18} style={{ color: kpi.color }} />
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: kpi.up ? "rgba(0,230,118,0.12)" : "rgba(255,77,141,0.12)", color: kpi.up ? "#00E676" : "#FF4D8D" }}>
                    {kpi.change}
                  </span>
                </div>
                <div className="text-3xl font-black text-white">{kpi.value}</div>
                <div className="text-white/30 text-xs mt-1">{kpi.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Run Scoring by Phase */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard className="p-6">
              <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                <BarChart2 size={18} style={{ color: "#3BD4E7" }} />
                Phase-wise Scoring (IPL 2026)
              </h3>
              <p className="text-white/30 text-xs mb-5">Average runs per phase by top teams</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={runProgressData} barGap={4}>
                  <defs>
                    <linearGradient id="rcbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF4D8D" /><stop offset="100%" stopColor="#7C4DFF" />
                    </linearGradient>
                    <linearGradient id="miGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3BD4E7" /><stop offset="100%" stopColor="#7C4DFF" />
                    </linearGradient>
                    <linearGradient id="cskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF9100" /><stop offset="100%" stopColor="#FF4D8D" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="over" stroke="#ffffff20" tick={{ fill: "#ffffff50", fontSize: 12 }} />
                  <YAxis stroke="#ffffff20" tick={{ fill: "#ffffff50", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rcb" fill="url(#rcbGrad)" radius={[4, 4, 0, 0]} name="RCB" />
                  <Bar dataKey="mi" fill="url(#miGrad)" radius={[4, 4, 0, 0]} name="MI" />
                  <Bar dataKey="csk" fill="url(#cskGrad)" radius={[4, 4, 0, 0]} name="CSK" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {[["RCB", "#FF4D8D"], ["MI", "#3BD4E7"], ["CSK", "#FF9100"]].map(([t, c]) => (
                  <div key={t} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: c }} /><span className="text-white/40 text-xs">{t}</span></div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Player Performance Lines */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <GlassCard className="p-6">
              <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                <TrendingUp size={18} style={{ color: "#7C4DFF" }} />
                Player Score Comparison
              </h3>
              <p className="text-white/30 text-xs mb-5">Last 6 match scores</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={playerScoresReal.length > 0 ? playerScoresReal : playerScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="match" stroke="#ffffff20" tick={{ fill: "#ffffff50", fontSize: 12 }} />
                  <YAxis stroke="#ffffff20" tick={{ fill: "#ffffff50", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {battingLeaders.slice(0, 3).map((p: any, i: number) => {
                    const colors = ["#FF4D8D", "#3BD4E7", "#FF9100"];
                    return <Line key={p.player} type="monotone" dataKey={p.player} stroke={colors[i]} strokeWidth={2.5} dot={{ r: 4, fill: colors[i] }} activeDot={{ r: 7 }} />;
                  })}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {battingLeaders.slice(0, 3).map((p: any, i: number) => {
                  const colors = ["#FF4D8D", "#3BD4E7", "#FF9100"];
                  return (
                    <div key={p.player} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: colors[i] }} /><span className="text-white/40 text-xs">{p.player}</span></div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Run Distribution Pie */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard className="p-6 h-full">
              <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                <Target size={18} style={{ color: "#FF4D8D" }} />
                Run Distribution
              </h3>
              <p className="text-white/30 text-xs mb-5">How runs are scored</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={runDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" animationDuration={1200}>
                    {runDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(8,5,24,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {runDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-white/50 text-xs">{item.name}</span>
                    </div>
                    <span className="text-white/70 text-xs font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Win Rate Bars */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <GlassCard className="p-6 h-full">
              <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                <Award size={18} style={{ color: "#00E676" }} />
                Team Win Rates
              </h3>
              <div className="space-y-4">
                {winRateData.map((team, i) => (
                  <div key={team.team}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/70 font-medium">{team.team}</span>
                      <span className="font-bold" style={{ color: team.color }}>{team.winRate}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${team.winRate}%` }}
                        transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: team.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Radar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard className="p-6 h-full">
              <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                <Zap size={18} style={{ color: "#FF9100" }} />
                Tournament Comparison
              </h3>
              <p className="text-white/30 text-xs mb-3">IPL vs World Cup vs BBL</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: "#ffffff40", fontSize: 9 }} />
                  <Radar name="IPL" dataKey="ipl" stroke="#3BD4E7" fill="#3BD4E7" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="WC" dataKey="wc" stroke="#FF4D8D" fill="#FF4D8D" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: "rgba(8,5,24,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {[["IPL", "#3BD4E7"], ["WC", "#FF4D8D"], ["BBL", "#FF9100"]].map(([t, c]) => (
                  <div key={t} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: c }} /><span className="text-white/40 text-xs">{t}</span></div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Platform Engagement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-1 flex items-center gap-2">
              <Activity size={18} style={{ color: "#3BD4E7" }} />
              Platform Engagement This Week
            </h3>
            <p className="text-white/30 text-xs mb-5">Daily active users & match count</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyEngagement}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3BD4E7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3BD4E7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#ffffff20" tick={{ fill: "#ffffff50", fontSize: 12 }} />
                <YAxis stroke="#ffffff20" tick={{ fill: "#ffffff50", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="users" stroke="#3BD4E7" fill="url(#usersGrad)" strokeWidth={2.5} name="Users" dot={{ r: 4, fill: "#3BD4E7" }} activeDot={{ r: 7 }} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
