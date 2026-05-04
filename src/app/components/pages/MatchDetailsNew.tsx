import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { MessageCircle, Radio, Users, MapPin, Activity, Flame, BarChart3 } from "lucide-react";
import { getTeamLogoProps } from "../../services/cricketUi";

type TabKey = "Scorecard" | "Commentary" | "Analysis";

const tabs: TabKey[] = ["Scorecard", "Commentary", "Analysis"];

export function MatchDetailsNew() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("Scorecard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      setError("Missing match id");
      return;
    }

    let active = true;

    const loadMatch = async () => {
      if (!active || inFlightRef.current) return;

      inFlightRef.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setError(null);
        
        const response = await fetch(`/api/admin/matches/${matchId}`, {
          signal: controller.signal,
        });

        if (!active) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!active) return;

        if (result.success && result.data) {
          setMatchData(result.data);
        } else {
          throw new Error(result.message || "Failed to load match");
        }
      } catch (fetchError: any) {
        if (fetchError?.name === "AbortError") return;
        if (!active) return;
        setError(fetchError?.message || "Unable to load match details");
      } finally {
        inFlightRef.current = false;
        if (active) setLoading(false);
      }
    };

    loadMatch();
    const pollHandle = setInterval(() => {
      loadMatch();
    }, 1000); // Refresh every 1 second for real-time updates

    return () => {
      active = false;
      abortRef.current?.abort();
      clearInterval(pollHandle);
    };
  }, [matchId]);

  const match = matchData?.match || {};
  const scoreboard = matchData?.scoreboard || {};
  const batters = scoreboard?.batters || [];
  const bowlers = scoreboard?.bowlers || [];
  const commentary = scoreboard?.commentary || [];
  const last6Balls = scoreboard?.last6Balls || [];
  const liveStats = scoreboard?.liveStats || {};
  const fullScorecard = scoreboard?.fullScorecard || { team1: {}, team2: {} };

  // Debug logging
  useEffect(() => {
    if (matchData) {
      console.log('🎯 Match Data:', {
        batters: batters.length,
        bowlers: bowlers.length,
        last6Balls: last6Balls,
        commentary: commentary.length,
      });
    }
  }, [matchData]);

  const teamALogo = getTeamLogoProps(match?.team1);
  const teamBLogo = getTeamLogoProps(match?.team2);

  const striker = batters[0] || null;
  const nonStriker = batters[1] || null;
  const currentBowler = bowlers[0] || null;

  const strikerSR = striker && striker.balls > 0 ? ((striker.runs / striker.balls) * 100).toFixed(1) : "-";
  const nonStrikerSR = nonStriker && nonStriker.balls > 0 ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(1) : "-";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to="/dashboard" />
          <Breadcrumbs items={[{ label: "Cricket", path: "/dashboard" }, { label: `${match?.team1 || "Team A"} vs ${match?.team2 || "Team B"}` }]} />
        </div>

        {/* Match Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl mb-8"
          style={{
            background: "linear-gradient(120deg, rgba(8,18,34,0.96) 0%, rgba(7,15,28,0.97) 55%, rgba(10,32,44,0.96) 100%)",
            border: "1px solid rgba(90,170,220,0.22)",
            boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
          }}
        >
          <div className="px-6 md:px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(255,90,90,0.14)", border: "1px solid rgba(255,90,90,0.38)", color: "#ff7c7c" }}
                >
                  <Radio size={10} />
                  {loading ? "UPDATING" : (match?.status || "LIVE")}
                </div>
                <span className="text-white/70 text-sm font-semibold">{match?.title || "Cricket Match"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/45">
                <MapPin size={12} />
                <span>{match?.venue || "Venue unavailable"}</span>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-7">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6">
              <div className="flex items-center gap-3 md:justify-start justify-center">
                <TeamLogo teamId={teamALogo.teamId} short={teamALogo.short} size={52} />
                <div>
                  <p className="text-white/80 text-sm font-semibold">{match?.team1 || "Team A"}</p>
                  <p className="text-[#9de8ff] text-4xl font-black leading-none">{match?.team1Score || "-"}</p>
                  <p className="text-white/40 text-xs mt-1">Overs: {match?.team1Overs || "-"}</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-white text-5xl md:text-6xl font-black leading-none">VS</p>
                <p className="text-white/45 text-xs mt-2">CRR: {liveStats?.currentRunRate || "-"}</p>
                {liveStats?.requiredRunRate && (
                  <p className="text-[#ffc86b] text-xs mt-1">RRR: {liveStats.requiredRunRate}</p>
                )}
              </div>

              <div className="flex items-center gap-3 md:justify-end justify-center">
                <div className="text-right">
                  <p className="text-white/80 text-sm font-semibold">{match?.team2 || "Team B"}</p>
                  <p className="text-[#9de8ff] text-4xl font-black leading-none">{match?.team2Score || "-"}</p>
                  <p className="text-white/40 text-xs mt-1">Overs: {match?.team2Overs || "-"}</p>
                </div>
                <TeamLogo teamId={teamBLogo.teamId} short={teamBLogo.short} size={52} />
              </div>
            </div>

            {error && <p className="text-[#ff8ca8] text-xs mt-3">{error}</p>}
          </div>
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
          {activeTab === "Scorecard" && (
            <motion.div key="scorecard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 xl:grid-cols-[1.75fr_1fr] gap-5">
                <GlassCard className="p-5 md:p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-black text-lg flex items-center gap-2">
                      <Flame size={16} className="text-[#ff9b4a]" />
                      Live Window
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(124,231,255,0.1)", color: "#7ce8ff", border: "1px solid rgba(124,231,255,0.25)" }}>
                      Auto refresh 1s
                    </span>
                  </div>

                  {/* Current Players */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {loading && !matchData ? (
                      <>
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div className="h-3 bg-white/10 rounded w-16 mb-2"></div>
                            <div className="h-4 bg-white/10 rounded w-24 mb-2"></div>
                            <div className="h-6 bg-white/10 rounded w-20"></div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, rgba(59,212,231,0.08), rgba(124,77,255,0.08))", border: "1px solid rgba(59,212,231,0.2)" }}>
                          <p className="text-[#7ce8ff] text-[11px] uppercase mb-1 font-bold">⚡ Striker</p>
                          <p className="text-white text-sm font-bold truncate">{striker?.name || "Waiting..."}</p>
                          <p className="text-[#7ce8ff] text-2xl font-black">{striker ? `${striker.runs}` : "-"}<span className="text-xs text-white/35"> ({striker?.balls ?? "-"})</span></p>
                          <p className="text-white/40 text-[10px] mt-1">SR: {strikerSR}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-white/40 text-[11px] uppercase mb-1">Non Striker</p>
                          <p className="text-white text-sm font-bold truncate">{nonStriker?.name || "Waiting..."}</p>
                          <p className="text-[#7ce8ff] text-2xl font-black">{nonStriker ? `${nonStriker.runs}` : "-"}<span className="text-xs text-white/35"> ({nonStriker?.balls ?? "-"})</span></p>
                          <p className="text-white/40 text-[10px] mt-1">SR: {nonStrikerSR}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: currentBowler ? "linear-gradient(135deg, rgba(255,77,141,0.08), rgba(255,159,64,0.08))" : "rgba(255,255,255,0.03)", border: currentBowler ? "1px solid rgba(255,77,141,0.2)" : "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-[#ffbf73] text-[11px] uppercase mb-1 font-bold">🎯 Current Bowler</p>
                          <p className="text-white text-sm font-bold truncate">{currentBowler?.name || "No bowler active"}</p>
                          {currentBowler ? (
                            <>
                              <p className="text-[#ffbf73] text-2xl font-black">{currentBowler.wickets}-{currentBowler.runs}</p>
                              <p className="text-white/40 text-[10px] mt-1">Overs: {currentBowler.overs}</p>
                            </>
                          ) : (
                            <p className="text-white/30 text-xs mt-2">Waiting for bowler...</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Live Stats */}
                  <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-white/40">CRR</p>
                        <p className="text-[#7ce8ff] font-bold text-sm">{liveStats?.currentRunRate || "-"}</p>
                      </div>
                      <div>
                        <p className="text-white/40">Req RR</p>
                        <p className="text-white/85 font-bold text-sm">{liveStats?.requiredRunRate || "-"}</p>
                      </div>
                      <div>
                        <p className="text-white/40">Partnership</p>
                        <p className="text-white/85 font-bold text-sm">{liveStats?.partnership || "-"}</p>
                      </div>
                      <div>
                        <p className="text-white/40">Last Wicket</p>
                        <p className="text-white/85 font-bold text-sm truncate">{liveStats?.lastWicket || "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Last 6 Balls */}
                  <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(59,212,231,0.05), rgba(124,77,255,0.05))", border: "1px solid rgba(59,212,231,0.15)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white/70 text-xs font-bold uppercase tracking-wider">🏏 Last 6 Balls</p>
                      <span className="text-[10px] text-white/30">Live Updates</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {last6Balls.length === 0 && <span className="text-white/45 text-xs">Waiting for ball data...</span>}
                      {last6Balls.map((ball: string, idx: number) => (
                        <motion.span
                          key={`${ball}-${idx}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
                          style={{
                            background: ball === "W" 
                              ? "linear-gradient(135deg, rgba(255,82,82,0.3), rgba(255,77,141,0.3))" 
                              : ball === "4" || ball === "6" 
                              ? "linear-gradient(135deg, rgba(59,212,231,0.3), rgba(124,77,255,0.3))" 
                              : "rgba(255,255,255,0.08)",
                            color: ball === "W" ? "#ff8a8a" : ball === "4" || ball === "6" ? "#7ce8ff" : "rgba(255,255,255,0.85)",
                            border: ball === "W" ? "2px solid rgba(255,82,82,0.5)" : ball === "4" || ball === "6" ? "2px solid rgba(59,212,231,0.5)" : "1px solid rgba(255,255,255,0.12)",
                            boxShadow: ball === "W" ? "0 0 15px rgba(255,82,82,0.3)" : ball === "4" || ball === "6" ? "0 0 15px rgba(59,212,231,0.3)" : "none",
                          }}
                        >
                          {ball}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                {/* Full Scorecard */}
                <GlassCard className="p-5" glow="none">
                  <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#7ce8ff]" />
                    Full Scorecard
                  </h3>

                  {fullScorecard.team1?.batters?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-white/60 text-xs mb-2">{match?.team1} Batting</p>
                      <div className="space-y-1">
                        {fullScorecard.team1.batters.slice(0, 6).map((batter: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <span className="text-white/80">{batter.name}</span>
                            <span className="text-[#7ce8ff] font-mono">{batter.runs}({batter.balls})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {fullScorecard.team1?.bowlers?.length > 0 && (
                    <div>
                      <p className="text-white/60 text-xs mb-2">{match?.team2} Bowling</p>
                      <div className="space-y-1">
                        {fullScorecard.team1.bowlers.slice(0, 4).map((bowler: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <span className="text-white/80">{bowler.name}</span>
                            <span className="text-[#ffbf73] font-mono">{bowler.wickets}-{bowler.runs} ({bowler.overs})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </GlassCard>
              </div>
            </motion.div>
          )}

          {activeTab === "Commentary" && (
            <motion.div key="commentary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      💬 Live Commentary
                      <span className="text-xs text-white/30">({commentary.length} entries)</span>
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(59,212,231,0.1)", color: "#7ce8ff" }}>
                      Live • 1s refresh
                    </span>
                  </div>
                </div>
                {commentary.length === 0 && (
                  <div className="px-6 py-8 text-center">
                    <p className="text-white/45 text-sm">Commentary not available yet</p>
                    <p className="text-white/30 text-xs mt-1">Waiting for live updates...</p>
                  </div>
                )}
                <div className="max-h-[600px] overflow-y-auto">
                  {commentary.map((entry: any, index: number) => (
                    <motion.div
                      key={`${entry.over}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="px-6 py-4 flex gap-4 hover:bg-white/5 transition-colors"
                      style={{ borderBottom: index < commentary.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                    >
                      <div className="flex-shrink-0 w-16 h-9 rounded-lg flex items-center justify-center text-xs font-mono font-bold" style={{ background: "linear-gradient(135deg, rgba(59,212,231,0.15), rgba(124,77,255,0.15))", color: "#7ad6ff", border: "1px solid rgba(59,212,231,0.3)" }}>
                        {entry.over}
                      </div>
                      <div className="flex-1">
                        <p className="text-white/85 text-sm leading-relaxed">{entry.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "Analysis" && (
            <motion.div key="analysis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <GlassCard className="p-5" glow="none">
                <p className="text-white/45 text-xs uppercase tracking-wider mb-2">Match ID</p>
                <div className="text-2xl font-black text-[#3BD4E7]">{matchId || "-"}</div>
              </GlassCard>
              <GlassCard className="p-5" glow="none">
                <p className="text-white/45 text-xs uppercase tracking-wider mb-2">Commentary Lines</p>
                <div className="text-2xl font-black text-[#FF9100]">{commentary.length}</div>
              </GlassCard>
              <GlassCard className="p-5" glow="none">
                <p className="text-white/45 text-xs uppercase tracking-wider mb-2">Status</p>
                <div className="text-2xl font-black text-[#00E676]">{match?.status || "Live"}</div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
