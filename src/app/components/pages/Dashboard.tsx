import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { useNavigate } from "react-router";
import { TrendingUp, Users, Activity, Trophy, ChevronRight, Star, Flame, Clock, MapPin, Zap, Timer } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { TeamLogo } from "../ui/TeamLogo";
import { cricketApi } from "../../services/cricketApi";
import { getTeamLogoProps, isLiveStatus, isUpcomingStatus, safeArray, deriveTeamShort } from "../../services/cricketUi";
import { IPL_STANDINGS } from "../../data/ipl2026";
import { getIplTeamByShort, type IplTeamId } from "../../data/iplTeams";
import { useMatchStore } from "../../../contexts/MatchContext";

const CRICKET_ICON_IMAGE =
  "https://img.freepik.com/free-vector/red-ball-hitting-wicket-stumps-with-bat-black-abstract-splash-background-cricket-fever-concept_1302-5492.jpg?semt=ais_hybrid&w=740&q=80";

const sports = [
  {
    id: "cricket",
    name: "Cricket",
    icon: "🏏",
    iconImage: CRICKET_ICON_IMAGE,
    color: "#00E676",
    shadow: "rgba(0,230,118,0.3)",
    desc: "IPL · World Cup · Big Bash",
  },
  { id: "football", name: "Football", icon: "⚽", color: "#3BD4E7", shadow: "rgba(59,212,231,0.3)", desc: "Premier League · Champions League" },
  { id: "f1", name: "Formula 1", icon: "🏎️", color: "#FF9100", shadow: "rgba(255,145,0,0.3)", desc: "F1 2026 Championship" },
  { id: "basketball", name: "Basketball", icon: "🏀", color: "#FF4D8D", shadow: "rgba(255,77,141,0.3)", desc: "NBA · EuroLeague" },
];

/* ─── Tournament Favorites ─── */
type TournamentFilter = {
  id: string;
  name: string;
  short: string;
  logo?: string;
  color: string;
};

const cricketTournaments: TournamentFilter[] = [
  { id: "ipl", name: "Indian Premier League", short: "IPL", logo: "/assets/teams/IPL_logo.webp", color: "#3BD4E7" },
  { id: "icc", name: "ICC World Cup", short: "ICC", color: "#FF9100" },
  { id: "hundred", name: "The Hundred", short: "100s", color: "#7C4DFF" },
  { id: "bbl", name: "Big Bash League", short: "BBL", color: "#FF4D8D" },
];

type UiMatch = {
  id: string;
  league: string;
  tournamentId: string;
  teamA: string;
  teamB: string;
  teamADisplay: string;
  teamBDisplay: string;
  score: string;
  teamAScore?: string;
  teamAOvers?: string;
  teamBScore?: string;
  teamBOvers?: string;
  status: string;
  date: string;
  startTime: string;
  venue: string;
  matchNo: string;
};

const parseRunsAndOvers = (value: unknown): { runsText: string; oversText: string } => {
  const raw = String(value || "").trim();
  if (!raw) return { runsText: "", oversText: "" };
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
    return { runsText: String(match[1] || "").trim(), oversText: String(match[2] || "").trim() };
  }
  return { runsText: raw, oversText: "" };
};

type TrendingNewsItem = {
  title: string;
  summary: string | null;
  publishedAt: string;
  tag: string;
};

const formatMatchDateSafe = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return "TBD";
  }
  if (/[A-Za-z]{3}/.test(raw) && !/\d{4}/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return raw;
};

const formatMatchStartTimeSafe = (explicitValue: unknown, fallbackIso: unknown) => {
  const explicit = String(explicitValue || "").trim();
  if (explicit) {
    return explicit;
  }

  const rawIso = String(fallbackIso || "").trim();
  if (!rawIso) {
    return "";
  }

  const parsed = new Date(rawIso);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return `${parsed.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} IST`;
};

const toUiMatch = (match: any): UiMatch => ({
  id: String(match?.id || `${match?.team1 || "team1"}-${match?.team2 || "team2"}-${match?.date || "date"}`),
  league: match?.series || "Indian Premier League 2026",
  tournamentId: String(match?.tournamentId || "ipl").toLowerCase(),
  teamA: match?.team1 || match?.teamA || "Team A",
  teamB: match?.team2 || match?.teamB || "Team B",
  teamADisplay: match?.team1Name || match?.team1Display || match?.team1 || "Team A",
  teamBDisplay: match?.team2Name || match?.team2Display || match?.team2 || "Team B",
  score:
    match?.score ||
    (match?.team1Score || match?.team2Score
      ? `${match?.team1Score || "-"} · ${match?.team2Score || "-"}`
      : "Score unavailable"),
  teamAScore: parseRunsAndOvers(match?.team1Score).runsText || undefined,
  teamAOvers: (parseRunsAndOvers(match?.team1Score).oversText || String(match?.team1Overs || "").trim()) || undefined,
  teamBScore: parseRunsAndOvers(match?.team2Score).runsText || undefined,
  teamBOvers: (parseRunsAndOvers(match?.team2Score).oversText || String(match?.team2Overs || "").trim()) || undefined,
  status: match?.status || "Status unavailable",
  date: formatMatchDateSafe(match?.date || match?.starts_at || match?.startsAt),
  startTime: formatMatchStartTimeSafe(match?.startTime, match?.starts_at || match?.startsAt),
  venue: match?.venue || "Venue TBA",
  matchNo: String(match?.matchNo || "").trim(),
});

const guessTournamentIdFromCategory = (value: string) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("ipl")) return "ipl";
  if (normalized.includes("icc")) return "icc";
  return "admin";
};

const buildMatchIdentity = (match: UiMatch) => {
  const teamA = String(match?.teamA || "").toLowerCase().trim();
  const teamB = String(match?.teamB || "").toLowerCase().trim();
  const date = String(match?.date || "").toLowerCase().trim();
  const tournament = String(match?.tournamentId || "").toLowerCase().trim();
  return `${tournament}:${teamA}:${teamB}:${date}`;
};

const dedupeMatches = (matches: UiMatch[]) => {
  const seen = new Set<string>();
  const result: UiMatch[] = [];

  for (const match of matches) {
    const key = buildMatchIdentity(match);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(match);
  }

  return result;
};

/* ─── Countdown Timer Hook ─── */
function useCountdown(targetTimeString: string, dateString: string) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: true });

  useEffect(() => {
    const parseTargetDate = () => {
      // Try to parse "7:30 PM IST" style time with date
      const timeMatch = targetTimeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) return null;

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toUpperCase();

      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      // Get today's date in IST
      const now = new Date();
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);

      // If date is provided and is in the future, use it
      if (dateString) {
        const dateParts = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateParts) {
          target.setFullYear(parseInt(dateParts[3]), parseInt(dateParts[2]) - 1, parseInt(dateParts[1]));
        }
      }

      return target;
    };

    const target = parseTargetDate();
    if (!target) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimeString, dateString]);

  return timeLeft;
}

/* ─── Countdown Display Component ─── */
function CountdownTimer({ startTime, date }: { startTime: string; date: string }) {
  const { hours, minutes, seconds, isExpired } = useCountdown(startTime, date);

  if (isExpired || !startTime) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Timer size={12} className="text-[#FF4D8D]" />
        <span className="text-[#FF4D8D] font-semibold">{startTime ? "Match Started" : "Time TBA"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Timer size={14} className="text-[#FF9100]" />
      <div className="flex items-center gap-1">
        {[
          { value: hours, label: "h" },
          { value: minutes, label: "m" },
          { value: seconds, label: "s" },
        ].map(({ value, label }, i) => (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-white/30 font-bold mx-0.5"
              >
                :
              </motion.span>
            )}
            <div
              className="px-1.5 py-0.5 rounded-md text-center min-w-[28px]"
              style={{ background: "rgba(255,145,0,0.12)", border: "1px solid rgba(255,145,0,0.25)" }}
            >
              <span className="text-sm font-black font-mono" style={{ color: "#ffc57a" }}>
                {String(value).padStart(2, "0")}
              </span>
              <span className="text-[8px] text-white/30 ml-0.5">{label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Premium Match Card ─── */
function PremiumMatchCard({ match, index }: { match: UiMatch; index: number }) {
  const navigate = useNavigate();
  const teamA = getTeamLogoProps(match.teamA);
  const teamB = getTeamLogoProps(match.teamB);

  // Win Probability from standings
  const team1Standing = IPL_STANDINGS.find(s => s.short === match.teamA || s.short === deriveTeamShort(match.teamA));
  const team2Standing = IPL_STANDINGS.find(s => s.short === match.teamB || s.short === deriveTeamShort(match.teamB));
  const team1WinRate = team1Standing ? (team1Standing.won / Math.max(team1Standing.played, 1)) * 100 : 50;
  const team2WinRate = team2Standing ? (team2Standing.won / Math.max(team2Standing.played, 1)) * 100 : 50;
  const totalRate = team1WinRate + team2WinRate || 1;
  const team1Prob = Math.round((team1WinRate / totalRate) * 100);
  const team2Prob = 100 - team1Prob;

  const matchRouteId = match.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
    >
      <GlassCard className="p-0 overflow-hidden" hover>
        {/* Top gradient accent */}
        <div className="h-1" style={{ background: "linear-gradient(90deg, #FF4D8D, #7C4DFF, #3BD4E7)" }} />

        <div className="p-5 md:p-6">
          {/* League Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
                <img src="/assets/teams/IPL_logo.webp" alt="IPL" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <span className="text-white/70 text-xs font-semibold">Indian Premier League 2026</span>
                {match.matchNo && <span className="text-white/30 text-xs ml-2">• {match.matchNo}</span>}
              </div>
            </div>
            <CountdownTimer startTime={match.startTime} date={match.date} />
          </div>

          {/* Teams */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-5">
            {/* Team A */}
            <div className="flex items-center gap-3">
              <TeamLogo teamId={teamA.teamId} short={teamA.short} size={48} />
              <div>
                <p className="text-white font-black text-base md:text-lg">{match.teamA}</p>
                <p className="text-white/35 text-xs truncate">{match.teamADisplay}</p>
              </div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-white/40 font-black text-xs">VS</span>
              </div>
            </div>

            {/* Team B */}
            <div className="flex items-center gap-3 justify-end">
              <div className="text-right">
                <p className="text-white font-black text-base md:text-lg">{match.teamB}</p>
                <p className="text-white/35 text-xs truncate">{match.teamBDisplay}</p>
              </div>
              <TeamLogo teamId={teamB.teamId} short={teamB.short} size={48} />
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-1.5 text-xs text-white/35 mb-4">
            <MapPin size={11} />
            <span>{match.venue}</span>
            <span className="text-white/20 mx-1">·</span>
            <span className="text-[#3BD4E7]">{match.date}{match.startTime ? `, ${match.startTime}` : ""}</span>
          </div>

          {/* Win Probability */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold" style={{ color: "#FF4D8D" }}>{match.teamA} {team1Prob}%</span>
              <span className="text-white/25 text-[10px] uppercase tracking-wider">Win Probability</span>
              <span className="font-bold" style={{ color: "#3BD4E7" }}>{match.teamB} {team2Prob}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                initial={{ width: "50%" }}
                animate={{ width: `${team1Prob}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #FF4D8D, #7C4DFF)" }}
              />
            </div>
          </div>

          {/* Join Lounge Button */}
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/lounge/${matchRouteId}`)}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm text-white"
            style={{
              background: "linear-gradient(135deg, #7C4DFF, #FF4D8D)",
              boxShadow: "0 4px 20px rgba(124,77,255,0.3), 0 0 40px rgba(255,77,141,0.15)",
            }}
          >
            <Users size={16} />
            Join Lounge
            <ChevronRight size={14} />
          </motion.button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function PremiumLiveMatchCard({ match, index }: { match: UiMatch; index: number }) {
  const navigate = useNavigate();
  const teamA = getTeamLogoProps(match.teamA);
  const teamB = getTeamLogoProps(match.teamB);
  const matchRouteId = match.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.08 }}
    >
      <GlassCard className="p-0 overflow-hidden" hover onClick={() => navigate(`/match/${matchRouteId}`)}>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #FF4D8D, #7C4DFF, #3BD4E7)" }} />
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-white/70 text-xs font-semibold">{match.league}</span>
              {match.matchNo && <span className="text-white/30 text-xs ml-2">• {match.matchNo}</span>}
            </div>
            <span className="text-xs font-bold" style={{ color: "#FF4D8D" }}>{String(match.status || "LIVE").toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-4">
            <div className="flex items-center gap-3">
              <TeamLogo teamId={teamA.teamId} short={teamA.short} size={46} />
              <div>
                <p className="text-white font-black text-base md:text-lg">{match.teamA}</p>
                <p className="text-white/35 text-xs truncate">{match.teamADisplay}</p>
                {match.teamAScore && (
                  <p className="text-[#3BD4E7] text-xs font-mono font-bold mt-1">
                    {match.teamAScore}
                    {match.teamAOvers && <span className="text-white/30 font-normal"> ({match.teamAOvers} ov)</span>}
                  </p>
                )}
              </div>
            </div>

            <div className="text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-white/40 font-black text-xs">VS</span>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <div className="text-right">
                <p className="text-white font-black text-base md:text-lg">{match.teamB}</p>
                <p className="text-white/35 text-xs truncate">{match.teamBDisplay}</p>
                {match.teamBScore && (
                  <p className="text-[#3BD4E7] text-xs font-mono font-bold mt-1">
                    {match.teamBScore}
                    {match.teamBOvers && <span className="text-white/30 font-normal"> ({match.teamBOvers} ov)</span>}
                  </p>
                )}
              </div>
              <TeamLogo teamId={teamB.teamId} short={teamB.short} size={46} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-white/60 text-sm font-semibold truncate">{match.score}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/lounge/${matchRouteId}`);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, rgba(124,77,255,0.35), rgba(255,77,141,0.35))",
                border: "1px solid rgba(124,77,255,0.55)",
                color: "#efe8ff",
              }}
            >
              <Users size={14} />
              Join Lounge
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { adminMatches, liveSnapshotsByMatchId } = useMatchStore();
  const [liveMatches, setLiveMatches] = useState<UiMatch[]>([]);
  const [iccLiveMatches, setIccLiveMatches] = useState<UiMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UiMatch[]>([]);
  const [iplMatches, setIplMatches] = useState<UiMatch[]>([]);
  const [teamsCount, setTeamsCount] = useState(0);
  const [trendingNews, setTrendingNews] = useState<TrendingNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  // Tournament favorites
  const [favTournaments, setFavTournaments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sportsx-fav-tournaments");
      return saved ? JSON.parse(saved) : ["ipl"];
    } catch {
      return ["ipl"];
    }
  });

  const toggleFavTournament = useCallback((id: string) => {
    setFavTournaments((prev) => {
      const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id];
      const result = next.length === 0 ? [id] : next;
      localStorage.setItem("sportsx-fav-tournaments", JSON.stringify(result));
      return result;
    });
  }, []);

  const adminLiveMatches = useMemo(() => {
    const live = adminMatches.filter((m) => m.type === "live");
    const mapped = live
      .map((m) => {
        const snapshot = liveSnapshotsByMatchId[m.id];
        const matchPayload = snapshot?.match;
        if (!matchPayload) {
          return null;
        }
        const ui = toUiMatch({
          ...matchPayload,
          id: m.id,
          tournamentId: matchPayload?.tournamentId || guessTournamentIdFromCategory(m.category),
          series: matchPayload?.series || m.sectionLabel || m.category,
        });
        return ui;
      })
      .filter(Boolean) as UiMatch[];

    return dedupeMatches(mapped);
  }, [adminMatches, liveSnapshotsByMatchId]);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [iplScrapedRes, iplLiveRes, teamsRes] = await Promise.all([
          cricketApi.getIplScrapedMatches(),
          cricketApi.getIplLiveMatches(1, 20, false),
          cricketApi.getTeams({ page: 1, limit: 1 }),
        ]);

        if (!active) {
          return;
        }

        const iplScraped = safeArray<any>((iplScrapedRes as any).matches).map(toUiMatch);
        const iplFromLiveLinks = safeArray<any>((iplLiveRes as any).matches).map(toUiMatch);
        const ipl = dedupeMatches([...iplFromLiveLinks, ...iplScraped]);
        const live = ipl.filter((match) => isLiveStatus(match.status));
        const upcoming = ipl.filter((match) => isUpcomingStatus(match.status));
        const totalTeams = Number((teamsRes as any)?.pagination?.total ?? 0);

        setLiveMatches(live);
        setIccLiveMatches([]);
        setUpcomingMatches(upcoming);
        setIplMatches(ipl);
        setTeamsCount(totalTeams);
        setTrendingNews([]);
        setLoading(false);

        Promise.all([cricketApi.getIccLiveMatches(), cricketApi.getIplNews()])
          .then(([iccLiveRes, newsRes]) => {
            if (!active) return;
            const iccLive = safeArray<any>((iccLiveRes as any).matches).map(toUiMatch);
            const topTrendingNews = safeArray<any>((newsRes as any)?.news)
              .map((item) => ({
                title: String(item?.title || "Untitled"),
                summary: item?.summary ? String(item.summary) : null,
                publishedAt: String(item?.publishedAt || ""),
                tag: String(item?.tag || "IPL 2026"),
              }))
              .slice(0, 3);

            setIccLiveMatches(iccLive.filter((match) => isLiveStatus(match.status)));
            setTrendingNews(topTrendingNews);
          })
          .catch(() => {
            if (!active) return;
          });
      } catch (fetchError: any) {
        if (!active) {
          return;
        }
        setError(fetchError?.message || "Failed to load live dashboard data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: "IPL Matches", value: String(iplMatches.length), icon: Activity, color: "#FF4D8D", bg: "rgba(255,77,141,0.1)" },
      { label: "Live Matches", value: String(liveMatches.length), icon: Trophy, color: "#3BD4E7", bg: "rgba(59,212,231,0.1)" },
      { label: "Upcoming", value: String(upcomingMatches.length), icon: TrendingUp, color: "#7C4DFF", bg: "rgba(124,77,255,0.1)" },
      { label: "Teams", value: String(teamsCount), icon: Users, color: "#FF9100", bg: "rgba(255,145,0,0.1)" },
    ],
    [iplMatches.length, liveMatches.length, upcomingMatches.length, teamsCount]
  );

  const filteredLivePool = useMemo(() => {
    const includeIpl = favTournaments.includes("ipl");
    const includeIcc = favTournaments.includes("icc");
    const pool: UiMatch[] = [];

    if (includeIpl) {
      pool.push(...adminLiveMatches.filter((match) => isLiveStatus(match.status)));
      pool.push(...liveMatches.filter((match) => isLiveStatus(match.status)));
    }

    if (includeIcc) {
      pool.push(...iccLiveMatches.filter((match) => isLiveStatus(match.status)));
    }

    return pool.sort((a, b) => {
      const aIccRank = a.tournamentId === "icc" ? 0 : 1;
      const bIccRank = b.tournamentId === "icc" ? 0 : 1;
      if (aIccRank !== bIccRank) {
        return aIccRank - bIccRank;
      }
      return String(a.id).localeCompare(String(b.id));
    });
  }, [favTournaments, adminLiveMatches, liveMatches, iccLiveMatches]);

  const liveMatchCards = filteredLivePool.slice(0, 3);
  const upcomingMatchCards = upcomingMatches.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-10">

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12"
          style={{
            background: "linear-gradient(135deg, rgba(59,212,231,0.12) 0%, rgba(124,77,255,0.12) 50%, rgba(255,77,141,0.08) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1750716413341-fd5d93296a76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwc3RhZGl1bSUyMG5pZ2h0JTIwbGlnaHRzJTIwYWVyaWFsfGVufDF8fHx8MTc3NjQwOTAwMXww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Stadium"
              className="w-full h-full object-cover opacity-10"
            />
          </div>
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-4"
            >
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.3)", color: "#FF4D8D" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D8D]" />
                REAL DATA SNAPSHOT
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,145,0,0.15)", border: "1px solid rgba(255,145,0,0.3)", color: "#FF9100" }}>
                <Flame size={12} />
                {loading ? "SYNCING LIVE DATA" : "LIVE DATA CONNECTED"}
              </div>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
              Your Sports <br />
              <span style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Intelligence Hub
              </span>
            </h1>
            <p className="text-white/50 text-lg max-w-lg">Live scores and match feeds are now powered by your backend web scraping pipeline.</p>
            {error && <p className="text-[#ff8ca8] text-sm mt-3">{error}</p>}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
            >
              <GlassCard className="p-5" hover>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: stat.bg, border: `1px solid ${stat.color}30` }}
                >
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-white/40 text-xs mt-1">{stat.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Sports Selection */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">Select Sport</h2>
            <span className="text-white/30 text-sm">{loading ? "Loading..." : "4 sports available"}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sports.map((sport, i) => (
              <motion.div
                key={sport.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.07 }}
              >
                <GlassCard
                  className="p-6 cursor-pointer text-center"
                  hover
                  onClick={() => navigate(`/sport/${sport.id}`)}
                >
                  {sport.iconImage ? (
                    <div
                      className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-4"
                      style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      <img src={sport.iconImage} alt={`${sport.name} logo`} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="text-5xl mb-4 block">
                      {sport.icon}
                    </div>
                  )}
                  <h3 className="text-white font-bold mb-1">{sport.name}</h3>
                  <p className="text-white/30 text-xs">{sport.desc}</p>
                  <div className="mt-4 flex items-center justify-center gap-1 text-xs font-medium" style={{ color: sport.color }}>
                    <span>Explore</span>
                    <ChevronRight size={12} />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ─── Live Matches + Tournament Favorites ─── */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(255,77,141,0.15)", border: "1px solid rgba(255,77,141,0.3)", color: "#FF4D8D" }}>
              <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#FF4D8D]" />
              LIVE
            </div>
            <h2 className="text-xl font-bold text-white">Live Matches</h2>
          </div>

          {/* ─── Tournament Favorite Chips ─── */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-white/30 text-xs mr-1">Favorites:</span>
            {cricketTournaments.map((t) => {
              const isSelected = favTournaments.includes(t.id);
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleFavTournament(t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={
                    isSelected
                      ? {
                          background: `${t.color}20`,
                          border: `1px solid ${t.color}60`,
                          color: t.color,
                          boxShadow: `0 0 12px ${t.color}30`,
                        }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.35)",
                        }
                  }
                >
                  <Star size={11} fill={isSelected ? t.color : "none"} />
                  {t.logo && (
                    <img src={t.logo} alt={t.short} className="w-4 h-4 object-contain rounded-sm" style={{ background: isSelected ? "#fff" : "transparent" }} />
                  )}
                  {t.short}
                </motion.button>
              );
            })}
          </div>

          {/* Live Match Cards */}
          <div className="space-y-4 mb-8">
            {liveMatchCards.length === 0 && (
              <GlassCard className="p-5">
                <p className="text-white/50 text-sm">No live matches available right now from the API.</p>
              </GlassCard>
            )}

            {liveMatchCards.map((match, i) => (
              <PremiumLiveMatchCard key={match.id} match={match} index={i} />
            ))}
          </div>
        </div>

        {/* ─── Upcoming IPL Matches (Premium Cards) ─── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(124,77,255,0.15)", border: "1px solid rgba(124,77,255,0.3)", color: "#a78bfa" }}>
                <Clock size={11} />
                UPCOMING
              </div>
              <h2 className="text-xl font-bold text-white">Today's Matches</h2>
            </div>
            <span className="text-white/30 text-sm">{upcomingMatchCards.length} fixtures</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcomingMatchCards.length === 0 && (
              <GlassCard className="p-5 md:col-span-2">
                <p className="text-white/50 text-sm">No upcoming fixtures returned by the API.</p>
              </GlassCard>
            )}
            {upcomingMatchCards.map((match, i) => (
              <PremiumMatchCard key={match.id} match={match} index={i} />
            ))}
          </div>
        </div>

        {/* Trending */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">🔥 Trending</h2>
          <GlassCard className="p-5">
            <div className="space-y-4">
              {trendingNews.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: i === 0 ? "rgba(255,145,0,0.15)" : "rgba(255,255,255,0.05)",
                      border: i === 0 ? "1px solid rgba(255,145,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      color: i === 0 ? "#FF9100" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{item.title}</p>
                    <p className="text-white/30 text-xs truncate">{item.summary || `${item.tag}${item.publishedAt ? ` · ${item.publishedAt}` : ""}`}</p>
                  </div>
                  <Star size={14} className="text-white/20 flex-shrink-0" />
                </div>
              ))}
              {trendingNews.length === 0 && (
                <p className="text-white/40 text-sm">No trending IPL news available right now.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
