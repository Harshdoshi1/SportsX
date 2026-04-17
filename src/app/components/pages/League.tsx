import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Calendar } from "lucide-react";
import { IPL_STANDINGS, IPL_STATS_SECTIONS } from "../../data/ipl2026";

type LeagueKey = "ipl" | "f1-2026" | "epl";

const iplRows = IPL_STANDINGS;

const completedResults = [
  { no: 1, date: "Mar 28", matchup: "RCB vs SRH", result: "RCB won by 6 wickets" },
  { no: 2, date: "Mar 29", matchup: "MI vs KKR", result: "MI won by 6 wickets" },
  { no: 3, date: "Mar 30", matchup: "RR vs CSK", result: "RR won by 8 wickets" },
  { no: 4, date: "Mar 31", matchup: "PBKS vs GT", result: "PBKS won by 3 wickets" },
  { no: 5, date: "Apr 1", matchup: "LSG vs DC", result: "DC won by 6 wickets" },
  { no: 6, date: "Apr 2", matchup: "KKR vs SRH", result: "SRH won by 65 runs" },
  { no: 7, date: "Apr 3", matchup: "CSK vs PBKS", result: "PBKS won by 5 wickets" },
  { no: 8, date: "Apr 4", matchup: "DC vs MI", result: "DC won by 6 wickets" },
  { no: 9, date: "Apr 4", matchup: "GT vs RR", result: "RR won by 6 runs" },
  { no: 10, date: "Apr 5", matchup: "SRH vs LSG", result: "LSG won by 5 wickets" },
  { no: 11, date: "Apr 5", matchup: "RCB vs CSK", result: "RCB won by 43 runs" },
  { no: 12, date: "Apr 6", matchup: "KKR vs PBKS", result: "No Result (Rain)" },
  { no: 13, date: "Apr 7", matchup: "RR vs MI", result: "RR won by 27 runs" },
  { no: 14, date: "Apr 8", matchup: "DC vs GT", result: "GT won by 1 run" },
  { no: 15, date: "Apr 9", matchup: "KKR vs LSG", result: "LSG won by 3 wickets" },
  { no: 16, date: "Apr 10", matchup: "RR vs RCB", result: "RR won by 6 wickets" },
  { no: 17, date: "Apr 11", matchup: "PBKS vs SRH", result: "PBKS won by 6 wickets" },
  { no: 18, date: "Apr 11", matchup: "CSK vs DC", result: "CSK won by 23 runs" },
  { no: 19, date: "Apr 12", matchup: "LSG vs GT", result: "GT won by 7 wickets" },
  { no: 20, date: "Apr 12", matchup: "MI vs RCB", result: "RCB won by 18 runs" },
  { no: 21, date: "Apr 13", matchup: "SRH vs RR", result: "SRH won by 57 runs" },
  { no: 22, date: "Apr 14", matchup: "CSK vs KKR", result: "CSK won by 32 runs" },
  { no: 23, date: "Apr 15", matchup: "RCB vs LSG", result: "RCB won by 5 wickets" },
  { no: 24, date: "Apr 16", matchup: "MI vs PBKS", result: "PBKS won by 7 wickets" },
];

const upcomingFixtures = [
  { no: 25, date: "Apr 17", matchup: "GT vs KKR", venue: "Ahmedabad", highlight: true },
  { no: 26, date: "Apr 18", matchup: "RCB vs DC", venue: "Bengaluru" },
  { no: 27, date: "Apr 18", matchup: "SRH vs CSK", venue: "Hyderabad" },
  { no: 28, date: "Apr 19", matchup: "KKR vs RR", venue: "Kolkata" },
  { no: 29, date: "Apr 19", matchup: "PBKS vs LSG", venue: "New Chandigarh" },
  { no: 30, date: "Apr 20", matchup: "GT vs MI", venue: "Ahmedabad" },
  { no: 31, date: "Apr 21", matchup: "SRH vs DC", venue: "Hyderabad" },
  { no: 32, date: "Apr 22", matchup: "LSG vs RR", venue: "Lucknow" },
  { no: 33, date: "Apr 23", matchup: "MI vs CSK", venue: "Mumbai" },
  { no: 34, date: "Apr 24", matchup: "RCB vs GT", venue: "Bengaluru" },
  { no: 35, date: "Apr 25", matchup: "DC vs PBKS", venue: "Delhi" },
  { no: 36, date: "Apr 25", matchup: "RR vs SRH", venue: "Jaipur" },
  { no: 37, date: "Apr 26", matchup: "CSK vs GT", venue: "Chennai" },
  { no: 38, date: "Apr 26", matchup: "LSG vs KKR", venue: "Lucknow" },
  { no: 39, date: "Apr 27", matchup: "DC vs RCB", venue: "Delhi" },
  { no: 40, date: "Apr 28", matchup: "PBKS vs RR", venue: "New Chandigarh" },
  { no: 41, date: "Apr 29", matchup: "MI vs SRH", venue: "Mumbai" },
  { no: 42, date: "Apr 30", matchup: "GT vs RCB", venue: "Ahmedabad" },
];

const tabs = ["Points Table", "Matches", "Stats"];

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
  const leagueKey: LeagueKey = leagueId === "f1-2026" ? "f1-2026" : leagueId === "epl" ? "epl" : "ipl";

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
              <h1 className="text-4xl font-black text-white mb-2">IPL 2026</h1>
              <p className="text-white/55 text-sm">Updated through Match 24 (Apr 16). PBKS lead on 9 points; KKR are last with 1 point and no wins.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[ ["10", "Teams"], ["74", "Matches"], ["24", "Played"] ].map(([v, l]) => (
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

                {iplRows.map((row, idx) => (
                  <motion.div
                    key={row.teamId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="grid grid-cols-[2.2fr_0.6fr_0.6fr_0.6fr_0.6fr_0.8fr] gap-2 px-6 py-4 items-center cursor-pointer group"
                    style={{
                      borderBottom: idx < iplRows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      background: idx < 4 ? "linear-gradient(90deg, rgba(65, 117, 255, 0.08), rgba(40, 185, 255, 0.03))" : "transparent",
                    }}
                    whileHover={{ background: "rgba(255,255,255,0.07)" }}
                    onClick={() => navigate(`/sport/${sportId}/league/${leagueId}/team/${row.teamId}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-white/20 text-xs w-4 text-right">{idx + 1}</span>
                      <TeamLogo teamId={row.teamId} short={row.short} size={34} />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm group-hover:text-[#7ad6ff] transition-colors">{row.short}</p>
                        <p className="text-white/35 text-xs truncate">{row.name}</p>
                      </div>
                      <div className="hidden md:flex gap-1 ml-2">
                        {row.form.map((f, i) => (
                          <span key={`${row.teamId}-${i}`} className="w-2 h-2 rounded-full" style={{ background: f === "W" ? "#00E676" : f === "L" ? "#FF4D8D" : "#FF9100" }} />
                        ))}
                      </div>
                    </div>
                    <span className="text-center text-white/65 text-sm">{row.played}</span>
                    <span className="text-center text-sm" style={{ color: "#00E676" }}>{row.won}</span>
                    <span className="text-center text-sm" style={{ color: "#FF4D8D" }}>{row.lost}</span>
                    <span className="text-center text-white font-black">{row.pts}</span>
                    <span className="text-center text-xs font-mono hidden md:block" style={{ color: row.nrr.startsWith("+") ? "#00E676" : "#FF4D8D" }}>{row.nrr}</span>
                  </motion.div>
                ))}

                <div className="px-6 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(59,212,231,0.05)" }}>
                  <span className="w-2 h-2 rounded-full bg-[#3BD4E7]" />
                  <span className="text-white/35 text-xs">Top 4 teams qualify for playoffs. Click any team row to view players and team analysis.</span>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "Matches" && (
            <motion.div key="matches" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold">Completed Matches (1-24)</h3>
                </div>
                {completedResults.map((m, i) => (
                  <div key={m.no} className="grid grid-cols-[0.5fr_0.7fr_1.2fr_2fr] gap-3 px-6 py-3 text-sm" style={{ borderBottom: i < completedResults.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span className="text-white/30">{m.no}</span>
                    <span className="text-white/55">{m.date}</span>
                    <span className="text-white/75">{m.matchup}</span>
                    <span className="text-white">{m.result}</span>
                  </div>
                ))}
              </GlassCard>

              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-white font-bold">Upcoming Fixtures</h3>
                  <span className="text-white/35 text-xs">through Apr 30 snapshot</span>
                </div>
                {upcomingFixtures.map((f, i) => (
                  <div key={f.no} className="flex items-center justify-between px-6 py-3" style={{ borderBottom: i < upcomingFixtures.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: f.highlight ? "rgba(59,212,231,0.08)" : "transparent" }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/35 text-xs">#{f.no}</span>
                        <span className="text-white font-semibold text-sm">{f.matchup}</span>
                        {f.highlight && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(59,212,231,0.15)", color: "#3BD4E7" }}>TODAY</span>}
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {IPL_STATS_SECTIONS.slice(0, 3).map((section) => {
                    const leader = section.entries[0];
                    return (
                      <GlassCard key={section.id} className="p-5" glow="none">
                        <p className="text-white/45 text-xs uppercase tracking-wider mb-2">{section.title}</p>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ border: `1px solid ${section.accent}55` }}>
                            <ImageWithFallback src={leader.image} alt={leader.player} className="w-full h-full object-cover" fallbackMode="person" />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm leading-tight">{leader.player}</p>
                            <p className="text-white/45 text-xs">{leader.team}</p>
                          </div>
                        </div>
                        <div className="text-3xl font-black" style={{ color: section.accent }}>{leader.value}</div>
                        <p className="text-white/35 text-xs mt-1">{section.subtitle}</p>
                      </GlassCard>
                    );
                  })}
                </div>

                <GlassCard className="p-4 md:p-6" glow="none">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                    <h3 className="text-white font-black text-xl">IPL 2026 Stats Center</h3>
                    <span className="text-white/35 text-xs">Synced from your provided IPL states data</span>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {IPL_STATS_SECTIONS.map((section) => (
                      <div
                        key={section.id}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          border: `1px solid ${section.accent}33`,
                          background: `linear-gradient(135deg, ${section.accent}10 0%, rgba(7,11,28,0.75) 70%)`,
                        }}
                      >
                        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${section.accent}33` }}>
                          <p className="text-white font-bold text-sm">{section.title}</p>
                          <p className="text-white/40 text-xs">{section.subtitle}</p>
                        </div>
                        <div className="px-2 py-1">
                          {section.entries.map((entry, idx) => (
                            <div
                              key={`${section.id}-${entry.player}-${idx}`}
                              className="grid grid-cols-[0.4fr_2.2fr_0.8fr] gap-2 items-center px-2 py-2 rounded-xl"
                              style={{
                                background: idx === 0 ? "rgba(255,255,255,0.05)" : "transparent",
                                borderBottom: idx < section.entries.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                              }}
                            >
                              <span className="text-white/45 text-xs font-semibold">#{entry.rank}</span>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/15">
                                  <ImageWithFallback src={entry.image} alt={entry.player} className="w-full h-full object-cover" fallbackMode="person" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-semibold truncate">{entry.player}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3.5 h-3.5 rounded-full overflow-hidden border border-white/15">
                                      <ImageWithFallback src={entry.teamLogo} alt={entry.team} className="w-full h-full object-cover" />
                                    </div>
                                    <p className="text-white/40 text-xs truncate">{entry.team}</p>
                                  </div>
                                </div>
                              </div>
                              <span className="text-right text-white font-black">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
