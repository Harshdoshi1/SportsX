import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Radio, Users, MessageCircle, TrendingUp, Zap, MapPin } from "lucide-react";

const matchInfo = {
  1: { teamA: "RCB", teamB: "MI", flagA: "🔴", flagB: "🔵", league: "IPL 2026", venue: "M. Chinnaswamy Stadium, Bangalore", date: "Apr 17, 2026", scoreA: "167/4", scoreB: "142/7", oversA: "20.0", oversB: "16.3", probA: 78, batting: "MI" },
  2: { teamA: "Arsenal", teamB: "Chelsea", flagA: "🔴", flagB: "🔵", league: "Premier League", venue: "Emirates Stadium, London", date: "Apr 17, 2026", scoreA: "2", scoreB: "2", oversA: "67'", oversB: "", probA: 50, batting: "" },
  3: { teamA: "Lakers", teamB: "Celtics", flagA: "🟣", flagB: "🟢", league: "NBA Finals", venue: "Crypto.com Arena, LA", date: "Apr 17, 2026", scoreA: "98", scoreB: "92", oversA: "Q3 5:42", oversB: "", probA: 58, batting: "" },
};

const overProgressData = [
  { over: "PP(1-6)", rcb: 62, mi: 58 }, { over: "7-10", rcb: 45, mi: 38 },
  { over: "11-15", rcb: 48, mi: 52 }, { over: "16-20", rcb: 67, mi: 43 },
];

const winProb = [
  { over: "Start", rcb: 50, mi: 50 }, { over: "PP", rcb: 55, mi: 45 },
  { over: "10", rcb: 48, mi: 52 }, { over: "15", rcb: 58, mi: 42 },
  { over: "18", rcb: 72, mi: 28 }, { over: "20", rcb: 78, mi: 22 },
];

const batsmen = [
  { name: "V. Kohli", runs: 68, balls: 42, fours: 6, sixes: 3, sr: "161.9", status: "batting" },
  { name: "D. Karthik", runs: 34, balls: 18, fours: 2, sixes: 4, sr: "188.9", status: "batting" },
];

const recentBalls = ["4", "1", "0", "W", "6", "2", "4", "1", "0", "1", "6", "4"];

const commentary = [
  { over: "16.3", text: "SIX! Dinesh Karthik clears the ropes at long-on! What a finish!", type: "six" },
  { over: "16.2", text: "Bumrah bowls a yorker. Karthik digs it out for a single.", type: "normal" },
  { over: "16.1", text: "Lovely cover drive by Kohli for FOUR runs!", type: "four" },
  { over: "15.6", text: "WICKET! Rajat Patidar caught at mid-wicket by Rohit. RCB 145/4", type: "wicket" },
  { over: "15.5", text: "Full toss dispatched over extra cover for SIX! Maxwell in beast mode!", type: "six" },
  { over: "15.4", text: "Dot ball. Very tight bowling from Bumrah.", type: "normal" },
];

const tabs = ["Scorecard", "Commentary", "Analysis"];

export function MatchDetails() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Scorecard");
  const match = matchInfo[parseInt(matchId || "1")] || matchInfo[1];

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
          <Breadcrumbs items={[{ label: match.league, path: "/dashboard" }, { label: `${match.teamA} vs ${match.teamB}` }]} />
        </div>

        {/* Main Scoreboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-10 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(255,77,141,0.1) 0%, rgba(124,77,255,0.12) 50%, rgba(59,212,231,0.08) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.4)", color: "#FF4D8D" }}
                >
                  <Radio size={10} />
                  LIVE
                </motion.div>
                <span className="text-white/40 text-sm">{match.league}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/30 text-xs">
                <MapPin size={12} />
                {match.venue}
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/live-room/${matchId}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #7C4DFF, #FF4D8D)", boxShadow: "0 0 20px rgba(124,77,255,0.3)" }}
              >
                <Users size={16} />
                Join Live Room
              </motion.button>
              <button
                onClick={() => navigate(`/live-room/${matchId}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
              >
                <MessageCircle size={16} />
                Chat
              </button>
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-3 gap-6 items-center">
            {/* Team A */}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
                <TeamLogo short={match.teamA} size={54} />
                <div>
                  <p className="text-white font-black text-2xl">{match.teamA}</p>
                  <p className="text-white/40 text-xs">{match.batting === match.teamA ? "Batting" : "Bowled"}</p>
                </div>
              </div>
              <div className="text-5xl md:text-6xl font-black text-white">{match.scoreA}</div>
              <div className="text-white/40 text-sm mt-1">{match.oversA} overs</div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="text-white/20 text-3xl font-black mb-3">VS</div>
              {/* Win Probability Bar */}
              <div className="space-y-2">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <motion.div
                    initial={{ width: "50%" }}
                    animate={{ width: `${match.probA}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #FF4D8D, #7C4DFF)" }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span style={{ color: "#FF4D8D" }}>{match.probA}%</span>
                  <span className="text-white/30">Win %</span>
                  <span style={{ color: "#3BD4E7" }}>{100 - match.probA}%</span>
                </div>
              </div>
              {/* Recent balls */}
              <div className="flex gap-1 justify-center mt-3 flex-wrap">
                {recentBalls.slice(-6).map((ball, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: ball === "W" ? "rgba(255,77,141,0.3)" : ball === "6" ? "rgba(0,230,118,0.25)" : ball === "4" ? "rgba(59,212,231,0.2)" : "rgba(255,255,255,0.06)",
                      border: ball === "W" ? "1px solid rgba(255,77,141,0.5)" : ball === "6" ? "1px solid rgba(0,230,118,0.4)" : "1px solid rgba(255,255,255,0.08)",
                      color: ball === "W" ? "#FF4D8D" : ball === "6" ? "#00E676" : ball === "4" ? "#3BD4E7" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {ball}
                  </div>
                ))}
              </div>
            </div>

            {/* Team B */}
            <div className="text-center md:text-right">
              <div className="flex items-center gap-3 mb-3 justify-center md:justify-end">
                <div className="md:order-last">
                  <p className="text-white font-black text-2xl">{match.teamB}</p>
                  <p className="text-white/40 text-xs">{match.batting === match.teamB ? "Batting" : "Bowling"}</p>
                </div>
                <TeamLogo short={match.teamB} size={54} />
              </div>
              <div className="text-5xl md:text-6xl font-black text-white">{match.scoreB}</div>
              <div className="text-white/40 text-sm mt-1">{match.oversB || "—"}</div>
            </div>
          </div>

          {/* Context */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-6 p-3 rounded-xl text-center text-sm font-semibold"
            style={{ background: "rgba(255,145,0,0.1)", border: "1px solid rgba(255,145,0,0.2)", color: "#FF9100" }}
          >
            MI needs 26 runs off 22 balls (RRR: 7.09)
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={
                activeTab === tab
                  ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white", boxShadow: "0 0 20px rgba(59,212,231,0.3)" }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* SCORECARD */}
          {activeTab === "Scorecard" && (
            <motion.div key="scorecard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Current Batsmen */}
              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 className="text-white font-bold flex items-center gap-2"><span className="text-[#FF4D8D]">🔴</span> RCB Batting</h3>
                </div>
                <div className="px-6 py-3 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] text-xs text-white/30 uppercase tracking-wider" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span>Batsman</span><span className="text-center">R</span><span className="text-center">B</span>
                  <span className="text-center hidden md:block">4s</span><span className="text-center hidden md:block">6s</span><span className="text-center">SR</span>
                </div>
                {batsmen.map((b, i) => (
                  <motion.div
                    key={b.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-6 py-3.5 items-center"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: b.status === "batting" ? "rgba(59,212,231,0.04)" : "transparent" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: b.status === "batting" ? "#00E676" : "rgba(255,255,255,0.2)" }} />
                      <span className="text-white font-semibold text-sm">{b.name}</span>
                      {b.status === "batting" && <span className="text-xs px-1.5 py-0.5 rounded text-[#3BD4E7]" style={{ background: "rgba(59,212,231,0.1)" }}>*</span>}
                    </div>
                    <span className="text-center text-white font-bold">{b.runs}</span>
                    <span className="text-center text-white/60">{b.balls}</span>
                    <span className="text-center text-white/60 hidden md:block">{b.fours}</span>
                    <span className="text-center text-white/60 hidden md:block">{b.sixes}</span>
                    <span className="text-center text-sm font-mono" style={{ color: parseFloat(b.sr) > 150 ? "#00E676" : parseFloat(b.sr) > 120 ? "#FF9100" : "#FF4D8D" }}>{b.sr}</span>
                  </motion.div>
                ))}
              </GlassCard>
            </motion.div>
          )}

          {/* COMMENTARY */}
          {activeTab === "Commentary" && (
            <motion.div key="commentary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 className="text-white font-bold flex items-center gap-2"><Radio size={16} style={{ color: "#FF4D8D" }} />Live Commentary</h3>
                </div>
                <div className="divide-y" style={{ "--tw-divide-opacity": 1 } as any}>
                  {commentary.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="px-6 py-4 flex gap-4"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}
                    >
                      <div
                        className="flex-shrink-0 w-12 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
                        style={{
                          background: c.type === "wicket" ? "rgba(255,77,141,0.15)" : c.type === "six" ? "rgba(0,230,118,0.15)" : c.type === "four" ? "rgba(59,212,231,0.15)" : "rgba(255,255,255,0.04)",
                          color: c.type === "wicket" ? "#FF4D8D" : c.type === "six" ? "#00E676" : c.type === "four" ? "#3BD4E7" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {c.over}
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed">{c.text}</p>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ANALYSIS */}
          {activeTab === "Analysis" && (
            <motion.div key="analysis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Win Probability Chart */}
              <GlassCard className="p-6">
                <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                  <TrendingUp size={18} style={{ color: "#3BD4E7" }} />
                  Win Probability Timeline
                </h3>
                <p className="text-white/30 text-xs mb-5">How the match unfolded over overs</p>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={winProb}>
                    <defs>
                      <linearGradient id="rcbWin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF4D8D" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#FF4D8D" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="miWin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3BD4E7" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3BD4E7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="over" stroke="#ffffff25" tick={{ fill: "#ffffff50", fontSize: 11 }} />
                    <YAxis stroke="#ffffff25" tick={{ fill: "#ffffff50", fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "rgba(8,5,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }} formatter={(val) => [`${val}%`]} />
                    <Area type="monotone" dataKey="rcb" stroke="#FF4D8D" fill="url(#rcbWin)" strokeWidth={2.5} name="RCB" dot={{ fill: "#FF4D8D", r: 4 }} />
                    <Area type="monotone" dataKey="mi" stroke="#3BD4E7" fill="url(#miWin)" strokeWidth={2.5} name="MI" dot={{ fill: "#3BD4E7", r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Phase Analysis */}
              <GlassCard className="p-6">
                <h3 className="text-white font-bold mb-5 flex items-center gap-2"><Zap size={18} style={{ color: "#FF9100" }} />Phase-wise Runs</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={overProgressData}>
                    <defs>
                      <linearGradient id="phaseRCB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF4D8D" stopOpacity={0.3} /><stop offset="100%" stopColor="#FF4D8D" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="phaseMI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3BD4E7" stopOpacity={0.3} /><stop offset="100%" stopColor="#3BD4E7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="over" stroke="#ffffff25" tick={{ fill: "#ffffff50", fontSize: 11 }} />
                    <YAxis stroke="#ffffff25" tick={{ fill: "#ffffff50", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "rgba(8,5,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }} />
                    <Area type="monotone" dataKey="rcb" stroke="#FF4D8D" fill="url(#phaseRCB)" strokeWidth={2} name="RCB" />
                    <Area type="monotone" dataKey="mi" stroke="#3BD4E7" fill="url(#phaseMI)" strokeWidth={2} name="MI" />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
