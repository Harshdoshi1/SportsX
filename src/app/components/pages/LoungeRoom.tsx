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
import { IPL_PLAYER_IMAGES, IPL_STANDINGS } from "../../data/ipl2026";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { cricketApi } from "../../services/cricketApi";
import { safeArray } from "../../services/cricketUi";
import { useMatchStore } from "../../../contexts/MatchContext";

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

/* ─── Batsman/Bowler data from IPL Player Images ─── */
const getPlayerImage = (name: string) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return IPL_PLAYER_IMAGES[slug] || null;
};

const parseRunsAndOvers = (value: unknown): { runsText: string; oversText: string } => {
  const raw = String(value || "").trim();
  if (!raw) return { runsText: "Yet to bat", oversText: "" };
  const compact = raw.match(/^\s*(\d{1,3})\s*[-/]\s*(\d{2,}(?:\.\d+)?)\s*$/);
  if (compact) {
    const runs = String(compact[1] || "").trim();
    const tail = String(compact[2] || "").trim();
    if (tail.includes(".") && tail.length >= 3) {
      const wkts = tail.slice(0, 1);
      const overs = tail.slice(1);
      return { runsText: `${runs}-${wkts}`, oversText: overs };
    }
  }
  const match = raw.match(/^\s*([0-9]+\s*[-/]\s*[0-9]+|[0-9]+)\s*(?:\(([^)]+)\))?\s*$/);
  if (match) {
    return { runsText: String(match[1] || "-").trim(), oversText: String(match[2] || "").trim() };
  }
  return { runsText: raw, oversText: "" };
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
  const { adminMatches, liveSnapshotsByMatchId } = useMatchStore();

  const parsedTeams = parseMatchId(matchId || "");
  const [resolvedTeams, setResolvedTeams] = useState(parsedTeams);
  const [matchPayload, setMatchPayload] = useState<any>(null);
  const match = matchPayload?.match || null;
  const scoreboard = matchPayload?.scoreboard || null;
  const team1 = resolvedTeams.team1;
  const team2 = resolvedTeams.team2;
  const teamALogo = getTeamLogoProps(team1);
  const teamBLogo = getTeamLogoProps(team2);

  const score1 = parseRunsAndOvers(match?.team1Score);
  const score2 = parseRunsAndOvers(match?.team2Score);
  const overs1 = score1.oversText || String(match?.team1Overs || "").trim();
  const overs2 = score2.oversText || String(match?.team2Overs || "").trim();

  // Sample batsman/bowler for mini scorecard
  const team1Standing = IPL_STANDINGS.find(s => s.short === team1);
  const team2Standing = IPL_STANDINGS.find(s => s.short === team2);
  const team1Prob = team1Standing ? Math.round((team1Standing.won / Math.max(team1Standing.played, 1)) * 100) : 50;

  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [message, setMessage] = useState("");
  const [isMicOn, setIsMicOn] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>(createVoiceUsers(team1, team2));
  const [teamAPlayers, setTeamAPlayers] = useState<LoungePlayer[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<LoungePlayer[]>([]);
  const [scorecardLoading, setScorecardLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const speakingCount = voiceUsers.filter((u) => u.isSpeaking).length;
  const roomCode = roomId?.startsWith("private-") ? roomId.replace("private-", "") : roomId?.toUpperCase() || "IPL001";

  useEffect(() => {
    let active = true;

    const loadTeams = async () => {
      try {
        if (!matchId) return;
        const adminMatch = adminMatches.find((m) => m.id === matchId);
        const isAdminLive = Boolean(adminMatch && adminMatch.type === "live" && adminMatch.sourceUrl);
        const adminSnapshot = isAdminLive ? liveSnapshotsByMatchId[matchId] : null;
        if (active && isAdminLive && adminSnapshot?.match) {
          const teamA = String(adminSnapshot.match?.team1 || parsedTeams.team1 || "TEAM A").toUpperCase();
          const teamB = String(adminSnapshot.match?.team2 || parsedTeams.team2 || "TEAM B").toUpperCase();
          setResolvedTeams({ team1: teamA, team2: teamB });
          setMatchPayload({ match: adminSnapshot.match, scoreboard: adminSnapshot.scoreboard || null });
          return;
        }

        const detail: any = isAdminLive
          ? await cricketApi.getMatchDetailsByUrl(String(adminMatch?.sourceUrl || ""), true)
          : await cricketApi.getMatchDetails(matchId || "", true);
        const teamA = String(detail?.match?.team1 || parsedTeams.team1 || "TEAM A").toUpperCase();
        const teamB = String(detail?.match?.team2 || parsedTeams.team2 || "TEAM B").toUpperCase();
        if (active) {
          setResolvedTeams({ team1: teamA, team2: teamB });
          setMatchPayload({ match: detail?.match || null, scoreboard: detail?.scoreboard || null });
        }
      } catch {
        if (active) {
          setResolvedTeams(parsedTeams);
        }
      }
    };

    loadTeams();

    return () => {
      active = false;
    };
  }, [adminMatches, liveSnapshotsByMatchId, matchId]);

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

  useEffect(() => {
    let active = true;

    const loadLoungePlayers = async () => {
      try {
        setScorecardLoading(true);

        const [teamARes, teamBRes] = await Promise.all([
          cricketApi.getTeamPlayers(team1, { page: 1, limit: 60, teamName: team1 }),
          cricketApi.getTeamPlayers(team2, { page: 1, limit: 60, teamName: team2 }),
        ]);

        if (!active) {
          return;
        }

        setTeamAPlayers(safeArray<LoungePlayer>((teamARes as any)?.players));
        setTeamBPlayers(safeArray<LoungePlayer>((teamBRes as any)?.players));
      } catch {
        if (!active) {
          return;
        }
        setTeamAPlayers([]);
        setTeamBPlayers([]);
      } finally {
        if (active) {
          setScorecardLoading(false);
        }
      }
    };

    loadLoungePlayers();

    return () => {
      active = false;
    };
  }, [team1, team2]);

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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCodeCopied(true);
    } catch {}
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const liveBatters = safeArray<any>(scoreboard?.batters).slice(0, 2);
  const batsmanData = liveBatters.length
    ? liveBatters.map((player) => ({
        name: String(player?.name || ""),
        runs: Number(player?.runs || 0),
        balls: Number(player?.balls || 0),
        image: getPlayerImage(String(player?.name || "")),
      }))
    : teamAPlayers
        .slice()
        .sort((a, b) => Number(b?.runs || 0) - Number(a?.runs || 0))
        .slice(0, 2)
        .map((player) => ({
          name: String(player?.name || ""),
          runs: Number(player?.runs || 0),
          balls: 0,
          image: player?.image || getPlayerImage(String(player?.name || "")),
        }));

  const liveBowler = safeArray<any>(scoreboard?.bowlers)[0] || null;
  const bowlerData = liveBowler?.name
    ? {
        name: String(liveBowler?.name || "Not available"),
        overs: String(liveBowler?.overs || "-"),
        runs: Number(String(liveBowler?.figures || "").split("-")[1] || 0),
        wickets: Number(String(liveBowler?.figures || "").split("-")[0] || 0),
        image: getPlayerImage(String(liveBowler?.name || "")),
      }
    : (() => {
        const bowlerBase = teamBPlayers
          .slice()
          .sort((a, b) => Number(b?.wickets || 0) - Number(a?.wickets || 0))[0];

        return {
          name: String(bowlerBase?.name || "Not available"),
          overs: "-",
          runs: Number(bowlerBase?.runs || 0),
          wickets: Number(bowlerBase?.wickets || 0),
          image: bowlerBase?.image || getPlayerImage(String(bowlerBase?.name || "")),
        };
      })();

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
                  {score1.runsText}
                  {overs1 && <span className="text-white/30 text-xs font-normal"> {overs1} ov</span>}
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
                <Radio size={10} /> LIVE
              </motion.div>
              <span className="text-white/30 text-xs">CRR: {String(scoreboard?.liveStats?.currentRunRate || "-")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-black text-lg">{team2}</p>
                <p className="text-white/40 text-sm">
                  {score2.runsText === "Yet to bat" ? "Yet to bat" : score2.runsText}
                  {overs2 && <span className="text-white/30 text-xs"> {overs2} ov</span>}
                </p>
              </div>
              <TeamLogo teamId={teamBLogo.teamId} short={teamBLogo.short} size={36} />
            </div>
          </div>

          {/* Batsmen + Bowler with player images */}
          <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {/* Batsmen */}
            <div className="flex items-center gap-4">
              {scorecardLoading && (
                <div className="text-white/40 text-xs">Loading players...</div>
              )}
              {!scorecardLoading && batsmanData.length === 0 && (
                <div className="text-white/40 text-xs">Batting data not available</div>
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
