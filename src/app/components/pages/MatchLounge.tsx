import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import {
  Globe, Lock, Plus, Search, Hash, Users, LogIn, Copy, Check, ChevronRight, Radio, Mic,
} from "lucide-react";
import { getTeamLogoProps } from "../../services/cricketUi";
import { cricketApi } from "../../services/cricketApi";
import { safeArray, isUpcomingStatus } from "../../services/cricketUi";
import { IPL_PLAYER_IMAGES } from "../../data/ipl2026";
import { IPL_STANDINGS } from "../../data/ipl2026";
import { useMatchStore } from "../../../contexts/MatchContext";

/* ─── Types ─── */
interface Room {
  id: string;
  code: string;
  name: string;
  host: string;
  members: number;
  maxMembers: number;
  type: "public" | "private";
  match: string;
  speaking: number;
}

/* ─── Mock Data ─── */
const generatePublicRooms = (matchName: string): Room[] => [
  { id: "p1", code: "IPL001", name: "Fan Zone 🔴🏏", host: "CricFan18", members: 7, maxMembers: 10, type: "public", match: matchName, speaking: 3 },
  { id: "p2", code: "IPL002", name: "Analysis Hub 📊", host: "CricketGuru", members: 4, maxMembers: 10, type: "public", match: matchName, speaking: 2 },
  { id: "p3", code: "IPL003", name: "Live Commentary Room", host: "SportzFan99", members: 9, maxMembers: 10, type: "public", match: matchName, speaking: 5 },
  { id: "p4", code: "IPL004", name: "Prediction Lounge 🎯", host: "DataNerd", members: 3, maxMembers: 10, type: "public", match: matchName, speaking: 1 },
  { id: "p5", code: "IPL005", name: "Memes & Chill 😂", host: "ViralCric", members: 8, maxMembers: 10, type: "public", match: matchName, speaking: 4 },
];

const generatePrivateRooms = (matchName: string): Room[] => [
  { id: "pr1", code: "FRD01", name: "Squad Watch Party 🎉", host: "You", members: 4, maxMembers: 10, type: "private", match: matchName, speaking: 2 },
  { id: "pr2", code: "FRD02", name: "College Crew Room", host: "Arjun", members: 6, maxMembers: 10, type: "private", match: matchName, speaking: 3 },
];

/* ─── Helper: parse match info from ID ─── */
const parseMatchId = (matchId: string) => {
  const parts = matchId.split("-vs-");
  if (parts.length === 2) {
    return { team1: parts[0].toUpperCase(), team2: parts[1].toUpperCase() };
  }
  return { team1: "TEAM A", team2: "TEAM B" };
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

export function MatchLounge() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { adminMatches, liveSnapshotsByMatchId } = useMatchStore();
  const [tab, setTab] = useState<"public" | "private">("public");
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [matchPayload, setMatchPayload] = useState<any>(null);

  const match = matchPayload?.match || null;
  const parsedTeams = parseMatchId(matchId || "");
  const team1 = String(match?.team1 || parsedTeams.team1 || "TEAM A").toUpperCase();
  const team2 = String(match?.team2 || parsedTeams.team2 || "TEAM B").toUpperCase();
  const matchName = `${team1} vs ${team2}`;
  const publicRooms = generatePublicRooms(matchName);
  const privateRooms = generatePrivateRooms(matchName);
  const allRooms = [...publicRooms, ...privateRooms];

  const teamALogo = getTeamLogoProps(team1);
  const teamBLogo = getTeamLogoProps(team2);

  const score1 = parseRunsAndOvers(match?.team1Score);
  const score2 = parseRunsAndOvers(match?.team2Score);
  const overs1 = score1.oversText || String(match?.team1Overs || "").trim();
  const overs2 = score2.oversText || String(match?.team2Overs || "").trim();

  // Look up team standings for win probability
  const team1Standing = IPL_STANDINGS.find(s => s.short === team1);
  const team2Standing = IPL_STANDINGS.find(s => s.short === team2);
  const team1WinRate = team1Standing ? (team1Standing.won / Math.max(team1Standing.played, 1)) * 100 : 50;
  const team2WinRate = team2Standing ? (team2Standing.won / Math.max(team2Standing.played, 1)) * 100 : 50;
  const totalRate = team1WinRate + team2WinRate || 1;
  const team1Prob = Math.round((team1WinRate / totalRate) * 100);
  const team2Prob = 100 - team1Prob;

  useEffect(() => {
    let active = true;

    const loadMatch = async () => {
      try {
        if (!matchId) return;
        const adminMatch = adminMatches.find((m) => m.id === matchId);
        const isAdminLive = Boolean(adminMatch && adminMatch.type === "live" && adminMatch.sourceUrl);
        const adminSnapshot = isAdminLive ? liveSnapshotsByMatchId[matchId] : null;
        if (active && isAdminLive && adminSnapshot?.match) {
          setMatchPayload({ match: adminSnapshot.match, scoreboard: adminSnapshot.scoreboard || null });
          return;
        }

        const detail: any = isAdminLive
          ? await cricketApi.getMatchDetailsByUrl(String(adminMatch?.sourceUrl || ""), true)
          : await cricketApi.getMatchDetails(matchId, true);
        if (active) {
          setMatchPayload({ match: detail?.match || null, scoreboard: detail?.scoreboard || null });
        }
      } catch {}
    };

    loadMatch();

    return () => {
      active = false;
    };
  }, [adminMatches, liveSnapshotsByMatchId, matchId]);

  const handleSearch = () => {
    const code = searchCode.trim().toUpperCase();
    const found = allRooms.find((r) => r.code === code);
    if (found) { setSearchResult(found); setNotFound(false); }
    else { setSearchResult(null); setNotFound(true); }
  };

  const handleCreateRoom = () => {
    const code = `PVT${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setGeneratedCode(code);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const joinRoom = (room: Room) => {
    navigate(`/lounge/${matchId}/room/${room.id}`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <BackButton to="/dashboard" label="Dashboard" />
          <Breadcrumbs items={[{ label: "IPL 2026", path: "/dashboard" }, { label: `${team1} vs ${team2}` }, { label: "Match Lounge" }]} />
        </div>

        {/* ─── Live Match Scorecard ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(255,77,141,0.1) 0%, rgba(124,77,255,0.14) 50%, rgba(59,212,231,0.08) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Live badge */}
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(255,77,141,0.18)", border: "1px solid rgba(255,77,141,0.4)", color: "#FF4D8D" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D8D]" />
              LIVE MATCH
            </motion.div>
            <span className="text-white/40 text-sm">Indian Premier League 2026</span>
          </div>

          {/* Teams + Score */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            {/* Team A */}
            <div className="flex items-center gap-4">
              <TeamLogo teamId={teamALogo.teamId} short={teamALogo.short} size={64} />
              <div>
                <p className="text-white font-black text-2xl">{team1}</p>
                <p className="text-[#3BD4E7] text-sm font-mono font-bold">{score1.runsText}</p>
                {overs1 && <p className="text-white/30 text-xs">{overs1} ov</p>}
              </div>
            </div>

            {/* VS / Score */}
            <div className="text-center">
              <div className="text-white font-black text-3xl mb-1">VS</div>
              <p className="text-white/40 text-xs">{match?.venue || "Venue TBA"}</p>
              <p className="text-white/30 text-xs mt-1">{match?.date || ""} {match?.startTime || ""}</p>
            </div>

            {/* Team B */}
            <div className="flex items-center gap-4 justify-end">
              <div className="text-right">
                <p className="text-white font-black text-2xl">{team2}</p>
                <p className="text-[#3BD4E7] text-sm font-mono font-bold">{score2.runsText}</p>
                {overs2 && <p className="text-white/30 text-xs">{overs2} ov</p>}
              </div>
              <TeamLogo teamId={teamBLogo.teamId} short={teamBLogo.short} size={64} />
            </div>
          </div>

          {/* Win Probability Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold" style={{ color: "#FF4D8D" }}>{team1} {team1Prob}%</span>
              <span className="text-white/30">Win Probability</span>
              <span className="font-bold" style={{ color: "#3BD4E7" }}>{team2} {team2Prob}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                initial={{ width: "50%" }}
                animate={{ width: `${team1Prob}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #FF4D8D, #7C4DFF)" }}
              />
            </div>
          </div>

          {/* CRR + Match Status */}
          {match?.status && (
            <div className="mt-4 flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(59,212,231,0.15)", border: "1px solid rgba(59,212,231,0.3)", color: "#3BD4E7" }}>
                {match?.status}
              </span>
              {match?.result && (
                <span className="text-white/50 text-xs">{match?.result}</span>
              )}
            </div>
          )}
        </motion.div>

        {/* ─── Lounge Header ─── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Match Lounges</h1>
          <p className="text-white/40">Join a lounge to watch, chat, and talk with fellow fans. Max 10 members per room.</p>
        </motion.div>

        {/* ─── Public / Private Tabs + Create Room ─── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-6">

          {/* Search by code */}
          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Hash size={18} style={{ color: "#3BD4E7" }} />Join Room by Code</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value.toUpperCase()); setNotFound(false); setSearchResult(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter room code (e.g. IPL001)"
                className="flex-1 pl-4 pr-4 py-3 rounded-xl text-white placeholder-white/30 outline-none text-sm tracking-widest font-mono"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSearch}
                className="px-5 py-3 rounded-xl font-semibold text-white flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", boxShadow: "0 0 20px rgba(59,212,231,0.3)" }}
              >
                <Search size={16} />
                Search
              </motion.button>
            </div>

            <AnimatePresence>
              {searchResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <RoomCard room={searchResult} onJoin={joinRoom} />
                </motion.div>
              )}
              {notFound && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 rounded-xl text-center" style={{ background: "rgba(255,77,141,0.08)", border: "1px solid rgba(255,77,141,0.2)" }}>
                  <p className="text-[#FF4D8D] text-sm">No room found with code "{searchCode}"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Tabs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => setTab("public")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={tab === "public" ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white" } : { color: "rgba(255,255,255,0.4)" }}
                >
                  <Globe size={14} /> Public Lounges
                </button>
                <button
                  onClick={() => setTab("private")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={tab === "private" ? { background: "linear-gradient(135deg, #7C4DFF, #FF4D8D)", color: "white" } : { color: "rgba(255,255,255,0.4)" }}
                >
                  <Lock size={14} /> Private Lounges
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {tab === "public" ? (
                <motion.div key="public" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                  {publicRooms.map((room) => (
                    <RoomCard key={room.id} room={room} onJoin={joinRoom} />
                  ))}
                </motion.div>
              ) : (
                <motion.div key="private" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  {/* Create or Enter Code Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Create Lounge */}
                    <GlassCard className="p-6" hover>
                      <div className="text-center">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                          style={{ background: "linear-gradient(135deg, rgba(124,77,255,0.2), rgba(255,77,141,0.2))", border: "1px solid rgba(124,77,255,0.3)" }}
                        >
                          <Plus size={28} className="text-[#a78bfa]" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Create Lounge</h3>
                        <p className="text-white/40 text-sm mb-5">Start a private room and share the code with friends</p>

                        {!generatedCode ? (
                          <>
                            <input
                              type="text"
                              value={newRoomName}
                              onChange={(e) => setNewRoomName(e.target.value)}
                              placeholder="Room name (optional)"
                              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none text-sm mb-3"
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                            />
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={handleCreateRoom}
                              className="w-full px-5 py-3 rounded-xl font-semibold text-white"
                              style={{ background: "linear-gradient(135deg, #7C4DFF, #FF4D8D)", boxShadow: "0 0 20px rgba(124,77,255,0.3)" }}
                            >
                              Create Room
                            </motion.button>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-4 rounded-xl" style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)" }}>
                              <p className="text-[#00E676] text-xs mb-1">Room Created!</p>
                              <p className="text-white font-mono text-2xl font-black tracking-widest">{generatedCode}</p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={handleCopyCode}
                              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: codeCopied ? "#00E676" : "white" }}
                            >
                              {codeCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Code</>}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => navigate(`/lounge/${matchId}/room/private-${generatedCode}`)}
                              className="w-full px-5 py-3 rounded-xl font-semibold text-white"
                              style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", boxShadow: "0 0 20px rgba(59,212,231,0.3)" }}
                            >
                              Enter Room
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </GlassCard>

                    {/* Enter Code */}
                    <GlassCard className="p-6" hover>
                      <div className="text-center">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                          style={{ background: "linear-gradient(135deg, rgba(59,212,231,0.2), rgba(124,77,255,0.2))", border: "1px solid rgba(59,212,231,0.3)" }}
                        >
                          <Hash size={28} className="text-[#3BD4E7]" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Enter Code</h3>
                        <p className="text-white/40 text-sm mb-5">Got a code from a friend? Enter it to join their private lounge</p>
                        <input
                          type="text"
                          value={searchCode}
                          onChange={(e) => { setSearchCode(e.target.value.toUpperCase()); setNotFound(false); setSearchResult(null); }}
                          placeholder="Paste room code here"
                          className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none text-sm font-mono tracking-widest mb-3"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleSearch}
                          className="w-full px-5 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", boxShadow: "0 0 20px rgba(59,212,231,0.3)" }}
                        >
                          <LogIn size={16} /> Join Room
                        </motion.button>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Existing private rooms */}
                  {privateRooms.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-white/50 text-sm font-semibold mb-3">Your Private Rooms</h3>
                      <div className="space-y-3">
                        {privateRooms.map((room) => (
                          <RoomCard key={room.id} room={room} onJoin={joinRoom} />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Room Card ─── */
function RoomCard({ room, onJoin }: { room: Room; onJoin: (r: Room) => void }) {
  const isFull = room.members >= room.maxMembers;
  return (
    <GlassCard className="p-5" hover>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {room.type === "public" ? <Globe size={12} className="text-white/30" /> : <Lock size={12} className="text-white/30" />}
            <span className="font-mono text-xs text-white/30">{room.code}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/30 text-xs">{room.match}</span>
          </div>
          <h4 className="text-white font-bold truncate">{room.name}</h4>
          <p className="text-white/40 text-xs mt-0.5">Hosted by {room.host}</p>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="text-center">
            <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: isFull ? "#FF4D8D" : "#00E676" }}>
              <Users size={14} />
              <span>{room.members}/{room.maxMembers}</span>
            </div>
            <div className="text-white/30 text-xs mt-0.5">
              <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "#00E676" }}>
                <Mic size={10} className="inline mr-1" />{room.speaking} speaking
              </motion.span>
            </div>
          </div>

          <motion.button
            whileHover={!isFull ? { scale: 1.05 } : {}}
            whileTap={!isFull ? { scale: 0.95 } : {}}
            onClick={() => !isFull && onJoin(room)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={
              isFull
                ? { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)", cursor: "not-allowed" }
                : { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white", boxShadow: "0 0 15px rgba(59,212,231,0.25)" }
            }
          >
            <LogIn size={14} />
            {isFull ? "Full" : "Join"}
          </motion.button>
        </div>
      </div>
    </GlassCard>
  );
}
