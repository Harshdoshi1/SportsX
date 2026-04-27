import { motion } from "motion/react";
import { Search, Bell, User, Zap, Users, UserRound, ArrowUpRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { NotificationPanel } from "./NotificationPanel";
import { cricketApi } from "../../services/cricketApi";
import { deriveTeamShort, slugify } from "../../services/cricketUi";
import { TeamLogo } from "./TeamLogo";

type SearchTeam = {
  id: string | number;
  name: string;
  shortName?: string;
};

type SearchPlayer = {
  id: string | number;
  name: string;
  team?: string;
  role?: string;
  image?: string;
};

export function Navbar() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTeams, setSearchTeams] = useState<SearchTeam[]>([]);
  const [searchPlayers, setSearchPlayers] = useState<SearchPlayer[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRootRef = useRef<HTMLDivElement | null>(null);

  const query = searchValue.trim();
  const queryLower = query.toLowerCase();

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRootRef.current) {
        return;
      }
      if (!searchRootRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (query.length < 1) {
      setSearchLoading(false);
      setSearchError(null);
      setSearchTeams([]);
      setSearchPlayers([]);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);

        const response = (await cricketApi.search(query, "all", 1, 60)) as any;
        if (!active) {
          return;
        }

        const teamsRaw = Array.isArray(response?.teams) ? response.teams : [];
        const playersRaw = Array.isArray(response?.players) ? response.players : [];

        const teams = teamsRaw.filter((team) => {
          const name = String(team?.name || "").toLowerCase();
          const short = String(team?.shortName || "").toLowerCase();
          return name.startsWith(queryLower) || short.startsWith(queryLower);
        });

        const players = playersRaw.filter((player) => {
          const name = String(player?.name || "").toLowerCase();
          return name.startsWith(queryLower);
        });

        setSearchTeams(teams.slice(0, 6));
        setSearchPlayers(players.slice(0, 12));
      } catch (error: any) {
        if (!active) {
          return;
        }
        setSearchError(error?.message || "Search failed");
      } finally {
        if (active) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, queryLower]);

  const hasResults = searchTeams.length > 0 || searchPlayers.length > 0;
  const showSearchPanel = searchOpen && query.length >= 1;

  const quickHint = useMemo(() => {
    if (query.length < 1) {
      return "Type player or team name";
    }
    if (searchLoading) {
      return "Searching teams and players...";
    }
    if (searchError) {
      return searchError;
    }
    if (!hasResults) {
      return "No matching team or player found";
    }
    return `${searchTeams.length + searchPlayers.length} results`;
  }, [query.length, searchLoading, searchError, hasResults, searchTeams.length, searchPlayers.length]);

  const openTeam = (team: SearchTeam) => {
    const short = deriveTeamShort(team.shortName || team.name || String(team.id));
    setSearchOpen(false);
    setSearchValue("");
    navigate(`/sport/cricket/league/ipl/team/${short}`);
  };

  const openPlayer = (player: SearchPlayer) => {
    const teamShort = deriveTeamShort(player.team || "");
    const playerId = String(player.id || slugify(player.name || "player"));
    setSearchOpen(false);
    setSearchValue("");

    if (teamShort === "TBD") {
      navigate(`/player/${encodeURIComponent(playerId)}`);
      return;
    }

    navigate(`/sport/cricket/league/ipl/team/${teamShort}/player/${encodeURIComponent(playerId)}`);
  };

  const highlightPrefix = (text: string) => {
    if (!queryLower || !text.toLowerCase().startsWith(queryLower)) {
      return <>{text}</>;
    }

    const head = text.slice(0, query.length);
    const tail = text.slice(query.length);

    return (
      <>
        <span style={{ color: "#7ad6ff" }}>{head}</span>
        {tail}
      </>
    );
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-50"
        style={{
          background: "rgba(2, 4, 12, 0.94)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(122,140,220,0.18)",
          boxShadow: "0 10px 34px rgba(0,0,0,0.7)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <motion.button
              onClick={() => navigate("/dashboard")}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)" }}
              >
                <Zap size={16} className="text-white" />
              </div>
              <span
                className="text-xl font-bold tracking-tight"
                style={{ background: "linear-gradient(135deg, #3BD4E7, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                SportsX
              </span>
            </motion.button>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-1 ml-2">
              {[
                { label: "Home", path: "/dashboard" },
                { label: "Analytics", path: "/analytics" },
                { label: "Profile", path: "/profile" },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/8 transition-all"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div ref={searchRootRef} className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={(e) => {
                    setSearchOpen(true);
                    e.target.style.borderColor = "rgba(59,212,231,0.5)";
                    e.target.style.boxShadow = "0 0 20px rgba(59,212,231,0.1)";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search teams, players, matches..."
                  className="w-full pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 outline-none rounded-lg transition-all"
                  style={{
                    background: "rgba(8,12,28,0.95)",
                    border: "1px solid rgba(126,146,224,0.22)",
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.08)";
                    e.target.style.boxShadow = "none";
                  }}
                />

                {showSearchPanel && (
                  <div
                    className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden"
                    style={{
                      background: "linear-gradient(180deg, rgba(9,14,32,0.98), rgba(6,10,24,0.98))",
                      border: "1px solid rgba(122,140,220,0.28)",
                      boxShadow: "0 24px 40px rgba(2,8,24,0.6)",
                    }}
                  >
                    <div className="px-4 py-2.5 text-xs text-white/45 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span>{quickHint}</span>
                      <span className="flex items-center gap-1 text-[#7ad6ff]">
                        <Sparkles size={12} /> Prefix Match
                      </span>
                    </div>

                    {!searchLoading && !searchError && hasResults && (
                      <div className="max-h-[420px] overflow-y-auto">
                        {searchTeams.length > 0 && (
                          <div className="p-2">
                            <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wider text-white/35 flex items-center gap-1.5">
                              <Users size={12} /> Teams
                            </div>
                            <div className="space-y-1">
                              {searchTeams.map((team) => {
                                const short = deriveTeamShort(team.shortName || team.name || String(team.id));
                                return (
                                  <button
                                    key={`team-${team.id}`}
                                    onClick={() => openTeam(team)}
                                    className="w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-all hover:bg-white/8"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <TeamLogo short={short} size={30} />
                                      <div className="min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">{highlightPrefix(team.name)}</p>
                                        <p className="text-white/35 text-xs">{short}</p>
                                      </div>
                                    </div>
                                    <ArrowUpRight size={14} className="text-white/30" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {searchPlayers.length > 0 && (
                          <div className="p-2" style={{ borderTop: searchTeams.length ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                            <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wider text-white/35 flex items-center gap-1.5">
                              <UserRound size={12} /> Players
                            </div>
                            <div className="space-y-1">
                              {searchPlayers.map((player) => {
                                const teamShort = deriveTeamShort(player.team || "");
                                return (
                                  <button
                                    key={`player-${player.id}-${player.name}`}
                                    onClick={() => openPlayer(player)}
                                    className="w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-all hover:bg-white/8"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {player.image ? (
                                        <img
                                          src={player.image}
                                          alt={player.name}
                                          className="w-8 h-8 rounded-full object-cover"
                                          style={{ border: "1px solid rgba(255,255,255,0.2)" }}
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white/70" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}>
                                          {(player.name || "P").slice(0, 1).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">{highlightPrefix(player.name)}</p>
                                        <p className="text-white/35 text-xs truncate">{player.team || "IPL"}{player.role ? ` • ${player.role}` : ""}{teamShort && teamShort !== "TBD" ? ` • ${teamShort}` : ""}</p>
                                      </div>
                                    </div>
                                    <ArrowUpRight size={14} className="text-white/30" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-2 ml-auto">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-white/60 hover:text-white transition-all"
                style={{ background: "rgba(8,12,28,0.95)", border: "1px solid rgba(126,146,224,0.22)" }}
              >
                <Bell size={18} />
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white font-bold"
                  style={{ background: "linear-gradient(135deg, #FF4D8D, #FF4747)" }}
                >
                  6
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate("/profile")}
                className="p-2 rounded-lg text-white"
                style={{
                  background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)",
                  boxShadow: "0 0 15px rgba(59,212,231,0.3)",
                }}
              >
                <User size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
