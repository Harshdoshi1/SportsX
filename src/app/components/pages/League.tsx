import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { Calendar } from "lucide-react";
import { cricketApi } from "../../services/cricketApi";
import { deriveTeamShort, formatApiDate, getTeamLogoProps, isIplTeamName, isUpcomingStatus, safeArray } from "../../services/cricketUi";

type LeagueKey = "ipl" | "f1-2026" | "epl";

type IplTeamRow = {
  teamId: string;
  short: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  pts: number;
  nrr: string;
};

type IplMatchRow = {
  id: string;
  date: string;
  matchup: string;
  score: string;
  result: string;
  venue: string;
  status: string;
};

type IplStatsRow = {
  player: string;
  matches: number | null;
  innings: number | null;
  runs: number | null;
  average: string;
  strikeRate: string;
  fours: number | null;
  sixes: number | null;
};

type IplSquadPlayer = {
  name: string;
  roleGroup: string;
  role: string;
};

type IplNewsItem = {
  title: string;
  summary: string | null;
  publishedAt: string;
  tag: string;
};

const tabs = ["Points Table", "Matches", "Stats", "Squads", "News"];

const genericSnapshots = {
  "f1-2026": {
    sportName: "Formula 1",
    title: "F1 2026",
    summary: "Kimi Antonelli leads with 97 points. Mercedes lead constructors with 135+.",
    bullets: ["Youngest ever WDC leader", "Bahrain and Saudi cancelled", "Next race: Miami GP (Apr 30-May 3)"],
  },
  epl: {
    sportName: "Football",
    title: "Premier League 2025-26",
    summary: "Arsenal top with 70 points, six clear of Manchester City.",
    bullets: ["Promoted: Sunderland, Burnley, Leeds", "Burnley and Wolves in relegation zone"],
  },
};

export function League() {
  const navigate = useNavigate();
  const { sportId, leagueId } = useParams<{ sportId: string; leagueId: string }>();
  const [activeTab, setActiveTab] = useState("Points Table");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iplTeams, setIplTeams] = useState<IplTeamRow[]>([]);
  const [iplMatches, setIplMatches] = useState<IplMatchRow[]>([]);
  const [iplStats, setIplStats] = useState<IplStatsRow[]>([]);
  const [statsCategories, setStatsCategories] = useState<{ batting: string[]; bowling: string[] }>({ batting: [], bowling: [] });
  const [squadTeams, setSquadTeams] = useState<string[]>([]);
  const [featuredSquadTeam, setFeaturedSquadTeam] = useState<string | null>(null);
  const [featuredSquadPlayers, setFeaturedSquadPlayers] = useState<IplSquadPlayer[]>([]);
  const [iplNews, setIplNews] = useState<IplNewsItem[]>([]);
  const leagueKey: LeagueKey = leagueId === "f1-2026" ? "f1-2026" : leagueId === "epl" ? "epl" : "ipl";

  useEffect(() => {
    if (leagueKey !== "ipl") {
      return;
    }

    let active = true;

    const loadLeague = async () => {
      try {
        setLoading(true);
        setError(null);

        const [teamsRes, matchesRes, statsRes, squadsRes, newsRes] = await Promise.all([
          cricketApi.getIplPoints(),
          cricketApi.getIplScrapedMatches(),
          cricketApi.getIplStats(),
          cricketApi.getIplSquads(),
          cricketApi.getIplNews(),
        ]);

        if (!active) {
          return;
        }

        const teams = safeArray<any>((teamsRes as any).points)
          .filter((team) => isIplTeamName(team?.team))
          .map((team) => ({
            teamId: String(team?.team || "unknown-team"),
            short: deriveTeamShort(team?.team),
            name: team?.team || "Unknown Team",
            played: Number(team?.played ?? 0),
            won: Number(team?.win ?? 0),
            lost: Number(team?.loss ?? 0),
            pts: Number(team?.points ?? 0),
            nrr: String(team?.nrr ?? "-"),
          }))
          .sort((a, b) => b.pts - a.pts || b.won - a.won);

        const matches = safeArray<any>((matchesRes as any).matches).map((match) => ({
          id: String(match?.id || `${match?.team1 || "team1"}-${match?.team2 || "team2"}`),
          date: formatApiDate(match?.date),
          matchup: `${match?.team1 || "Team A"} vs ${match?.team2 || "Team B"}`,
          score: [match?.team1Score, match?.team2Score].filter(Boolean).join(" | ") || "Score unavailable",
          result: match?.result || match?.status || "Status unavailable",
          venue: match?.venue || "Venue unavailable",
          status: String(match?.status || ""),
        }));

        const statsRows = safeArray<any>((statsRes as any)?.stats?.leaders).map((row) => ({
          player: String(row?.player || "Unknown Player"),
          matches: row?.matches ?? null,
          innings: row?.innings ?? null,
          runs: row?.runs ?? null,
          average: String(row?.average ?? "-"),
          strikeRate: String(row?.strikeRate ?? "-"),
          fours: row?.fours ?? null,
          sixes: row?.sixes ?? null,
        }));

        const categories = {
          batting: safeArray<string>((statsRes as any)?.stats?.categories?.batting),
          bowling: safeArray<string>((statsRes as any)?.stats?.categories?.bowling),
        };

        const squadsPayload = (squadsRes as any)?.squads || {};
        const teamsInSquad = safeArray<string>(squadsPayload?.teams);
        const featuredTeam = squadsPayload?.featuredTeam || null;
        const players = safeArray<any>(squadsPayload?.players).map((player) => ({
          name: String(player?.name || "Unknown"),
          roleGroup: String(player?.roleGroup || "Squad"),
          role: String(player?.role || "-"),
        }));

        const newsItems = safeArray<any>((newsRes as any)?.news).map((item) => ({
          title: String(item?.title || "Untitled"),
          summary: item?.summary ? String(item.summary) : null,
          publishedAt: String(item?.publishedAt || ""),
          tag: String(item?.tag || "IPL 2026"),
        }));

        setIplTeams(teams);
        setIplMatches(matches);
        setIplStats(statsRows);
        setStatsCategories(categories);
        setSquadTeams(teamsInSquad);
        setFeaturedSquadTeam(featuredTeam);
        setFeaturedSquadPlayers(players);
        setIplNews(newsItems);
      } catch (fetchError: any) {
        if (!active) {
          return;
        }
        setError(fetchError?.message || "Failed to load IPL data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadLeague();

    return () => {
      active = false;
    };
  }, [leagueKey]);

  const completedResults = useMemo(() => iplMatches.filter((match) => match.status === "Completed").slice(0, 40), [iplMatches]);
  const upcomingFixtures = useMemo(() => iplMatches.filter((match) => isUpcomingStatus(match.status)).slice(0, 40), [iplMatches]);

  if (leagueKey !== "ipl") {
    const generic = genericSnapshots[leagueKey];
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <BackButton to={sportId ? `/sport/${sportId}` : "/dashboard"} />
            <Breadcrumbs items={[{ label: generic.sportName, path: `/sport/${sportId}` }, { label: generic.title }]} />
          </div>
          <GlassCard className="p-8">
            <h1 className="text-3xl font-black text-white mb-3">{generic.title}</h1>
            <p className="text-white/55 mb-5">{generic.summary}</p>
            <div className="space-y-2">
              {generic.bullets.map((b) => (
                <p key={b} className="text-sm text-white/65">• {b}</p>
              ))}
            </div>
          </GlassCard>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to={sportId ? `/sport/${sportId}` : "/dashboard"} />
          <Breadcrumbs items={[{ label: "Cricket", path: `/sport/${sportId}` }, { label: "IPL 2026" }]} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-8 mb-8"
          style={{
            background: "linear-gradient(140deg, rgba(24, 17, 54, 0.85) 0%, rgba(13, 26, 50, 0.9) 100%)",
            border: "1px solid rgba(160,180,255,0.16)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-white/35 text-xs uppercase tracking-widest mb-1">Indian Premier League</p>
              <h1 className="text-4xl font-black text-white mb-2">IPL Live Data</h1>
              <p className="text-white/55 text-sm">League cards are now powered by backend API responses. Missing fields are shown as "-" when the provider does not expose them.</p>
              {error && <p className="text-[#ff8ca8] text-xs mt-2">{error}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[ [String(iplTeams.length), "Teams"], [String(iplMatches.length), "Matches"], [String(completedResults.length), "Completed"] ].map(([v, l]) => (
                <div key={l} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-2xl font-black text-white">{v}</div>
                  <div className="text-xs text-white/30">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="flex gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={
                activeTab === tab
                  ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white", boxShadow: "0 0 20px rgba(59,212,231,0.25)" }
                  : { color: "rgba(255,255,255,0.45)" }
              }
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "Points Table" && (
            <motion.div key="points" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <GlassCard className="overflow-hidden">
                <div className="grid grid-cols-[2.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.8fr] gap-2 px-6 py-4 text-xs uppercase tracking-wider text-white/30 font-semibold" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span>Team</span>
                  <span className="text-center">P</span>
                  <span className="text-center">W</span>
                  <span className="text-center">L</span>
                  <span className="text-center">Pts</span>
                  <span className="text-center hidden md:block">NRR</span>
                </div>

                {loading && (
                  <div className="px-6 py-5 text-sm text-white/45">Loading IPL teams...</div>
                )}

                {!loading && iplTeams.length === 0 && (
                  <div className="px-6 py-5 text-sm text-white/45">No IPL team rows were returned by the API.</div>
                )}

                {iplTeams.map((row, idx) => {
                  const logo = getTeamLogoProps(row.name);
                  return (
                  <motion.div
                    key={row.teamId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="grid grid-cols-[2.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.8fr] gap-2 px-6 py-4 items-center cursor-pointer group"
                    style={{
                      borderBottom: idx < iplTeams.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      background: idx < 4 ? "linear-gradient(90deg, rgba(65, 117, 255, 0.08), rgba(40, 185, 255, 0.03))" : "transparent",
                    }}
                    whileHover={{ background: "rgba(255,255,255,0.07)" }}
                    onClick={() => navigate(`/sport/${sportId}/league/${leagueId}/team/${row.teamId}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-white/20 text-xs w-4 text-right">{idx + 1}</span>
                      <TeamLogo teamId={logo.teamId} short={row.short} size={34} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm group-hover:text-[#7ad6ff] transition-colors">{row.short}</p>
                        <p className="text-white/35 text-xs truncate">{row.name}</p>
                      </div>
                    </div>
                    <span className="text-center text-white/65 text-sm">{row.played}</span>
                    <span className="text-center text-sm" style={{ color: "#00E676" }}>{row.won}</span>
                    <span className="text-center text-sm" style={{ color: "#FF4D8D" }}>{row.lost}</span>
                    <span className="text-center text-white font-black">{row.pts}</span>
                    <span className="text-center text-xs font-mono hidden md:block" style={{ color: row.nrr.startsWith("+") ? "#00E676" : row.nrr.startsWith("-") ? "#FF4D8D" : "#a6b0c4" }}>{row.nrr}</span>
                  </motion.div>
                );})}

                <div className="px-6 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(59,212,231,0.05)" }}>
                  <span className="w-2 h-2 rounded-full bg-[#3BD4E7]" />
                  <span className="text-white/35 text-xs">Click any team row to open team analysis with live squad data.</span>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "Matches" && (
            <motion.div key="matches" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold">Completed Matches</h3>
                </div>
                {completedResults.length === 0 && <div className="px-6 py-5 text-sm text-white/45">No completed IPL matches available in the current response.</div>}
                {completedResults.map((m, i) => (
                  <div key={m.id} className="grid grid-cols-[0.4fr_0.8fr_1.3fr_1fr_1.8fr] gap-3 px-6 py-3 text-sm" style={{ borderBottom: i < completedResults.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span className="text-white/30">{i + 1}</span>
                    <span className="text-white/55">{m.date}</span>
                    <span className="text-white/75">{m.matchup}</span>
                    <span className="text-[#7ad6ff] text-xs font-mono">{m.score}</span>
                    <span className="text-white">{m.result}</span>
                  </div>
                ))}
              </GlassCard>

              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold">Upcoming Fixtures</h3>
                  <span className="text-white/35 text-xs">from backend feed</span>
                </div>
                {upcomingFixtures.length === 0 && <div className="px-6 py-5 text-sm text-white/45">No upcoming IPL fixtures available in the current response.</div>}
                {upcomingFixtures.map((f, i) => (
                  <div key={f.id} className="flex items-center justify-between px-6 py-3" style={{ borderBottom: i < upcomingFixtures.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i === 0 ? "rgba(59,212,231,0.08)" : "transparent" }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/35 text-xs">#{i + 1}</span>
                        <span className="text-white font-semibold text-sm">{f.matchup}</span>
                        {i === 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(59,212,231,0.15)", color: "#3BD4E7" }}>NEXT</span>}
                      </div>
                      <p className="text-white/35 text-xs mt-0.5">{f.venue}</p>
                    </div>
                    <span className="text-[#7ad6ff] text-xs font-semibold flex items-center gap-1"><Calendar size={12} /> {f.date}</span>
                  </div>
                ))}
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "Stats" && (
            <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <GlassCard className="p-5" glow="none">
                  <p className="text-white/45 text-xs uppercase tracking-wider mb-2">Batting Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {statsCategories.batting.map((category) => (
                      <span key={category} className="px-2 py-1 rounded text-xs" style={{ background: "rgba(59,212,231,0.12)", color: "#7ad6ff" }}>
                        {category}
                      </span>
                    ))}
                  </div>
                </GlassCard>
                <GlassCard className="p-5" glow="none">
                  <p className="text-white/45 text-xs uppercase tracking-wider mb-2">Bowling Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {statsCategories.bowling.map((category) => (
                      <span key={category} className="px-2 py-1 rounded text-xs" style={{ background: "rgba(255,145,0,0.15)", color: "#ffb85c" }}>
                        {category}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </div>

              <GlassCard className="overflow-hidden">
                <div className="grid grid-cols-[2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 px-6 py-4 text-xs uppercase tracking-wider text-white/30 font-semibold" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span>Player</span>
                  <span className="text-center">Mat</span>
                  <span className="text-center">Inns</span>
                  <span className="text-center">Runs</span>
                  <span className="text-center">Avg</span>
                  <span className="text-center">SR</span>
                  <span className="text-center">4s/6s</span>
                </div>

                {iplStats.length === 0 && <div className="px-6 py-5 text-sm text-white/45">No IPL stats were returned by the scraper.</div>}
                {iplStats.slice(0, 20).map((row, idx) => (
                  <div key={`${row.player}-${idx}`} className="grid grid-cols-[2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 px-6 py-3 text-sm items-center" style={{ borderBottom: idx < Math.min(iplStats.length, 20) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span className="text-white/85">{row.player}</span>
                    <span className="text-center text-white/60">{row.matches ?? "-"}</span>
                    <span className="text-center text-white/60">{row.innings ?? "-"}</span>
                    <span className="text-center text-white font-semibold">{row.runs ?? "-"}</span>
                    <span className="text-center text-white/60">{row.average}</span>
                    <span className="text-center text-white/60">{row.strikeRate}</span>
                    <span className="text-center text-white/60">{`${row.fours ?? "-"}/${row.sixes ?? "-"}`}</span>
                  </div>
                ))}
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "Squads" && (
            <motion.div key="squads" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
              <GlassCard className="p-5">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Squad Teams</p>
                <div className="flex flex-wrap gap-2">
                  {squadTeams.map((team) => (
                    <span key={team} className="px-2 py-1 rounded text-xs" style={{ background: "rgba(124,77,255,0.15)", color: "#cfbcff" }}>
                      {team}
                    </span>
                  ))}
                </div>
                {!loading && squadTeams.length === 0 && <p className="text-white/45 text-sm mt-2">No squads team list returned by scraper.</p>}
              </GlassCard>

              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold">Featured Squad{featuredSquadTeam ? `: ${featuredSquadTeam}` : ""}</h3>
                </div>
                {featuredSquadPlayers.length === 0 && <div className="px-6 py-5 text-sm text-white/45">No squad players were parsed from the current page response.</div>}
                {featuredSquadPlayers.map((player, idx) => (
                  <div key={`${player.name}-${idx}`} className="grid grid-cols-[1.6fr_1fr_1fr] gap-3 px-6 py-3 text-sm" style={{ borderBottom: idx < featuredSquadPlayers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span className="text-white/85">{player.name}</span>
                    <span className="text-white/55">{player.roleGroup}</span>
                    <span className="text-[#7ad6ff]">{player.role}</span>
                  </div>
                ))}
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "News" && (
            <motion.div key="news" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {iplNews.length === 0 && <GlassCard className="p-5 text-sm text-white/45">No IPL news was returned by the scraper.</GlassCard>}
              {iplNews.map((item, idx) => (
                <GlassCard key={`${item.title}-${idx}`} className="p-5" glow="none">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(255,77,141,0.16)", color: "#ff9dc0" }}>
                      {item.tag}
                    </span>
                    <span className="text-white/35 text-xs">{item.publishedAt}</span>
                  </div>
                  <h4 className="text-white font-semibold text-lg leading-snug">{item.title}</h4>
                  {item.summary && <p className="text-white/60 text-sm mt-2">{item.summary}</p>}
                </GlassCard>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
