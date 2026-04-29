import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import {
  Globe, Lock, Plus, Search, Hash, Users, LogIn, Copy, Check, Mic,
} from "lucide-react";
import { cricketApi } from "../../services/cricketApi";
import {
  DASH,
  getCurrentBatters,
  getCurrentBowler,
  getLiveSummaryStats,
  getNeedSummary,
  getRequiredRunRate,
  getLastSixBalls,
  parseRunsAndOvers,
  IPL_NAME_TO_SHORT,
  SHORT_TO_TEAM_ID,
  normalizeText,
  formatApiDate,
} from "../../services/cricketUi";
import { useMatchStore } from "../../../contexts/MatchContext";
import {
  CurrentPlayersCard,
  KeyStatsRow,
  LastSixBallsStrip,
  LiveNeedRow,
  MatchHeaderCard,
  ProbablePlayingXI,
} from "../ui/cricket-match-ui";
import { IPL_TEAM_PROFILES } from "../../data/ipl2026";

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

const PRIVATE_ROOM_STORAGE_KEY = "sportsx-private-lounges-v1";

const buildRoomCode = (matchId: string, suffix: string) => {
  const base = (matchId || "MATCH")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 5) || "MATCH";
  return `${base}${suffix}`.toUpperCase().slice(0, 8);
};

const readPrivateRooms = () => {
  try {
    const raw = localStorage.getItem(PRIVATE_ROOM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Room[]) : [];
  } catch {
    return [];
  }
};

const writePrivateRooms = (rooms: Room[]) => {
  localStorage.setItem(PRIVATE_ROOM_STORAGE_KEY, JSON.stringify(rooms));
};

/* ─── Helper: parse match info from ID ─── */
const parseMatchId = (matchId: string) => {
  const raw = String(matchId || "").toLowerCase();
  const parts = raw.split("-");
  
  // Try to find two known team shorts in the parts
  const teams: string[] = [];
  for (const part of parts) {
    const upper = part.toUpperCase();
    if (SHORT_TO_TEAM_ID[upper]) {
      teams.push(upper);
    }
  }

  if (teams.length >= 2) {
    return { team1: teams[0], team2: teams[1] };
  }

  // Fallback to -vs- splitting
  const vsParts = raw.split("-vs-");
  if (vsParts.length === 2) {
    return { team1: vsParts[0].toUpperCase(), team2: vsParts[1].toUpperCase() };
  }

  return { team1: "TEAM A", team2: "TEAM B" };
};

export function MatchLounge() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { adminMatches, liveSnapshotsByMatchId, setUpcomingLiveUrl } = useMatchStore();
  const [liveUrlInput, setLiveUrlInput] = useState("");
  const adminMatch = adminMatches.find((m) => m.id === matchId);
  const isMatchAdmin = Boolean(adminMatch);
  const [tab, setTab] = useState<"public" | "private">("public");
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [matchPayload, setMatchPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [localMatchInfo, setLocalMatchInfo] = useState<{ team1: string; team2: string } | null>(null);
  const [privateRooms, setPrivateRooms] = useState<Room[]>([]);

  const match = matchPayload?.match || null;
  const parsedTeams = parseMatchId(matchId || "");
  const team1 = String(
    match?.team1 ||
      match?.teamA ||
      localMatchInfo?.team1 ||
      adminMatch?.matchTitle?.split(/\s+vs\s+/i)[0] ||
      (parsedTeams.team1 === "TEAM A" ? (loading ? "Loading..." : `Match ${matchId}`) : parsedTeams.team1)
  ).trim();
  const team2 = String(
    match?.team2 ||
      match?.teamB ||
      localMatchInfo?.team2 ||
      adminMatch?.matchTitle?.split(/\s+vs\s+/i)[1] ||
      (parsedTeams.team2 === "TEAM B" ? (loading ? "Loading..." : "") : parsedTeams.team2)
  ).trim();

  const getSquad = (teamName: string) => {
    if (!teamName || teamName === "TEAM A" || teamName === "TEAM B" || teamName.startsWith("Match ")) return [];
    const normalized = normalizeText(teamName);
    const short = IPL_NAME_TO_SHORT[normalized] || teamName;
    const teamId = SHORT_TO_TEAM_ID[short] || normalized;
    return IPL_TEAM_PROFILES[teamId]?.fullSquad || [];
  };

  const squad1 = getSquad(team1);
  const squad2 = getSquad(team2);

  const matchName = `${team1} vs ${team2}`;
  const publicRooms: Room[] = [
    {
      id: `public-${matchId || "match"}`,
      code: buildRoomCode(matchId || "match", "L"),
      name: `${matchName} Match Central`,
      host: "SportsX",
      members: 1,
      maxMembers: 10,
      type: "public",
      match: matchName,
      speaking: 0,
    },
  ];
  const allRooms = [...publicRooms, ...privateRooms];

  const score1 = parseRunsAndOvers(match?.team1Score);
  const score2 = parseRunsAndOvers(match?.team2Score);
  const livePayload = { match, scoreboard: matchPayload?.scoreboard || null };
  const liveStats = matchPayload?.scoreboard?.liveStats || {};
  const currentBatters = getCurrentBatters(livePayload);
  const currentBowler = getCurrentBowler(livePayload);
  const needSummary = getNeedSummary(liveStats);
  const lastSixBalls = getLastSixBalls(livePayload);
  const summaryStats = getLiveSummaryStats(livePayload);

  useEffect(() => {
    let active = true;

    const loadMatch = async () => {
      try {
        if (!matchId) return;
        if (!matchPayload) setLoading(true);

        // Try to find in admin matches or local info first
        const adminMatch = adminMatches.find((m) => m.id === matchId);
        const isAdminLive = Boolean(adminMatch && adminMatch.type === "live" && adminMatch.sourceUrl);
        const adminSnapshot = isAdminLive ? liveSnapshotsByMatchId[matchId] : null;

        if (active && isAdminLive && adminSnapshot?.match) {
          setMatchPayload({ match: adminSnapshot.match, scoreboard: adminSnapshot.scoreboard || null });
          setLoading(false);
          return;
        }

        // Fetch match details
        const detail: any = isAdminLive
          ? await cricketApi.getMatchDetailsByUrl(String(adminMatch?.sourceUrl || ""), true)
          : await cricketApi.getMatchDetails(matchId, true);

        if (active && detail?.match) {
          setMatchPayload({ match: detail.match, scoreboard: detail.scoreboard || null });
          setLoading(false);
          return;
        }

        // If details are empty/not found, try to find in the general match list
        const iplMatches = await cricketApi.getIplScrapedMatches();
        const found = (iplMatches?.matches || []).find((m: any) => String(m.id) === String(matchId));
        if (active && found) {
          setLocalMatchInfo({ team1: found.team1 || found.teamA, team2: found.team2 || found.teamB });
        }
      } catch {
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMatch();

    return () => {
      active = false;
    };
  }, [adminMatches, liveSnapshotsByMatchId, matchId]);

  useEffect(() => {
    if (!matchId) {
      setPrivateRooms([]);
      return;
    }

    const stored = readPrivateRooms().filter((room) => room.match === matchName);
    setPrivateRooms(stored);
  }, [matchId, matchName]);

  const handleSearch = () => {
    const code = searchCode.trim().toUpperCase();
    const found = allRooms.find((r) => r.code === code);
    if (found) { setSearchResult(found); setNotFound(false); }
    else { setSearchResult(null); setNotFound(true); }
  };

  const handleCreateRoom = () => {
    const code = `P${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const room: Room = {
      id: `private-${code}`,
      code,
      name: String(newRoomName || `${matchName} Private Lounge`).trim(),
      host: "You",
      members: 1,
      maxMembers: 10,
      type: "private",
      match: matchName,
      speaking: 0,
    };
    const nextRooms = [...privateRooms.filter((item) => item.code !== code), room];
    const otherRooms = readPrivateRooms().filter((item) => item.match !== matchName);
    setPrivateRooms(nextRooms);
    writePrivateRooms([...otherRooms, ...nextRooms]);
    setGeneratedCode(code);
    setNewRoomName("");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const joinRoom = (room: Room) => {
    navigate(`/lounge/${matchId}/room/${room.id}`);
  };

  const matchDateText = useMemo(() => {
    try {
      return formatApiDate(match?.date);
    } catch {
      return DASH;
    }
  }, [match?.date]);

  const matchDateTime = useMemo(() => {
    return [matchDateText, match?.startTime]
      .filter(val => val && val !== DASH && !String(val).includes("302-550"))
      .join(" · ") || DASH;
  }, [matchDateText, match?.startTime]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <BackButton to="/dashboard" label="Dashboard" />
          <Breadcrumbs items={[{ label: "IPL 2026", path: "/dashboard" }, { label: `${team1} vs ${team2}` }, { label: "Match Lounge" }]} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 space-y-5">
          <MatchHeaderCard
            series={match?.series || "Indian Premier League 2026"}
            status={match?.status || "Live"}
            venue={match?.venue || DASH}
            dateTime={matchDateTime}
            team1={team1}
            team2={team2}
            team1Score={{ runsText: score1.runsText, oversText: score1.oversText || String(match?.team1Overs || "").trim() }}
            team2Score={{ runsText: score2.runsText, oversText: score2.oversText || String(match?.team2Overs || "").trim() }}
            result={match?.result}
            subtitle={match?.score || ""}
            isLive={match?.status?.toLowerCase() === "live"}
            loading={loading}
            actions={
              isMatchAdmin && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Live match URL..."
                    className="h-9 w-64 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-sky-500/50 focus:outline-none"
                    value={liveUrlInput}
                    onChange={(e) => setLiveUrlInput(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (liveUrlInput.trim()) {
                        setUpcomingLiveUrl(matchId!, liveUrlInput.trim());
                        setLiveUrlInput("");
                      }
                    }}
                    className="flex h-9 items-center gap-2 rounded-lg bg-sky-500 px-4 text-xs font-bold text-white hover:bg-sky-600"
                  >
                    <Plus size={14} />
                    Update Live Link
                  </button>
                </div>
              )
            }
          />
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
            totalRuns={score1.runsText}
            totalBalls={String(Math.floor(Number(score1.oversText) * 6) + (Number(score1.oversText) % 1 * 10 || 0))}
          />
          {lastSixBalls.length > 0 && (
            <div className="rounded-2xl border border-white/7 bg-white/[0.03] px-4 py-3">
              <LastSixBallsStrip balls={lastSixBalls} />
            </div>
          )}
          {currentBatters.length > 0 || currentBowler ? (
            <CurrentPlayersCard batters={currentBatters} bowler={currentBowler} loading={loading} />
          ) : (
            <div className="space-y-6">
              {!loading && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-lg font-bold text-white">Match yet to begin</p>
                  <p className="mt-1 text-sm text-white/40">Real-time scorecard will appear here once the match starts.</p>
                </div>
              )}
              {(squad1.length > 0 || squad2.length > 0 || loading) && (
                <ProbablePlayingXI team1={team1} team2={team2} squad1={squad1} squad2={squad2} loading={loading} />
              )}
            </div>
          )}
        </motion.div>

        {/* Lounge Content */}
        <div className="flex flex-col lg:flex-row gap-8 mt-12">
          {/* Main Lounge Area */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setTab("public")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${tab === "public" ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
                >
                  Public Lounges
                </button>
                <button 
                  onClick={() => setTab("private")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${tab === "private" ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
                >
                  Private Lounges
                </button>
              </div>
              {tab === "private" && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 text-white text-sm font-black hover:bg-white/10 border border-white/5 transition-all"
                >
                  <Plus size={16} />
                  Create Lounge
                </button>
              )}
            </div>

            {tab === "private" && (
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="text"
                  placeholder="Enter lounge code to search..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-32 text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/50 transition-all"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button 
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-sky-500 text-white px-6 py-2 rounded-xl text-xs font-black hover:bg-sky-600 transition-all"
                >
                  Search
                </button>
              </div>
            )}

            <div className="grid gap-4">
              {tab === "public" ? (
                publicRooms.map((room) => (
                  <GlassCard key={room.id} className="p-6 hover:bg-white/[0.04] transition-all cursor-pointer group" onClick={() => joinRoom(room)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                          <Globe size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">{room.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <Users size={12} /> {room.members}/{room.maxMembers}
                            </span>
                            <span className="text-xs text-sky-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                              <Mic size={12} /> {room.speaking} Speaking
                            </span>
                          </div>
                        </div>
                      </div>
                      <button className="bg-white/5 text-white/60 p-3 rounded-xl hover:bg-sky-500 hover:text-white transition-all">
                        <LogIn size={20} />
                      </button>
                    </div>
                  </GlassCard>
                ))
              ) : searchResult ? (
                <GlassCard className="p-6 border-sky-500/30 bg-sky-500/5" onClick={() => joinRoom(searchResult)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center text-white">
                        <Lock size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">{searchResult.name}</h3>
                        <p className="text-xs text-white/40 mt-1 font-bold uppercase tracking-widest">Host: {searchResult.host}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-sky-500/20 text-sky-400 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest">FOUND</span>
                      <button className="bg-sky-500 text-white p-3 rounded-xl">
                        <LogIn size={20} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ) : notFound ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/10">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-white/20">
                    <Search size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white">Lounge Not Found</h3>
                  <p className="text-white/40 mt-2">Check the code and try again</p>
                </div>
              ) : privateRooms.length > 0 ? (
                privateRooms.map((room) => (
                  <GlassCard key={room.id} className="p-6 hover:bg-white/[0.04] transition-all cursor-pointer group" onClick={() => joinRoom(room)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                          <Lock size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">{room.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <Hash size={12} /> {room.code}
                            </span>
                            <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <Users size={12} /> {room.members} Active
                            </span>
                          </div>
                        </div>
                      </div>
                      <button className="bg-white/5 text-white/60 p-3 rounded-xl hover:bg-sky-500 hover:text-white transition-all">
                        <LogIn size={20} />
                      </button>
                    </div>
                  </GlassCard>
                ))
              ) : (
                <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/10">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-white/20">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white">No Private Lounges</h3>
                  <p className="text-white/40 mt-2">Create one to invite your friends</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Stats */}
          <div className="w-full lg:w-80 space-y-6">
            <GlassCard className="p-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <div className="w-1.5 h-4 bg-sky-500 rounded-full" />
                Live Discussion
              </h3>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/40 font-black text-xs">
                      U{i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">User {i}</p>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Listening...</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Create Room Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-[#0D1117] border border-white/10 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-sky-500/10 rounded-full blur-[100px]" />
                
                <h2 className="text-2xl font-black text-white mb-2">Create Private Lounge</h2>
                <p className="text-white/40 text-sm mb-8">Invite your friends for a private match experience</p>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block">Lounge Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Weekend Warriors"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/20 focus:outline-none focus:border-sky-500/50 transition-all"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                  </div>

                  {generatedCode ? (
                    <div className="p-6 bg-sky-500/5 border border-sky-500/20 rounded-2xl text-center">
                      <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-2">Lounge Code</p>
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-4xl font-black text-white tracking-tighter">{generatedCode}</span>
                        <button onClick={handleCopyCode} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all">
                          {codeCopied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={handleCreateRoom}
                      className="w-full bg-sky-500 text-white py-5 rounded-2xl font-black text-lg hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
                    >
                      Generate Code
                    </button>
                  )}

                  {generatedCode && (
                    <button 
                      onClick={() => setShowCreateModal(false)}
                      className="w-full bg-white/5 text-white py-5 rounded-2xl font-black text-lg hover:bg-white/10 transition-all"
                    >
                      Done
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
