import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { Send, Mic, MicOff, Users, Volume2, Search, Plus, Globe, Lock, Hash, ChevronRight, LogIn, LogOut, Heart, Laugh, Flame, ThumbsUp, X } from "lucide-react";

/* ─── Types ─── */
interface Room { id: string; code: string; name: string; host: string; members: number; maxMembers: 20; type: "public" | "friends"; match: string; speaking: number; }
interface Message { id: number; user: string; message: string; time: string; isOwn?: boolean; }

/* ─── Mock Data ─── */
const publicRooms: Room[] = [
  { id: "r1", code: "RCB001", name: "RCB Fan Zone 🔴", host: "KingKohli18", members: 18, maxMembers: 20, type: "public", match: "RCB vs MI", speaking: 7 },
  { id: "r2", code: "MI002", name: "Mumbai Indians Official", host: "PalMiProfit", members: 14, maxMembers: 20, type: "public", match: "RCB vs MI", speaking: 4 },
  { id: "r3", code: "IPL303", name: "IPL Analysis Room 📊", host: "CricketGuru", members: 20, maxMembers: 20, type: "public", match: "RCB vs MI", speaking: 10 },
  { id: "r4", code: "LIVE44", name: "Live Score Updates", host: "SportzFan99", members: 11, maxMembers: 20, type: "public", match: "CSK vs KKR", speaking: 3 },
  { id: "r5", code: "STAT55", name: "Stats & Analytics 🎯", host: "DataNerd", members: 8, maxMembers: 20, type: "public", match: "CSK vs KKR", speaking: 2 },
];

const friendsRooms: Room[] = [
  { id: "f1", code: "FRD01", name: "Squad Watch Party 🎉", host: "You", members: 6, maxMembers: 20, type: "friends", match: "RCB vs MI", speaking: 2 },
  { id: "f2", code: "FRD02", name: "College Crew Room", host: "Arjun", members: 9, maxMembers: 20, type: "friends", match: "CSK vs KKR", speaking: 3 },
];

const mockMessages: Message[] = [
  { id: 1, user: "KingKohli18", message: "WHAT A SHOT! Kohli is in beast mode! 🔥🔥🔥", time: "4:34 PM" },
  { id: 2, user: "MumbaiMagi", message: "Bumrah gonna sort him out in the next over 💪", time: "4:35 PM" },
  { id: 3, user: "CricketGuru", message: "Win probability just shifted to RCB 72%! This is unreal!", time: "4:35 PM" },
  { id: 4, user: "SportzFan99", message: "DK coming in at 7, this could be game over for MI 😬", time: "4:36 PM" },
  { id: 5, user: "You", message: "Absolutely loving this match! RCB all the way! 🏆", time: "4:36 PM", isOwn: true },
  { id: 6, user: "KingKohli18", message: "That six by Maxwell was INSANE 🤯", time: "4:37 PM" },
];

const voiceUsers = [
  { id: 1, name: "KingKohli18", emoji: "👑", isSpeaking: true },
  { id: 2, name: "CricketGuru", emoji: "📊", isSpeaking: true },
  { id: 3, name: "MumbaiMagi", emoji: "🔵", isSpeaking: false },
  { id: 4, name: "SportzFan99", emoji: "⚡", isSpeaking: false },
  { id: 5, name: "DataNerd", emoji: "🎯", isSpeaking: true },
  { id: 6, name: "You", emoji: "👤", isSpeaking: false },
  { id: 7, name: "RCBfanatic", emoji: "🔴", isSpeaking: false },
  { id: 8, name: "PalmiProfit", emoji: "💰", isSpeaking: false },
];

const REACTIONS = [{ emoji: "👍", icon: ThumbsUp }, { emoji: "❤️", icon: Heart }, { emoji: "😂", icon: Laugh }, { emoji: "🔥", icon: Flame }];

/* ─── Room Browser ─── */
function RoomBrowser({ onJoin }: { onJoin: (room: Room) => void }) {
  const [tab, setTab] = useState<"public" | "friends">("public");
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);

  const allRooms = [...publicRooms, ...friendsRooms];

  const handleSearch = () => {
    const code = searchCode.trim().toUpperCase();
    const found = allRooms.find((r) => r.code === code);
    if (found) { setSearchResult(found); setNotFound(false); }
    else { setSearchResult(null); setNotFound(true); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Search by code */}
      <GlassCard className="p-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Hash size={18} style={{ color: "#3BD4E7" }} />Join Room by Code</h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => { setSearchCode(e.target.value.toUpperCase()); setNotFound(false); setSearchResult(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter room code (e.g. RCB001)"
              className="w-full pl-4 pr-4 py-3 rounded-xl text-white placeholder-white/30 outline-none text-sm tracking-widest font-mono"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
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
              <RoomCard room={searchResult} onJoin={onJoin} />
            </motion.div>
          )}
          {notFound && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 rounded-xl text-center" style={{ background: "rgba(255,77,141,0.08)", border: "1px solid rgba(255,77,141,0.2)" }}>
              <p className="text-[#FF4D8D] text-sm">No room found with code "{searchCode}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Room Tabs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setTab("public")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={tab === "public" ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white" } : { color: "rgba(255,255,255,0.4)" }}
            >
              <Globe size={14} /> Public
            </button>
            <button
              onClick={() => setTab("friends")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={tab === "friends" ? { background: "linear-gradient(135deg, #7C4DFF, #FF4D8D)", color: "white" } : { color: "rgba(255,255,255,0.4)" }}
            >
              <Lock size={14} /> Friends
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #FF4D8D, #7C4DFF)", boxShadow: "0 0 15px rgba(255,77,141,0.3)" }}
          >
            <Plus size={16} />
            Create Room
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === "public" ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === "public" ? 10 : -10 }}
            className="space-y-3"
          >
            {(tab === "public" ? publicRooms : friendsRooms).map((room) => (
              <RoomCard key={room.id} room={room} onJoin={onJoin} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

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
          {/* Member count */}
          <div className="text-center">
            <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: isFull ? "#FF4D8D" : "#00E676" }}>
              <Users size={14} />
              <span>{room.members}/{room.maxMembers}</span>
            </div>
            <div className="text-white/30 text-xs mt-0.5">
              <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "#00E676" }}>
                🎙 {room.speaking}/10 speaking
              </motion.span>
            </div>
          </div>

          <motion.button
            whileHover={!isFull ? { scale: 1.05 } : {}}
            whileTap={!isFull ? { scale: 0.95 } : {}}
            onClick={() => !isFull && onJoin(room)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
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

/* ─── Active Room ─── */
function ActiveRoom({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [message, setMessage] = useState("");
  const [isMicOn, setIsMicOn] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speakingCount = voiceUsers.filter((u) => u.isSpeaking).length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, {
      id: prev.length + 1, user: "You", message: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), isOwn: true,
    }]);
    setMessage("");
  };

  const sendReaction = (emoji: string) => {
    setReaction(emoji);
    setTimeout(() => setReaction(null), 2000);
    setShowReactions(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Match info + Voice users */}
      <div className="space-y-5">
        {/* Room Info */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold">{room.name}</h3>
              <p className="text-white/30 text-xs mt-0.5">Code: <span className="font-mono text-[#3BD4E7]">{room.code}</span></p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLeave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.3)", color: "#FF4D8D" }}
            >
              <LogOut size={12} />
              Leave
            </motion.button>
          </div>

          {/* Match score */}
          <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold">🔴 RCB — 167/4</span>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-[#FF4D8D] text-xs font-bold">● LIVE</motion.div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">🔵 MI — 142/7</span>
              <span className="text-white/40 text-xs">16.3 ov</span>
            </div>
            <div className="mt-3">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <motion.div initial={{ width: "50%" }} animate={{ width: "78%" }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #FF4D8D, #7C4DFF)" }} />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span style={{ color: "#FF4D8D" }}>RCB 78%</span>
                <span style={{ color: "#3BD4E7" }}>MI 22%</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Voice Channel */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Volume2 size={16} style={{ color: "#00E676" }} />
              Voice Channel
            </h3>
            <div className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: speakingCount >= 10 ? "rgba(255,77,141,0.15)" : "rgba(0,230,118,0.15)", color: speakingCount >= 10 ? "#FF4D8D" : "#00E676" }}>
              {speakingCount}/10 speaking
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {voiceUsers.map((user) => (
              <motion.div
                key={user.id}
                className="flex items-center gap-2 p-2 rounded-xl"
                style={{ background: user.isSpeaking ? "rgba(0,230,118,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${user.isSpeaking ? "rgba(0,230,118,0.2)" : "rgba(255,255,255,0.05)"}` }}
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base" style={{ background: "rgba(255,255,255,0.06)" }}>{user.emoji}</div>
                  {user.isSpeaking && (
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0.2, 0.8] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="absolute -inset-1 rounded-lg"
                      style={{ background: "rgba(0,230,118,0.3)", zIndex: -1 }}
                    />
                  )}
                </div>
                <span className="text-white text-xs font-medium truncate">{user.name}</span>
              </motion.div>
            ))}
          </div>

          {/* Members count */}
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-white/30">{room.members}/{room.maxMembers} members joined</span>
            <div className="h-1 flex-1 mx-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${(room.members / room.maxMembers) * 100}%`, background: "linear-gradient(90deg, #3BD4E7, #7C4DFF)" }} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Right: Chat */}
      <div className="lg:col-span-2">
        <GlassCard className="flex flex-col" style={{ height: "600px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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

              {/* Mic button */}
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
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
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
    </motion.div>
  );
}

/* ─── Main Component ─── */
export function LiveRoom() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <BackButton to={activeRoom ? undefined : `/match/${matchId}`} label={activeRoom ? "Browse Rooms" : "Match"} />
          <Breadcrumbs items={[{ label: "Live Match", path: `/match/${matchId}` }, { label: activeRoom ? activeRoom.name : "Live Rooms" }]} />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.4)", color: "#FF4D8D" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D8D]" />
                LIVE
              </motion.div>
              <span className="text-white/40 text-sm">RCB vs MI · IPL 2026</span>
            </div>
            <h1 className="text-3xl font-black text-white">
              {activeRoom ? activeRoom.name : "Live Match Rooms"}
            </h1>
            {!activeRoom && <p className="text-white/40 mt-1">Join a room or search by code. Max 20 members · 10 can speak at once.</p>}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeRoom ? (
            <ActiveRoom key="room" room={activeRoom} onLeave={() => setActiveRoom(null)} />
          ) : (
            <RoomBrowser key="browser" onJoin={setActiveRoom} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
