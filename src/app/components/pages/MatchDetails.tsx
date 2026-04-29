import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { MessageCircle, Users } from "lucide-react";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { cricketApi } from "../../services/cricketApi";
import {
  DASH,
  formatApiDate,
  getCommentaryEntries,
  getCurrentBatters,
  getCurrentBowler,
  getCurrentOverBalls,
  getCurrentRunRate,
  getLastSixBalls,
  getLiveSummaryStats,
  getNeedSummary,
  getRequiredRunRate,
  getScorecardInnings,
  parseRunsAndOvers,
  IPL_NAME_TO_SHORT,
  SHORT_TO_TEAM_ID,
  normalizeText,
} from "../../services/cricketUi";
import {
  CurrentPlayersCard,
  KeyStatsRow,
  LastSixBallsStrip,
  LiveNeedRow,
  MatchHeaderCard,
  ScorecardInningsCard,
  ProbablePlayingXI,
} from "../ui/cricket-match-ui";
import { IPL_TEAM_PROFILES } from "../../data/ipl2026";
import { useMatchStore } from "../../../contexts/MatchContext";

type TabKey = "Scorecard" | "Commentary" | "Info";

const tabs: TabKey[] = ["Scorecard", "Commentary", "Info"];

const formatUpdatedTime = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return DASH;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const deriveTargetText = (team1ScoreRaw: unknown, inningsCount: number) => {
  if (inningsCount < 2) {
    return "";
  }

  const parsed = parseRunsAndOvers(team1ScoreRaw);
  const runBase = Number(String(parsed.runsText || "").split(/[-/]/)[0]);
  if (!Number.isFinite(runBase)) {
    return "";
  }

  return `Target ${runBase + 1}`;
};

export function MatchDetails() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { adminMatches, liveSnapshotsByMatchId } = useMatchStore();
  const [activeTab, setActiveTab] = useState<TabKey>("Scorecard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchPayload, setMatchPayload] = useState<any>(null);
  const [localMatchInfo, setLocalMatchInfo] = useState<{ team1: string; team2: string } | null>(null);
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
      try {
        if (!matchId) return;
        if (!matchPayload) setLoading(true);

        const adminMatch = adminMatches.find((m) => m.id === matchId);
        const isAdminLive = Boolean(adminMatch && adminMatch.type === "live" && adminMatch.sourceUrl);
        const adminSnapshot = isAdminLive ? liveSnapshotsByMatchId[matchId] : null;

        if (active && isAdminLive && adminSnapshot?.match) {
          const payload = { match: adminSnapshot.match, scoreboard: adminSnapshot.scoreboard || null };
          setMatchPayload(payload);
          setLoading(false);
          return;
        }

        const detail: any = isAdminLive
          ? await cricketApi.getMatchDetailsByUrl(String(adminMatch?.sourceUrl || ""), fresh)
          : await cricketApi.getMatchDetails(matchId, fresh);

        if (active && detail?.match) {
          setMatchPayload({ match: detail.match, scoreboard: detail.scoreboard || null });
          setLoading(false);
          return;
        }

        // Fallback to match list if details are empty
        const iplMatches = await cricketApi.getIplScrapedMatches();
        const found = (iplMatches?.matches || []).find((m: any) => String(m.id) === String(matchId));
        if (active && found) {
          setLocalMatchInfo({ team1: found.team1 || found.teamA, team2: found.team2 || found.teamB });
        }
      } catch (err) {
        if (active) setError("Failed to load match data. Please try again later.");
      } finally {
        if (active) setLoading(false);
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
  const adminMatch = adminMatches.find((m) => m.id === matchId);
  const livePayload = useMemo(() => ({ match, scoreboard }), [match, scoreboard]);
  const liveStats = scoreboard?.liveStats || {};
  const innings = useMemo(() => getScorecardInnings(livePayload), [livePayload]);
  const commentary = useMemo(() => getCommentaryEntries(livePayload), [livePayload]);
  const currentBatters = useMemo(() => getCurrentBatters(livePayload), [livePayload]);
  const currentBowler = useMemo(() => getCurrentBowler(livePayload), [livePayload]);
  const currentOverBalls = useMemo(() => getCurrentOverBalls(livePayload), [livePayload]);
  const lastSixBalls = useMemo(() => getLastSixBalls(livePayload), [livePayload]);
  const targetText = useMemo(() => deriveTargetText(match?.team1Score, innings.length), [innings.length, match?.team1Score]);
  const summaryStats = useMemo(() => getLiveSummaryStats(livePayload, targetText), [livePayload, targetText]);
  const needSummary = useMemo(() => getNeedSummary(liveStats), [liveStats]);
  const team1Score = parseRunsAndOvers(match?.team1Score);
  const team2Score = parseRunsAndOvers(match?.team2Score);
  const headerDateTime = [formatApiDate(match?.date), match?.startTime]
    .filter((val) => val && val !== DASH && !String(val).includes("302-550"))
    .join(" · ");

  const parsedTeams = useMemo(() => {
    const raw = String(matchId || "").toLowerCase();
    const parts = raw.split("-");
    const teams: string[] = [];
    for (const part of parts) {
      const upper = part.toUpperCase();
      if (SHORT_TO_TEAM_ID[upper]) teams.push(upper);
    }
    if (teams.length >= 2) return { team1: teams[0], team2: teams[1] };
    const vsParts = raw.split("-vs-");
    if (vsParts.length === 2) return { team1: vsParts[0].toUpperCase(), team2: vsParts[1].toUpperCase() };
    return { team1: "Team A", team2: "Team B" };
  }, [matchId]);

  const team1Name = String(
    match?.team1 ||
      match?.teamA ||
      localMatchInfo?.team1 ||
      adminMatch?.matchTitle?.split(/\s+vs\s+/i)[0] ||
      parsedTeams.team1
  ).trim();
  const team2Name = String(
    match?.team2 ||
      match?.teamB ||
      localMatchInfo?.team2 ||
      adminMatch?.matchTitle?.split(/\s+vs\s+/i)[1] ||
      parsedTeams.team2
  ).trim();

  const getSquad = (teamName: string) => {
    if (!teamName || teamName === "Team A" || teamName === "Team B") return [];
    const normalized = normalizeText(teamName);
    const short = IPL_NAME_TO_SHORT[normalized] || teamName;
    const teamId = SHORT_TO_TEAM_ID[short] || normalized;
    return IPL_TEAM_PROFILES[teamId]?.fullSquad || [];
  };

  const squad1 = getSquad(team1Name);
  const squad2 = getSquad(team2Name);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-8 flex items-center justify-between">
          <BackButton to="/dashboard" />
          <Breadcrumbs
            items={[
              { label: match?.series || "Cricket", path: "/dashboard" },
              { label: `${team1Name} vs ${team2Name}` },
            ]}
          />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
          <MatchHeaderCard
            series={match?.series || "Cricket"}
            status={loading ? "Loading" : match?.status || "Live"}
            venue={match?.venue || DASH}
            dateTime={headerDateTime || DASH}
            team1={team1Name}
            team2={team2Name}
            team1Score={{ runsText: team1Score.runsText, oversText: team1Score.oversText || String(match?.team1Overs || "").trim() }}
            team2Score={{ runsText: team2Score.runsText, oversText: team2Score.oversText || String(match?.team2Overs || "").trim() }}
            result={match?.result}
            subtitle={error || match?.score || ""}
            loading={loading}
            actions={
              <>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/lounge/${matchId}`)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #7C4DFF, #FF4D8D)", boxShadow: "0 0 20px rgba(124,77,255,0.3)" }}
                >
                  <Users size={16} />
                  Join Lounge
                </motion.button>
                <button
                  onClick={() => navigate(`/lounge/${matchId}`)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                >
                  <MessageCircle size={16} />
                  Open Lounge
                </button>
              </>
            }
            footer={
              <div className="space-y-4">
                <KeyStatsRow
                  items={[
                    { label: "CRR", value: summaryStats.crr },
                    { label: "RRR", value: summaryStats.rrr },
                    { label: "Partnership", value: summaryStats.partnership },
                    { label: "Last Wicket", value: summaryStats.lastWicket },
                    { label: "Target", value: summaryStats.target },
                  ]}
                />
                <LiveNeedRow
                  neededRuns={needSummary.neededRuns}
                  ballsRemaining={needSummary.ballsRemaining}
                  requiredRate={getRequiredRunRate(liveStats)}
                  equation={needSummary.equation}
                  isFirstInnings={!needSummary.neededRuns && !needSummary.ballsRemaining}
                  totalRuns={team1Score.runsText}
                  totalBalls={String(Math.floor(Number(team1Score.oversText) * 6) + (Number(team1Score.oversText) % 1 * 10 || 0))}
                />
                {lastSixBalls.length > 0 && (
                  <div className="rounded-2xl border border-white/7 bg-white/[0.03] px-4 py-3">
                    <LastSixBallsStrip balls={lastSixBalls} />
                  </div>
                )}
              </div>
            }
          />

          <div className="flex w-fit gap-1 rounded-xl border border-white/7 bg-white/[0.03] p-1">
            {tabs.map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
                style={
                  activeTab === tab
                    ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white", boxShadow: "0 0 20px rgba(59,212,231,0.3)" }
                    : { color: "rgba(255,255,255,0.45)" }
                }
              >
                {tab}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "Scorecard" && (
              <motion.div key="scorecard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                {currentBatters.length > 0 || currentBowler ? (
                  <>
                    <CurrentPlayersCard batters={currentBatters} bowler={currentBowler} overBalls={currentOverBalls} loading={loading} />
                    {innings.length === 0 ? (
                      <GlassCard className="p-5">
                        <p className="text-sm text-white/45">No structured scorecard data is available for this match yet.</p>
                      </GlassCard>
                    ) : (
                      innings.map((inning) => <ScorecardInningsCard key={inning.key} inning={inning} />)
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                      <p className="text-lg font-bold text-white">Match yet to begin</p>
                      <p className="mt-1 text-sm text-white/40">Real-time scorecard will appear here once the match starts.</p>
                    </div>
                    <ProbablePlayingXI team1={team1Name} team2={team2Name} squad1={squad1} squad2={squad2} loading={loading} />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "Commentary" && (
              <motion.div key="commentary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="overflow-hidden">
                  <div className="border-b border-white/6 px-6 py-4">
                    <h3 className="text-white font-bold">Commentary</h3>
                  </div>
                  {commentary.length === 0 && (
                    <div className="px-6 py-5 text-sm text-white/45">Commentary is not available for this match in the current live payload.</div>
                  )}
                  {commentary.map((entry, index) => (
                    <div
                      key={`${entry.over}-${index}`}
                      className="flex gap-4 px-6 py-4"
                      style={{ borderBottom: index < commentary.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                    >
                      <div
                        className="flex h-8 w-14 flex-shrink-0 items-center justify-center rounded-lg text-xs font-mono font-bold"
                        style={{ background: "rgba(255,255,255,0.08)", color: "#7ad6ff" }}
                      >
                        {entry.over}
                      </div>
                      <p className="text-sm leading-relaxed text-white/75">{entry.text}</p>
                    </div>
                  ))}
                </GlassCard>
              </motion.div>
            )}

            {activeTab === "Info" && (
              <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <GlassCard className="p-5" glow="none">
                  <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Series</p>
                  <div className="text-lg font-black text-white">{match?.series || DASH}</div>
                </GlassCard>
                <GlassCard className="p-5" glow="none">
                  <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Venue</p>
                  <div className="text-lg font-black text-white">{match?.venue || DASH}</div>
                </GlassCard>
                <GlassCard className="p-5" glow="none">
                  <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Updated</p>
                  <div className="text-lg font-black text-[#7dd3fc]">{formatUpdatedTime(match?.fetchedAt)}</div>
                </GlassCard>
                <GlassCard className="p-5" glow="none">
                  <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Match Id</p>
                  <div className="text-lg font-black text-[#86efac]">{matchId || DASH}</div>
                </GlassCard>
                <GlassCard className="p-5 md:col-span-2" glow="none">
                  <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Live Context</p>
                  <div className="space-y-2 text-sm text-white/75">
                    <p>CRR: {getCurrentRunRate(liveStats)}</p>
                    <p>RRR: {getRequiredRunRate(liveStats)}</p>
                    <p>Equation: {needSummary.equation || DASH}</p>
                    <p>Projected Score: {summaryStats.projected}</p>
                    <p>Toss: {String(liveStats?.tossInfo || "").trim() || DASH}</p>
                  </div>
                </GlassCard>
                <GlassCard className="p-5 md:col-span-2" glow="none">
                  <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Live Feed</p>
                  <div className="space-y-2 text-sm text-white/75">
                    <p>Status: {match?.status || DASH}</p>
                    <p>Result: {match?.result || DASH}</p>
                    <p>Commentary Lines: {commentary.length}</p>
                    <p>Innings Found: {innings.length}</p>
                    {match?.sourceUrl && (
                      <a href={match.sourceUrl} target="_blank" rel="noreferrer" className="inline-block text-[#7dd3fc] hover:text-[#bae6fd]">
                        Open Official Live Feed
                      </a>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
