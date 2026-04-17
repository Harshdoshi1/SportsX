import { motion } from "motion/react";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { useNavigate } from "react-router";
import { TrendingUp, Users, Activity, Trophy, ChevronRight, Star, Flame } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { TeamLogo } from "../ui/TeamLogo";

const sports = [
  { id: "cricket", name: "Cricket", icon: "🏏", color: "#00E676", shadow: "rgba(0,230,118,0.3)", desc: "IPL · World Cup · Big Bash" },
  { id: "football", name: "Football", icon: "⚽", color: "#3BD4E7", shadow: "rgba(59,212,231,0.3)", desc: "Premier League · Champions League" },
  { id: "f1", name: "Formula 1", icon: "🏎️", color: "#FF9100", shadow: "rgba(255,145,0,0.3)", desc: "F1 2026 Championship" },
  { id: "basketball", name: "Basketball", icon: "🏀", color: "#FF4D8D", shadow: "rgba(255,77,141,0.3)", desc: "NBA · EuroLeague" },
];

const liveMatches = [
  { id: 1, league: "IPL 2026", leagueId: "ipl", teamA: "PBKS", teamB: "RCB", flagA: "🔴", flagB: "🔴", scoreA: "9 pts", scoreB: "8 pts", overs: "Table leaders", status: "LIVE", prob: 53 },
  { id: 2, league: "Premier League", leagueId: "epl", teamA: "Arsenal", teamB: "Man City", flagA: "🔴", flagB: "🔵", scoreA: "70", scoreB: "64", overs: "Points", status: "LIVE", prob: 61 },
  { id: 3, league: "F1 2026", leagueId: "f1-2026", teamA: "Antonelli", teamB: "Field", flagA: "🟠", flagB: "🏁", scoreA: "97", scoreB: "<97", overs: "WDC", status: "LIVE", prob: 64 },
];

const upcomingMatches = [
  { id: 4, league: "IPL 2026", teamA: "GT", teamB: "KKR", time: "Today, 7:30 PM IST", highlight: true },
  { id: 5, league: "F1 2026", teamA: "Miami", teamB: "Grand Prix", time: "Apr 30 - May 3" },
  { id: 6, league: "Premier League", teamA: "Arsenal", teamB: "Run-in", time: "6 points clear" },
];

const stats = [
  { label: "IPL Matches Completed", value: "24", icon: Activity, color: "#FF4D8D", bg: "rgba(255,77,141,0.1)" },
  { label: "IPL Leader", value: "PBKS 9", icon: Trophy, color: "#3BD4E7", bg: "rgba(59,212,231,0.1)" },
  { label: "F1 WDC Leader", value: "Antonelli 97", icon: TrendingUp, color: "#7C4DFF", bg: "rgba(124,77,255,0.1)" },
  { label: "EPL Top", value: "Arsenal 70", icon: Users, color: "#FF9100", bg: "rgba(255,145,0,0.1)" },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-10">

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12"
          style={{
            background: "linear-gradient(135deg, rgba(59,212,231,0.12) 0%, rgba(124,77,255,0.12) 50%, rgba(255,77,141,0.08) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1750716413341-fd5d93296a76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwc3RhZGl1bSUyMG5pZ2h0JTIwbGlnaHRzJTIwYWVyaWFsfGVufDF8fHx8MTc3NjQwOTAwMXww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Stadium"
              className="w-full h-full object-cover opacity-10"
            />
          </div>
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-4"
            >
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.3)", color: "#FF4D8D" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D8D]" />
                REAL DATA SNAPSHOT
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,145,0,0.15)", border: "1px solid rgba(255,145,0,0.3)", color: "#FF9100" }}>
                <Flame size={12} />
                UPDATED: APR 17, 2026
              </div>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
              Your Sports <br />
              <span style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Intelligence Hub
              </span>
            </h1>
            <p className="text-white/50 text-lg max-w-lg">Live scores, deep analytics, player insights and real-time match rooms — all in one place.</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
            >
              <GlassCard className="p-5" hover>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: stat.bg, border: `1px solid ${stat.color}30` }}
                >
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-white/40 text-xs mt-1">{stat.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Sports Selection */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">Select Sport</h2>
            <span className="text-white/30 text-sm">4 sports available</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sports.map((sport, i) => (
              <motion.div
                key={sport.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.07 }}
              >
                <GlassCard
                  className="p-6 cursor-pointer text-center"
                  hover
                  onClick={() => navigate(`/sport/${sport.id}`)}
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                    className="text-5xl mb-4 block"
                  >
                    {sport.icon}
                  </motion.div>
                  <h3 className="text-white font-bold mb-1">{sport.name}</h3>
                  <p className="text-white/30 text-xs">{sport.desc}</p>
                  <div className="mt-4 flex items-center justify-center gap-1 text-xs font-medium" style={{ color: sport.color }}>
                    <span>Explore</span>
                    <ChevronRight size={12} />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Matches + Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Matches */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.3)", color: "#FF4D8D" }}>
                <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#FF4D8D]" />
                LIVE
              </div>
              <h2 className="text-xl font-bold text-white">Live Matches</h2>
            </div>
            <div className="space-y-4">
              {liveMatches.map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <GlassCard className="p-5 cursor-pointer" hover onClick={() => navigate(`/match/${match.id}`)}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-white/40">{match.league}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white/40 text-xs">{match.overs}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/live-room/${match.id}`); }}
                          className="px-3 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: "rgba(124,77,255,0.2)", border: "1px solid rgba(124,77,255,0.4)", color: "#a78bfa" }}
                        >
                          Join Room
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TeamLogo short={match.teamA} size={28} />
                            <span className="text-white font-bold">{match.teamA}</span>
                          </div>
                          <span className="text-white font-black text-xl">{match.scoreA}</span>
                        </div>
                        <div className="h-px my-2" style={{ background: "rgba(255,255,255,0.06)" }} />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TeamLogo short={match.teamB} size={28} />
                            <span className="text-white font-bold">{match.teamB}</span>
                          </div>
                          <span className="text-white font-black text-xl">{match.scoreB}</span>
                        </div>
                      </div>
                    </div>
                    {/* Win probability */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-white/30 mb-1.5">
                        <span>{match.teamA} {match.prob}%</span>
                        <span>{match.teamB} {100 - match.prob}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <motion.div
                          initial={{ width: "50%" }}
                          animate={{ width: `${match.prob}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, #3BD4E7, #7C4DFF)" }}
                        />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Upcoming + Trending */}
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcomingMatches.map((match, i) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <GlassCard className="p-4 cursor-pointer" hover onClick={() => navigate(`/match/${match.id}`)}>
                      <div className="text-white/30 text-xs mb-2">{match.league}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-white font-semibold text-sm">{match.teamA} vs {match.teamB}</div>
                        <ChevronRight size={14} className="text-white/30" />
                      </div>
                      <div className="text-[#3BD4E7] text-xs mt-1.5 font-medium">{match.time}</div>
                      {(match as { highlight?: boolean }).highlight && (
                        <div className="mt-2 inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: "rgba(59,212,231,0.15)", border: "1px solid rgba(59,212,231,0.3)", color: "#3BD4E7" }}>
                          Highlighted Fixture
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Trending */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">🔥 Trending</h2>
              <GlassCard className="p-5">
                <div className="space-y-4">
                  {[
                    { name: "Virat Kohli", detail: "Orange Cap leader: 228 runs", badge: "#1" },
                    { name: "Prasidh Krishna & A. Kamboj", detail: "Purple Cap tied: 10 wickets each", badge: "HOT" },
                    { name: "Vaibhav Suryavanshi", detail: "Strike rate 266+", badge: "#2" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: i === 0 ? "rgba(255,145,0,0.15)" : "rgba(255,255,255,0.05)",
                          border: i === 0 ? "1px solid rgba(255,145,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          color: i === 0 ? "#FF9100" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {item.badge}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-white/30 text-xs truncate">{item.detail}</p>
                      </div>
                      <Star size={14} className="text-white/20 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
