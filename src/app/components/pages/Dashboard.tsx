import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { useNavigate } from "react-router";
import { TrendingUp, Users, Activity, Trophy, ChevronRight, Star, Flame } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { TeamLogo } from "../ui/TeamLogo";
import { cricketApi } from "../../services/cricketApi";
import { formatApiDate, getTeamLogoProps, isLiveStatus, safeArray } from "../../services/cricketUi";

const sports = [
  { id: "cricket", name: "Cricket", icon: "🏏", color: "#00E676", shadow: "rgba(0,230,118,0.3)", desc: "IPL · World Cup · Big Bash" },
  { id: "football", name: "Football", icon: "⚽", color: "#3BD4E7", shadow: "rgba(59,212,231,0.3)", desc: "Premier League · Champions League" },
  { id: "f1", name: "Formula 1", icon: "🏎️", color: "#FF9100", shadow: "rgba(255,145,0,0.3)", desc: "F1 2026 Championship" },
  { id: "basketball", name: "Basketball", icon: "🏀", color: "#FF4D8D", shadow: "rgba(255,77,141,0.3)", desc: "NBA · EuroLeague" },
];

type UiMatch = {
  id: string;
  league: string;
  teamA: string;
  teamB: string;
  score: string;
  status: string;
  date: string;
};

const toUiMatch = (match: any): UiMatch => ({
  id: String(match?.id || `${match?.team1 || "team1"}-${match?.team2 || "team2"}-${match?.date || "date"}`),
  league: match?.series || "Cricket",
  teamA: match?.team1 || "Team A",
  teamB: match?.team2 || "Team B",
  score: match?.score || "Score unavailable",
  status: match?.status || "Status unavailable",
  date: formatApiDate(match?.date),
});

export function Dashboard() {
  const navigate = useNavigate();
  const [liveMatches, setLiveMatches] = useState<UiMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UiMatch[]>([]);
  const [iplMatches, setIplMatches] = useState<UiMatch[]>([]);
  const [teamsCount, setTeamsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [liveRes, upcomingRes, iplRes, teamsRes] = await Promise.all([
          cricketApi.getLiveMatches(1, 8),
          cricketApi.getUpcomingMatches(1, 8),
          cricketApi.getIplMatches(1, 30),
          cricketApi.getTeams({ page: 1, limit: 500 }),
        ]);

        if (!active) {
          return;
        }

        const live = safeArray<any>((liveRes as any).matches).map(toUiMatch);
        const upcoming = safeArray<any>((upcomingRes as any).matches).map(toUiMatch);
        const ipl = safeArray<any>((iplRes as any).matches).map(toUiMatch);
        const teams = safeArray<any>((teamsRes as any).teams);

        setLiveMatches(live);
        setUpcomingMatches(upcoming);
        setIplMatches(ipl);
        setTeamsCount(teams.length);
      } catch (fetchError: any) {
        if (!active) {
          return;
        }
        setError(fetchError?.message || "Failed to load live dashboard data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: "IPL Matches", value: String(iplMatches.length), icon: Activity, color: "#FF4D8D", bg: "rgba(255,77,141,0.1)" },
      { label: "Live Matches", value: String(liveMatches.length), icon: Trophy, color: "#3BD4E7", bg: "rgba(59,212,231,0.1)" },
      { label: "Upcoming", value: String(upcomingMatches.length), icon: TrendingUp, color: "#7C4DFF", bg: "rgba(124,77,255,0.1)" },
      { label: "Teams", value: String(teamsCount), icon: Users, color: "#FF9100", bg: "rgba(255,145,0,0.1)" },
    ],
    [iplMatches.length, liveMatches.length, upcomingMatches.length, teamsCount]
  );

  const liveMatchCards = liveMatches.filter((match) => isLiveStatus(match.status)).slice(0, 3);
  const upcomingMatchCards = upcomingMatches.slice(0, 3);

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
                {loading ? "SYNCING LIVE DATA" : "LIVE DATA CONNECTED"}
              </div>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
              Your Sports <br />
              <span style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Intelligence Hub
              </span>
            </h1>
            <p className="text-white/50 text-lg max-w-lg">Live scores and match feeds are now powered by your backend web scraping pipeline.</p>
            {error && <p className="text-[#ff8ca8] text-sm mt-3">{error}</p>}
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
            <span className="text-white/30 text-sm">{loading ? "Loading..." : "4 sports available"}</span>
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
              {liveMatchCards.length === 0 && (
                <GlassCard className="p-5">
                  <p className="text-white/50 text-sm">No live matches available right now from the API.</p>
                </GlassCard>
              )}

              {liveMatchCards.map((match, i) => {
                const teamA = getTeamLogoProps(match.teamA);
                const teamB = getTeamLogoProps(match.teamB);

                return (
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
                        <span className="text-white/40 text-xs">{match.date}</span>
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
                            <TeamLogo teamId={teamA.teamId} short={teamA.short} size={28} />
                            <span className="text-white font-bold">{match.teamA}</span>
                          </div>
                          <span className="text-white font-black text-sm md:text-base">{match.score}</span>
                        </div>
                        <div className="h-px my-2" style={{ background: "rgba(255,255,255,0.06)" }} />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={teamB.teamId} short={teamB.short} size={28} />
                            <span className="text-white font-bold">{match.teamB}</span>
                          </div>
                          <span className="text-white/60 text-xs uppercase">{match.status}</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );})}
            </div>
          </div>

          {/* Upcoming + Trending */}
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcomingMatchCards.length === 0 && (
                  <GlassCard className="p-4">
                    <p className="text-white/50 text-sm">No upcoming fixtures returned by the API.</p>
                  </GlassCard>
                )}

                {upcomingMatchCards.map((match, i) => (
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
                      <div className="text-[#3BD4E7] text-xs mt-1.5 font-medium">{match.date}</div>
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
                  {(iplMatches.slice(0, 3).map((m, index) => ({
                    name: `${m.teamA} vs ${m.teamB}`,
                    detail: `${m.status} · ${m.score}`,
                    badge: index === 0 ? "#1" : index === 1 ? "HOT" : "#3",
                  })) ).map((item, i) => (
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
