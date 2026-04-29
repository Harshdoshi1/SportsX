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
import { useMatchStore } from "../../../contexts/MatchContext";

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

const parseRunsAndOvers = (value: unknown): { runsText: string; oversText: string } => {
  const raw = String(value || "").trim();
  if (!raw) {
    return { runsText: "-", oversText: "" };
  }

  const compact = raw.match(/^\s*(\d{1,3})\s*[-/]\s*(\d{2,}(?:\.\d+)?)\s*$/);
  if (compact) {
    const runs = String(compact[1] || "").trim();
    const tail = String(compact[2] || "").trim();
    if (tail.includes(".") && tail.length >= 3) {
      const wkts = tail.slice(0, 1);
      const overs = tail.slice(1);
      return {
        runsText: `${runs}-${wkts}`,
        oversText: overs,
      };
    }
  }

  const match = raw.match(/^\s*([0-9]+\s*[-/]\s*[0-9]+|[0-9]+)\s*(?:\(([^)]+)\))?\s*$/);
  if (match) {
    const runsText = String(match[1] || "-").trim();
    const oversText = String(match[2] || "").trim();
    return { runsText, oversText };
  }

  return { runsText: raw, oversText: "" };
};

const tabs: TabKey[] = ["Scorecard", "Commentary", "Analysis"];

const extractInnings = (scoreboard: any): InningEntry[] => {
  const innings = safeArray<any>(scoreboard?.innings);
  if (innings.length > 0) {
    return innings.map((inning, index) => {
      const rawScore = inning?.score || `${inning?.runs ?? "-"}/${inning?.wickets ?? "-"}`;
      const parsed = parseRunsAndOvers(rawScore);
      const overs = parsed.oversText || String(inning?.overs ?? "-");
      return {
        title: inning?.team || inning?.title || `Innings ${index + 1}`,
        score: parsed.runsText,
        overs: overs,
      };
    });
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

const formatLastSixFromCommentary = (entries: CommentaryEntry[]): string => {
  const latest = [...entries]
    .filter((e) => e && e.text)
    .reverse();

  const balls: string[] = [];
  for (const entry of latest) {
    if (balls.length >= 6) break;
    const t = String(entry.text || "").toLowerCase();
    if (!t) continue;
    if (/wide/.test(t)) {
      balls.push("Wd");
      continue;
    }
    if (/no\s*ball|noball/.test(t)) {
      balls.push("Nb");
      continue;
    }
    if (/out|wicket|caught|lbw|bowled|run out/.test(t)) {
      balls.push("W");
      continue;
    }
    if (/six/.test(t)) {
      balls.push("6");
      continue;
    }
    if (/four/.test(t)) {
      balls.push("4");
      continue;
    }
    const runHit = t.match(/\b([0-6])\s*runs?\b/);
    if (runHit) {
      balls.push(String(runHit[1]));
      continue;
    }
    if (/no run/.test(t)) {
      balls.push("0");
      continue;
    }
  }

  return balls.reverse().join(" ");
};

const extractBatters = (scoreboard: any): BatterEntry[] =>
  safeArray<any>(scoreboard?.batters)
    .map((row) => ({
      name: String(row?.name || ""),
      runs: Number(row?.runs ?? 0),
      balls: Number(row?.balls ?? 0),
    }))
    .filter((row) => row.name)
    .slice(0, 22);

const extractBowlers = (scoreboard: any): BowlerEntry[] =>
  safeArray<any>(scoreboard?.bowlers)
    .map((row) => ({
      name: String(row?.name || ""),
      figures: String(row?.figures || "-"),
      overs: String(row?.overs || "-"),
    }))
    .filter((row) => row.name)
    .slice(0, 22);

export function MatchDetails() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { adminMatches, liveSnapshotsByMatchId } = useMatchStore();
  const [activeTab, setActiveTab] = useState<TabKey>("Scorecard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchPayload, setMatchPayload] = useState<any>(null);
  const inFlightRef = useRef(false);
  const previousSnapshotRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const endedRef = useRef(false);
  const tickRef = useRef(0);
  const lastTickAtRef = useRef(0);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      setError("Missing match id");
      return;
    }

    const adminMatch = adminMatches.find((m) => m.id === matchId);
    const isAdminLive = Boolean(adminMatch && adminMatch.type === "live" && adminMatch.sourceUrl);
    const adminSnapshot = isAdminLive ? liveSnapshotsByMatchId[matchId] : null;

    if (isAdminLive && adminSnapshot?.match) {
      setMatchPayload({ match: adminSnapshot.match, scoreboard: adminSnapshot.scoreboard || null });
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;

    const loadMatch = async (fresh = false) => {
      if (!active || inFlightRef.current) {
        return;
      }

      const now = Date.now();
      const isHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      const minGapMs = isHidden ? 15_000 : 1_000;
      if (now - lastTickAtRef.current < minGapMs) {
        return;
      }
      lastTickAtRef.current = now;
      tickRef.current += 1;
      const shouldForceFresh = fresh || tickRef.current % 8 === 0;

      inFlightRef.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (!previousSnapshotRef.current) {
          setLoading(true);
        }
        setError(null);

        const response: any = isAdminLive
          ? await cricketApi.getMatchDetailsByUrl(
              String(adminMatch?.sourceUrl || ""),
              shouldForceFresh,
              controller.signal,
              { tournamentId: undefined, series: adminMatch?.sectionLabel },
            )
          : await cricketApi.getMatchDetails(matchId, shouldForceFresh, controller.signal);
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
    const pollHandle = window.setInterval(() => {
      if (!endedRef.current) {
        loadMatch(false);
      }
    }, 1000);

    return () => {
      active = false;
      abortRef.current?.abort();
      clearInterval(pollHandle);
    };
  }, [adminMatches, liveSnapshotsByMatchId, matchId]);

  const match = matchPayload?.match || {};
  const scoreboard = matchPayload?.scoreboard || {};
  const teamA = getTeamLogoProps(match?.team1);
  const teamB = getTeamLogoProps(match?.team2);

  const team1Score = parseRunsAndOvers(match?.team1Score);
  const team2Score = parseRunsAndOvers(match?.team2Score);
  const team1OversDisplay = team1Score.oversText || String(match?.team1Overs || "").trim();
  const team2OversDisplay = team2Score.oversText || String(match?.team2Overs || "").trim();

  const innings = useMemo(() => extractInnings(scoreboard), [scoreboard]);
  const commentary = useMemo(() => extractCommentary(scoreboard), [scoreboard]);
  const batters = useMemo(() => extractBatters(scoreboard), [scoreboard]);
  const bowlers = useMemo(() => extractBowlers(scoreboard), [scoreboard]);
  const liveStats = scoreboard?.liveStats || {};
  const currentBatters = batters.slice(0, 2);
  const currentBowler = bowlers[0] || null;
  const lastSixBalls = String(liveStats?.lastSixBalls || "").trim() || formatLastSixFromCommentary(commentary);
  const equationText = String(liveStats?.equation || "").trim();
  const neededRuns = Number.isFinite(Number(liveStats?.neededRuns)) ? Number(liveStats?.neededRuns) : null;
  const ballsRemaining = Number.isFinite(Number(liveStats?.ballsRemaining)) ? Number(liveStats?.ballsRemaining) : null;

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

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-8">
            {/* Team A */}
            <div className="flex items-center gap-4">
              <TeamLogo teamId={teamA.teamId} short={teamA.short} size={64} />
              <div>
                <p className="text-white font-black text-2xl">{match?.team1 || "Team A"}</p>
                <p className="text-[#3BD4E7] text-sm font-mono">{team1Score.runsText}</p>
                {team1OversDisplay && <p className="text-white/35 text-xs">Overs: {team1OversDisplay}</p>}
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

            {/* Team B */}
            <div className="flex items-center gap-4 justify-end">
              <div className="text-right">
                <p className="text-white font-black text-2xl">{match?.team2 || "Team B"}</p>
                <p className="text-[#3BD4E7] text-sm font-mono">{team2Score.runsText}</p>
                {team2OversDisplay && <p className="text-white/35 text-xs">Overs: {team2OversDisplay}</p>}
              </div>
              <TeamLogo teamId={teamB.teamId} short={teamB.short} size={64} />
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
                    {(neededRuns != null || ballsRemaining != null || equationText) && (
                      <div className="flex justify-between gap-3">
                        <span className="text-white/45">Chase</span>
                        <span className="text-white/80 text-right">
                          {neededRuns != null && ballsRemaining != null
                            ? `${neededRuns} runs in ${ballsRemaining} balls`
                            : equationText || "-"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <span className="text-white/45">Current Run Rate</span>
                      <span className="text-[#6cecff] font-semibold">{liveStats?.currentRunRate || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-white/45">Required Run Rate</span>
                      <span className="text-white/80 text-right">{liveStats?.requiredRunRate || "-"}</span>
                    </div>
                    {lastSixBalls && (
                      <div className="flex justify-between gap-3">
                        <span className="text-white/45">Last 6 balls</span>
                        <span className="text-white/80 text-right font-mono">{lastSixBalls}</span>
                      </div>
                    )}
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
                    {currentBatters.length > 0 && (
                      <p className="text-white/35 text-xs mt-1">Batting: {currentBatters.map((b) => b.name).join(" · ")}</p>
                    )}
                  </div>
                  {batters.length === 0 && <div className="px-6 py-5 text-sm text-white/45">Live batter stats are not available yet.</div>}
                  {batters.length > 0 && (
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-[11px] uppercase tracking-wider text-white/35 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span>Batter</span>
                        <span className="text-right">R</span>
                        <span className="text-right">B</span>
                      </div>
                      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {batters.map((batter, index) => (
                          <div key={`${batter.name}-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3">
                            <p className="text-white/85 text-sm font-semibold truncate">{batter.name}</p>
                            <p className="text-[#6cecff] font-bold text-sm text-right">{batter.runs}</p>
                            <p className="text-white/60 text-sm text-right">{batter.balls}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </GlassCard>

                <GlassCard className="overflow-hidden">
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 className="text-white font-bold">Bowlers</h3>
                    {currentBowler?.name && (
                      <p className="text-white/35 text-xs mt-1">Bowling: {currentBowler.name}</p>
                    )}
                  </div>
                  {bowlers.length === 0 && <div className="px-6 py-5 text-sm text-white/45">Live bowler stats are not available yet.</div>}
                  {bowlers.length > 0 && (
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-[11px] uppercase tracking-wider text-white/35 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span>Bowler</span>
                        <span className="text-right">O</span>
                        <span className="text-right">Fig</span>
                      </div>
                      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {bowlers.map((bowler, index) => (
                          <div key={`${bowler.name}-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3">
                            <p className="text-white/85 text-sm font-semibold truncate">{bowler.name}</p>
                            <p className="text-white/60 text-sm text-right">{bowler.overs}</p>
                            <p className="text-[#ffb86b] font-bold text-sm text-right">{bowler.figures}</p>
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
