import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import {
  Send, Mic, MicOff, Users, Volume2, LogOut, Heart, Laugh, Flame,
  ThumbsUp, Copy, Check, Radio,
} from "lucide-react";
import { getTeamLogoProps } from "../../services/cricketUi";
import { IPL_PLAYER_IMAGES } from "../../data/ipl2026";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { cricketApi } from "../../services/cricketApi";

/* ─── Types ─── */
interface Message {
  id: number;
  user: string;
  message: string;
  time: string;
  isOwn?: boolean;
  avatar?: string;
}

interface VoiceUser {
  id: number;
  name: string;
  avatar?: string;
  emoji: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface LoungePlayer {
  id?: string | number;
  name: string;
  role?: string;
  image?: string | null;
  runs?: number | null;
  wickets?: number | null;
}

interface InningEntry {
  title: string;
  team?: string;
  score: string;
  overs: string;
}

interface BatterEntry {
  name: string;
  runs: number;
  balls: number;
}

interface BowlerEntry {
  name: string;
  figures: string;
  overs: string;
}

/* ─── Mock Data ─── */
const mockMessages: Message[] = [
  { id: 1, user: "CricFan18", message: "WHAT A SHOT! Absolutely smashed that for six! 🔥🔥🔥", time: "4:34 PM" },
  { id: 2, user: "MumbaiMagi", message: "Bumrah gonna sort this out in the death overs 💪", time: "4:35 PM" },
  { id: 3, user: "CricketGuru", message: "Win probability just shifted! This is getting intense! 📊", time: "4:35 PM" },
  { id: 4, user: "SportzFan99", message: "That powerplay was absolutely destructive 💥", time: "4:36 PM" },
  { id: 5, user: "You", message: "Absolutely loving this match! Let's go! 🏆", time: "4:36 PM", isOwn: true },
  { id: 6, user: "DataNerd", message: "Strike rate of 185 in the last 5 overs... insane! 🤯", time: "4:37 PM" },
  { id: 7, user: "ViralCric", message: "This is why IPL is the best league in the world 🌍", time: "4:38 PM" },
];

const createVoiceUsers = (team1: string, team2: string): VoiceUser[] => [
  { id: 1, name: "CricFan18", emoji: "👑", isSpeaking: true, isMuted: false },
  { id: 2, name: "CricketGuru", emoji: "📊", isSpeaking: true, isMuted: false },
  { id: 3, name: "MumbaiMagi", emoji: "🔵", isSpeaking: false, isMuted: false },
  { id: 4, name: "SportzFan99", emoji: "⚡", isSpeaking: false, isMuted: true },
  { id: 5, name: "DataNerd", emoji: "🎯", isSpeaking: true, isMuted: false },
  { id: 6, name: "You", emoji: "👤", isSpeaking: false, isMuted: true },
  { id: 7, name: "ViralCric", emoji: "🔥", isSpeaking: false, isMuted: false },
  { id: 8, name: "IPLFanatic", emoji: "🏏", isSpeaking: false, isMuted: true },
];

/* ─── Helper ─── */
const parseMatchId = (matchId: string) => {
  const parts = matchId.split("-vs-");
  if (parts.length === 2) {
    return { team1: parts[0].toUpperCase(), team2: parts[1].toUpperCase() };
  }
  return { team1: "TEAM A", team2: "TEAM B" };
};

const extractInnings = (scoreboard: any): InningEntry[] => {
  const innings = Array.isArray(scoreboard?.innings) ? scoreboard.innings : [];
  return innings
    .map((inning: any, index: number) => ({
      title: String(inning?.title || inning?.team || `Innings ${index + 1}`),
      team: String(inning?.team || "").toUpperCase(),
      score: String(inning?.score || `${inning?.runs ?? "-"}/${inning?.wickets ?? "-"}`),
      overs: String(inning?.overs ?? "-"),
    }))
    .filter((inning: InningEntry) => Boolean(inning.score));
};

const extractBatters = (scoreboard: any): BatterEntry[] => {
  const rows = Array.isArray(scoreboard?.batters) ? scoreboard.batters : [];
  return rows
    .map((row: any) => ({
      name: String(row?.name || "").trim(),
      runs: Number(row?.runs ?? 0),
      balls: Number(row?.balls ?? 0),
    }))
    .filter((row: BatterEntry) => Boolean(row.name))
    .slice(0, 6);
};

const extractBowlers = (scoreboard: any): BowlerEntry[] => {
  const rows = Array.isArray(scoreboard?.bowlers) ? scoreboard.bowlers : [];
  return rows
    .map((row: any) => ({
      name: String(row?.name || "").trim(),
      figures: String(row?.figures || "-"),
      overs: String(row?.overs || "-"),
    }))
    .filter((row: BowlerEntry) => Boolean(row.name))
    .slice(0, 6);
};

const parseRunsFromScore = (score: string | null | undefined) => {
  const hit = String(score || "").match(/(\d{1,3})\s*[/-]\s*\d{1,2}/);
  return hit?.[1] ? Number(hit[1]) : null;
};

/* ─── Batsman/Bowler data from IPL Player Images ─── */
const getPlayerImage = (name: string) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return IPL_PLAYER_IMAGES[slug] || null;
};

/* ─── Audio Wave Animation ─── */
function AudioWaves({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: "linear-gradient(180deg, #00E676, #3BD4E7)" }}
          animate={{
            height: ["4px", `${10 + Math.random() * 10}px`, "4px"],
          }}
          transition={{
            duration: 0.4 + Math.random() * 0.3,
            repeat: Infinity,
            delay: i * 0.08,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Speaking Indicator Ring ─── */
function SpeakingRing({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {active && (
        <>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute -inset-1 rounded-full"
            style={{ border: "2px solid #00E676", zIndex: -1 }}
          />
          <motion.div
            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.3, repeat: Infinity }}
            className="absolute -inset-2 rounded-full"
            style={{ border: "1px solid rgba(0,230,118,0.3)", zIndex: -2 }}
          />
        </>
      )}
    </div>
  );
}

export function LoungeRoom() {
  const { matchId, roomId } = useParams<{ matchId: string; roomId: string }>();
  const navigate = useNavigate();

  const parsedTeams = parseMatchId(matchId || "");
  const [resolvedTeams, setResolvedTeams] = useState(parsedTeams);
  const team1 = resolvedTeams.team1;
  const team2 = resolvedTeams.team2;
  const teamALogo = getTeamLogoProps(team1);
  const teamBLogo = getTeamLogoProps(team2);

  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [message, setMessage] = useState("");
  const [isMicOn, setIsMicOn] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>(createVoiceUsers(team1, team2));
  const [livePayload, setLivePayload] = useState<any>(null);
  const [scorecardError, setScorecardError] = useState<string | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const endedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const speakingCount = voiceUsers.filter((u) => u.isSpeaking).length;
  const roomCode = roomId?.startsWith("private-") ? roomId.replace("private-", "") : roomId?.toUpperCase() || "IPL001";

  useEffect(() => {
    if (!matchId) {
      setScorecardLoading(false);
      return;
    }

    let active = true;

    const loadLiveScore = async () => {
      if (!active || inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setScorecardError(null);
        const detail: any = await cricketApi.getMatchDetails(matchId, true, controller.signal);
        if (!active) {
          return;
        }

        const teamA = String(detail?.match?.team1 || parsedTeams.team1 || "TEAM A").toUpperCase();
        const teamB = String(detail?.match?.team2 || parsedTeams.team2 || "TEAM B").toUpperCase();

        setResolvedTeams({ team1: teamA, team2: teamB });
        setLivePayload(detail || null);

        const status = String(detail?.match?.status || "").toLowerCase();
        endedRef.current = Boolean(detail?.match?.matchEnded) || status === "completed";
      } catch (fetchError: any) {
        if (fetchError?.name === "AbortError") {
          return;
        }
        if (active) {
          setScorecardError(fetchError?.message || "Live score update failed");
          setResolvedTeams(parsedTeams);
        }
      } finally {
        inFlightRef.current = false;
        if (active) {
          setScorecardLoading(false);
        }
      }
    };

    setScorecardLoading(true);
    loadLiveScore();
    const interval = setInterval(() => {
      if (!endedRef.current) {
        loadLiveScore();
      }
    }, 2000);

    return () => {
      active = false;
      abortRef.current?.abort();
      clearInterval(interval);
    };
  }, [matchId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simulate random speaking changes
  useEffect(() => {
    const interval = setInterval(() => {
      setVoiceUsers((prev) =>
        prev.map((u) => ({
          ...u,
          isSpeaking: u.name === "You" ? isMicOn : Math.random() > 0.6,
        }))
      );
    }, 2500);
    return () => clearInterval(interval);
  }, [isMicOn]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        user: "You",
        message: message.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isOwn: true,
      },
    ]);
    setMessage("");
  };

  const sendReaction = (emoji: string) => {
    setReaction(emoji);
    setTimeout(() => setReaction(null), 2000);
    setShowReactions(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const liveMatch = livePayload?.match || {};
  const liveScoreboard = livePayload?.scoreboard || {};
  const liveStats = liveScoreboard?.liveStats || {};
  const innings = extractInnings(liveScoreboard);
  const batters = extractBatters(liveScoreboard);
  const bowlers = extractBowlers(liveScoreboard);

  const team1Inning = innings.find((inn) => {
    const token = String(team1 || "").toUpperCase();
    const title = String(inn?.title || inn?.team || "").toUpperCase();
    return token && title.includes(token);
  }) || innings[0];

  const team2Inning = innings.find((inn) => {
    const token = String(team2 || "").toUpperCase();
    const title = String(inn?.title || inn?.team || "").toUpperCase();
    return token && title.includes(token);
  }) || innings[1];

  const team1ScoreText = String(liveMatch?.team1Score || team1Inning?.score || "-");
  const team2ScoreText = String(liveMatch?.team2Score || team2Inning?.score || "-");
  const team1OversText = String(liveMatch?.team1Overs || team1Inning?.overs || "-");
  const team2OversText = String(liveMatch?.team2Overs || team2Inning?.overs || "-");

  const batsmanData = batters.slice(0, 2).map((bat) => ({
    name: String(bat?.name || "Not available"),
    runs: Number(bat?.runs || 0),
    balls: Number(bat?.balls || 0),
    image: getPlayerImage(String(bat?.name || "")),
  }));

  const leadBowler = bowlers[0];
  const figureTokens = String(leadBowler?.figures || "0-0").split("-");
  const bowlerData = {
    name: String(leadBowler?.name || "Not available"),
    overs: String(leadBowler?.overs || "-"),
    runs: Number(figureTokens[1] || 0),
    wickets: Number(figureTokens[0] || 0),
    image: getPlayerImage(String(leadBowler?.name || "")),
  };

  const team1Runs = parseRunsFromScore(team1ScoreText);
  const team2Runs = parseRunsFromScore(team2ScoreText);
  const totalRuns = Number(team1Runs || 0) + Number(team2Runs || 0);
  const team1Prob = totalRuns > 0
    ? Math.max(5, Math.min(95, Math.round((Number(team1Runs || 0) / totalRuns) * 100)))
    : 50;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <BackButton to={`/lounge/${matchId}`} label="Lounges" />
          <Breadcrumbs items={[
            { label: `${team1} vs ${team2}`, path: `/lounge/${matchId}` },
            { label: "Room" },
          ]} />
        </div>

        {/* ─── Mini Scorecard (like reference image 2) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-4 md:p-6 mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(13,10,30,0.95) 0%, rgba(8,18,35,0.95) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Score Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TeamLogo teamId={teamALogo.teamId} short={teamALogo.short} size={36} />
              <div>
                <p className="text-white font-black text-lg">{team1}</p>
                <p className="text-[#3BD4E7] text-sm font-mono font-bold">
                  {team1ScoreText} <span className="text-white/30 text-xs font-normal">{team1OversText} ov</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold"
                style={{ background: "rgba(255,77,141,0.15)", color: "#FF4D8D" }}
              >
                <Radio size={10} /> {scorecardLoading ? "UPDATING" : (liveMatch?.status || "LIVE")}
              </motion.div>
              <span className="text-white/30 text-xs">CRR: {liveStats?.currentRunRate || "-"}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-black text-lg">{team2}</p>
                <p className="text-white/40 text-sm">
                  {team2ScoreText !== "-" ? `${team2ScoreText} (${team2OversText} ov)` : "Yet to bat"}
                </p>
              </div>
              <TeamLogo teamId={teamBLogo.teamId} short={teamBLogo.short} size={36} />
            </div>
          </div>

          {scorecardError && (
            <div className="mb-3 text-xs text-[#ff8ca8]">{scorecardError}</div>
          )}

          {/* Batsmen + Bowler with player images */}
          <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {/* Batsmen */}
            <div className="flex items-center gap-4">
              {scorecardLoading && (
                <div className="text-white/40 text-xs">Updating live scorecard...</div>
              )}
              {!scorecardLoading && batsmanData.length === 0 && (
                <div className="text-white/40 text-xs">Live batting data not available</div>
              )}
              {!scorecardLoading && batsmanData.map((bat, i) => (
                <div key={bat.name} className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: "2px solid rgba(59,212,231,0.3)", background: "rgba(255,255,255,0.06)" }}>
                    {bat.image ? (
                      <ImageWithFallback src={bat.image} alt={bat.name} fallbackMode="person" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">?</div>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{bat.name.split(" ").pop()}</p>
                    <p className="text-[#3BD4E7] text-xs font-mono font-bold">{bat.runs}<span className="text-white/30">({bat.balls})</span></p>
                  </div>
                  {i === 0 && <span className="text-white/20 text-xs mx-1">+</span>}
                </div>
              ))}
            </div>

            {/* Bowler */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: "2px solid rgba(255,77,141,0.3)", background: "rgba(255,255,255,0.06)" }}>
                {bowlerData.image ? (
                  <ImageWithFallback src={bowlerData.image} alt={bowlerData.name} fallbackMode="person" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">?</div>
                )}
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{bowlerData.name.split(" ").pop()}</p>
                <p className="text-[#FF4D8D] text-xs font-mono font-bold">{bowlerData.wickets}-{bowlerData.runs} <span className="text-white/30">({bowlerData.overs})</span></p>
              </div>
            </div>
          </div>

          {/* Win Probability Mini */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs font-bold" style={{ color: "#FF4D8D" }}>{team1} {team1Prob}%</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                initial={{ width: "50%" }}
                animate={{ width: `${team1Prob}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #FF4D8D, #7C4DFF)" }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: "#3BD4E7" }}>{team2} {100 - team1Prob}%</span>
          </div>
        </motion.div>

        {/* ─── Room Info Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-white">Live Lounge</h2>
            <span className="px-2 py-1 rounded-lg text-xs font-mono text-[#3BD4E7]" style={{ background: "rgba(59,212,231,0.1)", border: "1px solid rgba(59,212,231,0.2)" }}>
              {roomCode}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {codeCopied ? <Check size={12} className="text-[#00E676]" /> : <Copy size={12} className="text-white/40" />}
            </motion.button>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/lounge/${matchId}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.3)", color: "#FF4D8D" }}
          >
            <LogOut size={12} />
            Leave Room
          </motion.button>
        </motion.div>

        {/* ─── Main Content: Voice + Chat ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Voice Channel */}
          <div className="space-y-5">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Volume2 size={16} style={{ color: "#00E676" }} />
                  Voice Channel
                </h3>
                <div
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{
                    background: speakingCount >= 10 ? "rgba(255,77,141,0.15)" : "rgba(0,230,118,0.15)",
                    color: speakingCount >= 10 ? "#FF4D8D" : "#00E676",
                  }}
                >
                  {speakingCount}/10 speaking
                </div>
              </div>

              {/* Voice Users Grid */}
              <div className="grid grid-cols-2 gap-3">
                {voiceUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl"
                    style={{
                      background: user.isSpeaking ? "rgba(0,230,118,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${user.isSpeaking ? "rgba(0,230,118,0.2)" : "rgba(255,255,255,0.05)"}`,
                    }}
                    layout
                  >
                    <SpeakingRing active={user.isSpeaking}>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{
                          background: user.isSpeaking
                            ? "linear-gradient(135deg, rgba(0,230,118,0.3), rgba(59,212,231,0.3))"
                            : "rgba(255,255,255,0.06)",
                        }}
                      >
                        {user.emoji}
                      </div>
                    </SpeakingRing>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-xs font-medium truncate block">{user.name}</span>
                      {user.isSpeaking && (
                        <AudioWaves active={true} />
                      )}
                    </div>
                    {user.isMuted && <MicOff size={10} className="text-white/20 flex-shrink-0" />}
                  </motion.div>
                ))}
              </div>

              {/* Members count */}
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-white/30">{voiceUsers.length}/10 members</span>
                <div className="h-1.5 flex-1 mx-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(voiceUsers.length / 10) * 100}%`, background: "linear-gradient(90deg, #3BD4E7, #7C4DFF)" }} />
                </div>
              </div>

              {/* Big Mic Button */}
              <div className="mt-5 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setIsMicOn(!isMicOn)}
                  className="relative w-16 h-16 rounded-full flex items-center justify-center"
                  style={
                    isMicOn
                      ? {
                          background: "linear-gradient(135deg, #00E676, #3BD4E7)",
                          boxShadow: "0 0 40px rgba(0,230,118,0.5), 0 0 80px rgba(0,230,118,0.2)",
                        }
                      : {
                          background: "rgba(255,255,255,0.08)",
                          border: "2px solid rgba(255,255,255,0.15)",
                        }
                  }
                >
                  {isMicOn ? (
                    <Mic size={24} className="text-white" />
                  ) : (
                    <MicOff size={24} className="text-white/40" />
                  )}
                  {isMicOn && (
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full"
                      style={{ border: "2px solid #00E676" }}
                    />
                  )}
                </motion.button>
              </div>
              <p className="text-center text-white/30 text-xs mt-2">
                {isMicOn ? "🎙️ You are speaking" : "Tap to unmute"}
              </p>
            </GlassCard>
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-2">
            <GlassCard className="flex flex-col" style={{ height: "620px" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-white font-bold flex items-center gap-2">
                  💬 Live Chat
                  <span className="text-xs font-normal text-white/30">{messages.length} messages</span>
                </h3>
                <div className="flex items-center gap-2">
                  {/* Reaction button */}
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setShowReactions(!showReactions)}
                      className="p-2 rounded-xl text-xl"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      😊
                    </motion.button>
                    <AnimatePresence>
                      {showReactions && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          className="absolute right-0 bottom-12 flex gap-2 p-2 rounded-2xl z-10"
                          style={{ background: "rgba(10,8,28,0.95)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
                        >
                          {["👍", "❤️", "😂", "🔥", "🎉", "😮", "😱", "🏆"].map((e) => (
                            <motion.button
                              key={e}
                              whileHover={{ scale: 1.3 }}
                              whileTap={{ scale: 0.8 }}
                              onClick={() => sendReaction(e)}
                              className="text-2xl hover:bg-white/10 p-1.5 rounded-xl transition-all"
                            >
                              {e}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mic toggle */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setIsMicOn(!isMicOn)}
                    className="p-2 rounded-xl"
                    style={
                      isMicOn
                        ? { background: "linear-gradient(135deg, #00E676, #3BD4E7)", boxShadow: "0 0 20px rgba(0,230,118,0.5)" }
                        : { background: "rgba(255,255,255,0.05)" }
                    }
                  >
                    {isMicOn ? <Mic size={18} className="text-white" /> : <MicOff size={18} className="text-white/40" />}
                  </motion.button>
                </div>
              </div>

              {/* Floating reaction */}
              <AnimatePresence>
                {reaction && (
                  <motion.div
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -100, scale: 2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute left-1/2 top-1/2 text-4xl pointer-events-none z-20"
                    style={{ transform: "translateX(-50%)" }}
                  >
                    {reaction}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex gap-3 ${msg.isOwn ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                        style={{
                          background: msg.isOwn
                            ? "linear-gradient(135deg, #3BD4E7, #7C4DFF)"
                            : "rgba(255,255,255,0.06)",
                        }}
                      >
                        {msg.isOwn ? "👤" : msg.user.charAt(0)}
                      </div>
                      <div className={`max-w-[70%] ${msg.isOwn ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`flex items-center gap-2 mb-1 ${msg.isOwn ? "flex-row-reverse" : ""}`}>
                          <span className="text-xs font-semibold" style={{ color: msg.isOwn ? "#3BD4E7" : "#a78bfa" }}>{msg.user}</span>
                          <span className="text-white/20 text-xs">{msg.time}</span>
                        </div>
                        <div
                          className="px-4 py-2.5 rounded-2xl text-sm text-white leading-relaxed"
                          style={
                            msg.isOwn
                              ? { background: "linear-gradient(135deg, rgba(59,212,231,0.25), rgba(124,77,255,0.25))", border: "1px solid rgba(59,212,231,0.2)" }
                              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }
                          }
                        >
                          {msg.message}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-xl text-white text-sm placeholder-white/30 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    className="px-5 py-3 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", boxShadow: "0 0 20px rgba(59,212,231,0.3)" }}
                  >
                    <Send size={18} className="text-white" />
                  </motion.button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
