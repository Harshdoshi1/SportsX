import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { MessageCircle, Radio, Users, MapPin, Activity, Flame, BarChart3 } from "lucide-react";
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
    .slice(0, 2);

const extractBowlers = (scoreboard: any): BowlerEntry[] =>
  safeArray<any>(scoreboard?.bowlers)
    .map((row) => ({
      name: String(row?.name || ""),
      figures: String(row?.figures || "-"),
      overs: String(row?.overs || "-"),
    }))
    .filter((row) => row.name)
    .slice(0, 1);

const parseRuns = (score?: string | null) => {
  const hit = String(score || "").match(/(\d{1,3})\s*[/-]\s*\d{1,2}/);
  return hit?.[1] ? Number(hit[1]) : null;
};

const parseWickets = (score?: string | null) => {
  const hit = String(score || "").match(/\d{1,3}\s*[/-]\s*(\d{1,2})/);
  return hit?.[1] ? Number(hit[1]) : null;
};

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const buildProjected = (currentRR: number) => {
  const rrBands = [currentRR, 5.0, 5.5, 6.0].map((v) => Number(v.toFixed(2)));
  return {
    rrBands,
    for40: rrBands.map((rr) => Math.round(rr * 40)),
    for50: rrBands.map((rr) => Math.round(rr * 50)),
  };
};

const extractBallTrail = (commentary: CommentaryEntry[]) => {
  const feed = commentary
    .slice(0, 8)
    .flatMap((entry) => String(entry?.text || "").match(/\b(?:0|1|2|3|4|6|W)\b/g) || [])
    .slice(0, 12);
  return feed;
};

export function MatchDetails() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { adminMatches } = useMatchStore();
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

        const admin = adminMatches.find((m) => m.id === matchId);
        const response: any = admin
          ? await cricketApi.getMatchDetailsByUrl(admin.sourceUrl, true, controller.signal, { tournamentId: "admin", series: admin.sectionLabel })
          : await cricketApi.getMatchDetails(matchId, fresh, controller.signal);
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
        const result = String(response?.match?.result || "").toLowerCase();
        endedRef.current = Boolean(response?.match?.matchEnded) || status === "completed" || /(won|result|match over|innings complete)/.test(status) || /(won|result)/.test(result);
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
    }, 1000);

    return () => {
      active = false;
      abortRef.current?.abort();
      clearInterval(pollHandle);
    };
  }, [matchId, adminMatches]);

  const match = matchPayload?.match || {};
  const scoreboard = matchPayload?.scoreboard || {};
  const teamA = getTeamLogoProps(match?.team1);
  const teamB = getTeamLogoProps(match?.team2);

  const innings = useMemo(() => extractInnings(scoreboard), [scoreboard]);
  const commentary = useMemo(() => extractCommentary(scoreboard), [scoreboard]);
  const batters = useMemo(() => extractBatters(scoreboard), [scoreboard]);
  const bowlers = useMemo(() => extractBowlers(scoreboard), [scoreboard]);
  const liveStats = scoreboard?.liveStats || {};
  const team1Runs = parseRuns(match?.team1Score);
  const team2Runs = parseRuns(match?.team2Score);
  const team1Wkts = parseWickets(match?.team1Score);
  const team2Wkts = parseWickets(match?.team2Score);
  const totalKnownRuns = toNumber(team1Runs) + toNumber(team2Runs);
  const teamAProbability = totalKnownRuns > 0
    ? Math.max(8, Math.min(92, Math.round((toNumber(team1Runs) / totalKnownRuns) * 100)))
    : 50;

  const currentRR = toNumber(liveStats?.currentRunRate, 5.0);
  const projection = buildProjected(currentRR);
  const striker = batters[0] || null;
  const nonStriker = batters[1] || null;
  const currentBowler = bowlers[0] || null;
  const ballTrail = extractBallTrail(commentary);
  
  const strikerSR = striker && striker.balls > 0 ? ((striker.runs / striker.balls) * 100).toFixed(1) : "-";
  const nonStrikerSR = nonStriker && nonStriker.balls > 0 ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(1) : "-";
  const matchStatusLower = String(match?.status || "").toLowerCase();
  const matchResultText = String(match?.result || "").trim();
  const matchEnded = Boolean(match?.matchEnded) || matchStatusLower === "completed" || /(won|result|match over|innings complete)/.test(matchStatusLower) || /(won|result)/i.test(matchResultText);
  const inningsCount = innings.length;
  const opponentYetToBat = inningsCount <= 1 && (!match?.team2Score || String(match?.team2Score || "").trim() === "-");
  const equationTextRaw = String(liveStats?.equation || "").trim();
  const chaseLine =
    equationTextRaw ||
    (/(need|needs|runs needed|required)/i.test(String(match?.status || "")) ? String(match?.status || "").trim() : "");
  const matchNotStarted =
    !matchEnded &&
    /(upcoming|scheduled|starts|toss pending)/.test(matchStatusLower) &&
    inningsCount === 0;

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
                <span className="text-white/70 text-sm font-semibold">{match?.series || "Cricket"}</span>
                <span className="text-white/30 text-xs">{formatApiDate(match?.date)}</span>
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
                <TeamLogo teamId={teamA.teamId} short={teamA.short} size={52} />
                <div>
                  <p className="text-white/80 text-sm font-semibold">{match?.team1 || "Team A"}</p>
                  <p className="text-[#9de8ff] text-4xl font-black leading-none">{match?.team1Score || "-"}</p>
                  <p className="text-white/40 text-xs mt-1">Overs {match?.team1Overs || "-"}</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-white text-5xl md:text-6xl font-black leading-none">VS</p>
                <p className="text-[#ffc86b] text-xs mt-2 font-bold">{liveStats?.tossInfo || "Toss pending"}</p>
                <p className="text-white/45 text-xs mt-1">CRR {liveStats?.currentRunRate || "-"}</p>
              </div>

              <div className="flex items-center gap-3 md:justify-end justify-center">
                <div className="text-right">
                  <p className="text-white/80 text-sm font-semibold">{match?.team2 || "Team B"}</p>
                  <p className="text-[#9de8ff] text-4xl font-black leading-none">{opponentYetToBat ? "Yet to bat" : (match?.team2Score || "-")}</p>
                  <p className="text-white/40 text-xs mt-1">Overs {opponentYetToBat ? "-" : (match?.team2Overs || "-")}</p>
                </div>
                <TeamLogo teamId={teamB.teamId} short={teamB.short} size={52} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-white/55">
                <Activity size={13} className="text-[#7ce8ff]" />
                <span>Partnership: {liveStats?.partnership || "-"}</span>
                <span className="text-white/30">|</span>
                <span>Last Wicket: {liveStats?.lastWicket || "-"}</span>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/lounge/${matchId}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #23b2e2, #246bff)", boxShadow: "0 0 20px rgba(35,178,226,0.35)" }}
                >
                  <Users size={15} />
                  Join Lounge
                </motion.button>
                <button
                  onClick={() => navigate(`/lounge/${matchId}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.8)" }}
                >
                  <MessageCircle size={15} />
                  Open Lounge
                </button>
              </div>
            </div>

            {error && <p className="text-[#ff8ca8] text-xs mt-3">{error}</p>}
            {matchNotStarted && (
              <div className="mt-4 rounded-2xl p-4 md:p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <div className="text-xs font-black tracking-wide text-white/60">⏳ MATCH YET TO START</div>
                <div className="text-white font-semibold text-sm mt-1">Live scorecard will appear automatically once the innings begins.</div>
              </div>
            )}
            {matchEnded && (
              <div className="mt-4 rounded-2xl p-4 md:p-5" style={{ background: "linear-gradient(135deg, rgba(0,230,118,0.16), rgba(16,185,129,0.10))", border: "1px solid rgba(0,230,118,0.28)" }}>
                <div className="text-xs font-black tracking-wide" style={{ color: "#00E676" }}>✅ MATCH ENDED</div>
                <div className="text-white font-black text-lg mt-1">{matchResultText || String(match?.status || "Result")}</div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-white/50 text-xs">{match?.team1 || "Team A"}</div>
                    <div className="text-white font-black text-base">{match?.team1Score || "-"}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-white/50 text-xs">{match?.team2 || "Team B"}</div>
                    <div className="text-white font-black text-base">{match?.team2Score || "-"}</div>
                  </div>
                </div>
              </div>
            )}
            {!matchEnded && opponentYetToBat && (
              <div className="mt-3 text-xs font-semibold text-white/45">
                {match?.team2 || "Opponent"}: <span className="text-white/75">Yet to bat</span>
              </div>
            )}
            {!matchEnded && chaseLine && (
              <div className="mt-2 text-xs font-semibold" style={{ color: "#ffc86b" }}>
                {chaseLine}
              </div>
            )}
            {match?.sourceUrl && (
              <a
                href={match.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-3 text-xs font-semibold text-[#79e6ff] hover:text-[#a4f0ff]"
              >
                Open Official Live Feed
              </a>
            )}
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
              <div className="grid grid-cols-1 xl:grid-cols-[1.75fr_1fr] gap-5">
                <GlassCard className="p-5 md:p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-black text-lg flex items-center gap-2">
                      <Flame size={16} className="text-[#ff9b4a]" />
                      Live Window
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(124,231,255,0.1)", color: "#7ce8ff", border: "1px solid rgba(124,231,255,0.25)" }}>
                      Auto refresh 3s
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {loading ? (
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
                        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-white/40 text-[11px] uppercase mb-1">Striker</p>
                          <p className="text-white text-sm font-bold truncate">{striker?.name || "-"}</p>
                          <p className="text-[#7ce8ff] text-lg font-black">{striker ? `${striker.runs}` : "-"}<span className="text-xs text-white/35"> ({striker?.balls ?? "-"})</span></p>
                          <p className="text-white/40 text-[10px] mt-1">SR: {strikerSR}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-white/40 text-[11px] uppercase mb-1">Non Striker</p>
                          <p className="text-white text-sm font-bold truncate">{nonStriker?.name || "-"}</p>
                          <p className="text-[#7ce8ff] text-lg font-black">{nonStriker ? `${nonStriker.runs}` : "-"}<span className="text-xs text-white/35"> ({nonStriker?.balls ?? "-"})</span></p>
                          <p className="text-white/40 text-[10px] mt-1">SR: {nonStrikerSR}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-white/40 text-[11px] uppercase mb-1">Current Bowler</p>
                          <p className="text-white text-sm font-bold truncate">{currentBowler?.name || "-"}</p>
                          <p className="text-[#ffbf73] text-lg font-black">{currentBowler?.figures || "-"}</p>
                          <p className="text-white/40 text-[10px] mt-1">Overs: {currentBowler?.overs || "-"}</p>
                        </div>
                      </>
                    )}
                  </div>

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

                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-white/45 text-xs mb-2">Recent Ball Feed</p>
                    <div className="flex flex-wrap gap-2">
                      {ballTrail.length === 0 && <span className="text-white/45 text-xs">No recent ball symbols in commentary yet.</span>}
                      {ballTrail.map((ball, idx) => (
                        <span
                          key={`${ball}-${idx}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                          style={{
                            background: ball === "W" ? "rgba(255,82,82,0.2)" : ball === "4" || ball === "6" ? "rgba(123,232,255,0.2)" : "rgba(255,255,255,0.08)",
                            color: ball === "W" ? "#ff8a8a" : ball === "4" || ball === "6" ? "#7ce8ff" : "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          {ball}
                        </span>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-5" glow="none">
                  <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#7ce8ff]" />
                    Probability
                  </h3>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#7ce8ff] font-bold">{match?.team1 || "A"}</span>
                      <span className="text-[#ffbf73] font-bold">{match?.team2 || "B"}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full" style={{ width: `${teamAProbability}%`, background: "linear-gradient(90deg, #2bb4ff, #7ce8ff)" }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1 text-white/70">
                      <span>{teamAProbability}%</span>
                      <span>{100 - teamAProbability}%</span>
                    </div>
                  </div>

                  <div className="text-xs text-white/45 mb-2">Projected Score</div>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="grid grid-cols-5 px-3 py-2 text-[11px] text-white/55" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <span>Overs</span>
                      {projection.rrBands.map((rr, idx) => (
                        <span key={`rr-${idx}`} className="text-right">{rr.toFixed(2)}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 px-3 py-2 text-xs border-t border-white/5">
                      <span className="text-white/70">40</span>
                      {projection.for40.map((val, idx) => (
                        <span key={`40-${idx}`} className="text-right text-white/90">{val}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 px-3 py-2 text-xs border-t border-white/5">
                      <span className="text-white/70">50</span>
                      {projection.for50.map((val, idx) => (
                        <span key={`50-${idx}`} className="text-right text-white/90">{val}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="text-white/45">{match?.team1 || "Team A"}</p>
                      <p className="text-[#7ce8ff] font-black text-lg">{team1Runs ?? "-"}<span className="text-xs text-white/30">/{team1Wkts ?? "-"}</span></p>
                    </div>
                    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="text-white/45">{match?.team2 || "Team B"}</p>
                      <p className="text-[#ffbf73] font-black text-lg">{team2Runs ?? "-"}<span className="text-xs text-white/30">/{team2Wkts ?? "-"}</span></p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                <GlassCard className="overflow-hidden md:col-span-1">
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 className="text-white font-bold">Innings</h3>
                  </div>
                  {innings.length === 0 && <div className="px-6 py-5 text-sm text-white/45">No innings parsed yet.</div>}
                  {innings.map((inning, index) => (
                    <div key={`${inning.title}-${index}`} className="px-6 py-4" style={{ borderBottom: index < innings.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <p className="text-white/85 text-sm font-semibold">{inning.title}</p>
                      <p className="text-white text-lg font-black mt-1">{inning.score}</p>
                      <p className="text-white/35 text-xs">Overs {inning.overs}</p>
                    </div>
                  ))}
                </GlassCard>

                <GlassCard className="overflow-hidden md:col-span-1">
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 className="text-white font-bold">Batters</h3>
                  </div>
                  {batters.length === 0 && <div className="px-6 py-5 text-sm text-white/45">Live batter stats are not available yet.</div>}
                  {batters.map((batter, index) => (
                    <div key={`${batter.name}-${index}`} className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: index < batters.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <p className="text-white/90 text-sm font-semibold truncate pr-3">{batter.name}</p>
                      <p className="text-[#7ce8ff] font-bold text-sm whitespace-nowrap">{batter.runs} ({batter.balls})</p>
                    </div>
                  ))}
                </GlassCard>

                <GlassCard className="overflow-hidden md:col-span-1">
                  <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 className="text-white font-bold">Bowlers</h3>
                  </div>
                  {bowlers.length === 0 && <div className="px-6 py-5 text-sm text-white/45">Live bowler stats are not available yet.</div>}
                  {bowlers.map((bowler, index) => (
                    <div key={`${bowler.name}-${index}`} className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: index < bowlers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <p className="text-white/90 text-sm font-semibold truncate pr-3">{bowler.name}</p>
                      <p className="text-[#ffbf73] font-bold text-sm whitespace-nowrap">{bowler.figures} ({bowler.overs})</p>
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
