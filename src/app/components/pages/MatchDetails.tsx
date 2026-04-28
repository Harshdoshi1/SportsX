import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { MessageCircle, Radio, Users, MapPin } from "lucide-react";
import { cricketApi } from "../../services/cricketApi";
import { formatApiDate, getTeamLogoProps, safeArray } from "../../services/cricketUi";

type TabKey = "Scorecard" | "Commentary" | "Analysis";

type CommentaryEntry = {
  over: string;
  text: string;
};

type InningEntry = {
  title: string;
  score: string;
  overs: string;
};

type BatterEntry = {
  name: string;
  runs: number;
  balls: number;
};

type BowlerEntry = {
  name: string;
  figures: string;
  overs: string;
};

const tabs: TabKey[] = ["Scorecard", "Commentary", "Analysis"];

const extractInnings = (scoreboard: any): InningEntry[] => {
  const innings = safeArray<any>(scoreboard?.innings);
  if (innings.length > 0) {
    return innings.map((inning, index) => ({
      title: inning?.team || inning?.title || `Innings ${index + 1}`,
      score: inning?.score || `${inning?.runs ?? "-"}/${inning?.wickets ?? "-"}`,
      overs: String(inning?.overs ?? "-"),
    }));
  }

  const fallbackScore = safeArray<string>(scoreboard?.score || scoreboard?.scores);
  if (fallbackScore.length > 0) {
    return fallbackScore.map((item, index) => ({
      title: `Innings ${index + 1}`,
      score: String(item),
      overs: "-",
    }));
  }

  return [];
};

const extractCommentary = (scoreboard: any): CommentaryEntry[] => {
  const direct = safeArray<any>(scoreboard?.commentary || scoreboard?.liveCommentary);
  if (direct.length > 0) {
    return direct
      .map((entry) => ({
        over: String(entry?.over || entry?.ball || "-"),
        text: String(entry?.text || entry?.commentary || ""),
      }))
      .filter((entry) => entry.text)
      .slice(0, 40);
  }

  return [];
};

const extractBatters = (scoreboard: any): BatterEntry[] =>
  safeArray<any>(scoreboard?.batters)
    .map((row) => ({
      name: String(row?.name || ""),
      runs: Number(row?.runs ?? 0),
      balls: Number(row?.balls ?? 0),
    }))
    .filter((row) => row.name)
    .slice(0, 4);

const extractBowlers = (scoreboard: any): BowlerEntry[] =>
  safeArray<any>(scoreboard?.bowlers)
    .map((row) => ({
      name: String(row?.name || ""),
      figures: String(row?.figures || "-"),
      overs: String(row?.overs || "-"),
    }))
    .filter((row) => row.name)
    .slice(0, 4);

export function MatchDetails() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("Scorecard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchPayload, setMatchPayload] = useState<any>(null);
  const inFlightRef = useRef(false);
  const previousSnapshotRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      setError("Missing match id");
      return;
    }

    let active = true;

    const loadMatch = async (fresh = false) => {
      if (!active || inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (!previousSnapshotRef.current) {
          setLoading(true);
        }
        setError(null);

        const response: any = await cricketApi.getMatchDetails(matchId, fresh, controller.signal);
        if (!active) {
          return;
        }

        const snapshot = JSON.stringify({
          match: response?.match || null,
          scoreboard: response?.scoreboard || null,
        });

        if (snapshot !== previousSnapshotRef.current) {
          previousSnapshotRef.current = snapshot;
          setMatchPayload(response);
        }

        const status = String(response?.match?.status || "").toLowerCase();
        endedRef.current = Boolean(response?.match?.matchEnded) || status === "completed";
      } catch (fetchError: any) {
        if (fetchError?.name === "AbortError") {
          return;
        }
        if (!active) {
          return;
        }
        setError(fetchError?.message || "Unable to load match details");
      } finally {
        inFlightRef.current = false;
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMatch(true);
    const pollHandle = setInterval(() => {
      if (!endedRef.current) {
        loadMatch(true);
      }
    }, 2000);

    return () => {
      active = false;
      abortRef.current?.abort();
      clearInterval(pollHandle);
    };
  }, [matchId]);

  const match = matchPayload?.match || {};
  const scoreboard = matchPayload?.scoreboard || {};
  const teamA = getTeamLogoProps(match?.team1);
  const teamB = getTeamLogoProps(match?.team2);

  const innings = useMemo(() => extractInnings(scoreboard), [scoreboard]);
  const commentary = useMemo(() => extractCommentary(scoreboard), [scoreboard]);
  const batters = useMemo(() => extractBatters(scoreboard), [scoreboard]);
  const bowlers = useMemo(() => extractBowlers(scoreboard), [scoreboard]);
  const liveStats = scoreboard?.liveStats || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to="/dashboard" />
          <Breadcrumbs items={[{ label: match?.series || "Cricket", path: "/dashboard" }, { label: `${match?.team1 || "Team A"} vs ${match?.team2 || "Team B"}` }]} />
        </div>

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
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.4)", color: "#FF4D8D" }}
                >
                  <Radio size={10} />
                  {loading ? "LOADING" : (match?.status || "LIVE")}
                </div>
                <span className="text-white/40 text-sm">{match?.series || "Cricket"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/30 text-xs">
                <MapPin size={12} />
                {match?.venue || "Venue unavailable"}
              </div>
              <p className="text-white/35 text-xs mt-1">{formatApiDate(match?.date)}</p>
              {error && <p className="text-[#ff8ca8] text-xs mt-2">{error}</p>}
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/lounge/${matchId}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #7C4DFF, #FF4D8D)", boxShadow: "0 0 20px rgba(124,77,255,0.3)" }}
              >
                <Users size={16} />
                Join Lounge
              </motion.button>
              <button
                onClick={() => navigate(`/lounge/${matchId}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
              >
                <MessageCircle size={16} />
                Open Lounge
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
                <TeamLogo teamId={teamA.teamId} short={teamA.short} size={54} />
                <div>
                  <p className="text-white font-black text-2xl">{match?.team1 || "Team A"}</p>
                  <p className="text-[#6cecff] text-sm font-semibold">
                    {match?.team1Score || "-"}
                    {match?.team1Overs ? ` (${match.team1Overs})` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-white font-black text-2xl md:text-3xl mb-2">VS</div>
              <p className="text-white/70 text-sm">{match?.score || "Score unavailable"}</p>
              {match?.sourceUrl && (
                <a
                  href={match.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-xs font-semibold text-[#6cecff] hover:text-[#93f3ff]"
                >
                  Open Official Live Feed
                </a>
              )}
            </div>

            <div className="text-center md:text-right">
              <div className="flex items-center gap-3 mb-3 justify-center md:justify-end">
                <div className="md:order-last">
                  <p className="text-white font-black text-2xl">{match?.team2 || "Team B"}</p>
                  <p className="text-[#6cecff] text-sm font-semibold md:text-right">
                    {match?.team2Score || "-"}
                    {match?.team2Overs ? ` (${match.team2Overs})` : ""}
                  </p>
                </div>
                <TeamLogo teamId={teamB.teamId} short={teamB.short} size={54} />
              </div>
            </div>
          </div>
        </motion.div>

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
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <GlassCard className="overflow-hidden xl:col-span-2">
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 className="text-white font-bold">Live Scorecard</h3>
                  </div>
                  {innings.length === 0 && <div className="px-6 py-5 text-sm text-white/45">No structured innings data available for this match.</div>}
                  {innings.map((inning, index) => (
                    <div key={`${inning.title}-${index}`} className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: index < innings.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <div>
                        <p className="text-white font-semibold text-sm">{inning.title}</p>
                        <p className="text-white/40 text-xs">Overs: {inning.overs}</p>
                      </div>
                      <p className="text-white font-black text-lg">{inning.score}</p>
                    </div>
                  ))}
                </GlassCard>

                <GlassCard className="p-5" glow="none">
                  <p className="text-white font-bold mb-4">Live Match Stats</p>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-white/45">Current Run Rate</span>
                      <span className="text-[#6cecff] font-semibold">{liveStats?.currentRunRate || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-white/45">Required Run Rate</span>
                      <span className="text-white/80 text-right">{liveStats?.requiredRunRate || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-white/45">Toss</span>
                      <span className="text-white/80 text-right">{liveStats?.tossInfo || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-white/45">Partnership</span>
                      <span className="text-white/80 text-right">{liveStats?.partnership || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-white/45">Last Wicket</span>
                      <span className="text-white/80 text-right">{liveStats?.lastWicket || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-white/45">Equation</span>
                      <span className="text-white/80 text-right">{liveStats?.equation || "-"}</span>
                    </div>
                  </div>
                </GlassCard>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <GlassCard className="overflow-hidden">
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 className="text-white font-bold">Batters</h3>
                  </div>
                  {batters.length === 0 && <div className="px-6 py-5 text-sm text-white/45">Live batter stats are not available yet.</div>}
                  {batters.map((batter, index) => (
                    <div key={`${batter.name}-${index}`} className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: index < batters.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <p className="text-white/85 text-sm font-semibold">{batter.name}</p>
                      <p className="text-[#6cecff] font-bold text-sm">{batter.runs} ({batter.balls})</p>
                    </div>
                  ))}
                </GlassCard>

                <GlassCard className="overflow-hidden">
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 className="text-white font-bold">Bowlers</h3>
                  </div>
                  {bowlers.length === 0 && <div className="px-6 py-5 text-sm text-white/45">Live bowler stats are not available yet.</div>}
                  {bowlers.map((bowler, index) => (
                    <div key={`${bowler.name}-${index}`} className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: index < bowlers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <p className="text-white/85 text-sm font-semibold">{bowler.name}</p>
                      <p className="text-[#ffb86b] font-bold text-sm">{bowler.figures} ({bowler.overs})</p>
                    </div>
                  ))}
                </GlassCard>
              </div>
            </motion.div>
          )}

          {activeTab === "Commentary" && (
            <motion.div key="commentary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 className="text-white font-bold">Commentary Feed</h3>
                </div>
                {commentary.length === 0 && <div className="px-6 py-5 text-sm text-white/45">Commentary is not available for this match in the current API payload.</div>}
                {commentary.map((entry, index) => (
                  <div key={`${entry.over}-${index}`} className="px-6 py-4 flex gap-4" style={{ borderBottom: index < commentary.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div className="flex-shrink-0 w-14 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "#7ad6ff" }}>
                      {entry.over}
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{entry.text}</p>
                  </div>
                ))}
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "Analysis" && (
            <motion.div key="analysis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <GlassCard className="p-5" glow="none">
                <p className="text-white/45 text-xs uppercase tracking-wider mb-2">Match Id</p>
                <div className="text-2xl font-black text-[#3BD4E7]">{matchId || "-"}</div>
              </GlassCard>
              <GlassCard className="p-5" glow="none">
                <p className="text-white/45 text-xs uppercase tracking-wider mb-2">Innings Found</p>
                <div className="text-2xl font-black text-[#00E676]">{innings.length}</div>
              </GlassCard>
              <GlassCard className="p-5" glow="none">
                <p className="text-white/45 text-xs uppercase tracking-wider mb-2">Commentary Lines</p>
                <div className="text-2xl font-black text-[#FF9100]">{commentary.length}</div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
