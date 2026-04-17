import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { Edit3, Bell, Shield, LogOut, Star, Trophy, Activity, Heart, ChevronRight, Camera, Target } from "lucide-react";

const matchHistory = [
  { id: 1, match: "RCB vs MI", result: "RCB won by 25 runs", date: "Apr 15", badge: "Accurate" },
  { id: 2, match: "CSK vs KKR", result: "KKR won by 8 wkts", date: "Apr 12", badge: "Accurate" },
  { id: 3, match: "SRH vs DC", result: "SRH won by 42 runs", date: "Apr 10", badge: "Wrong" },
  { id: 4, match: "MI vs PBKS", result: "MI won by 6 runs", date: "Apr 8", badge: "Accurate" },
];

const favTeams = [
  { name: "Royal Challengers Bangalore", short: "RCB", emoji: "🔴", color: "#FF4D8D", sportId: "cricket", leagueId: "ipl", teamId: "rcb" },
  { name: "Indian Cricket Team", short: "IND", emoji: "🇮🇳", color: "#FF9100", sportId: "cricket", leagueId: "ipl", teamId: "csk" },
  { name: "Los Angeles Lakers", short: "LAL", emoji: "🟣", color: "#7C4DFF", sportId: "basketball", leagueId: "nba", teamId: "lal" },
];

const achievements = [
  { icon: "🏆", title: "Super Fan", desc: "Watched 50+ matches", color: "#FF9100" },
  { icon: "🎯", title: "Predictor Pro", desc: "80% prediction accuracy", color: "#3BD4E7" },
  { icon: "🔥", title: "Streak Master", desc: "30-day login streak", color: "#FF4D8D" },
  { icon: "👑", title: "Room King", desc: "Hosted 10+ rooms", color: "#7C4DFF" },
];

const quickStats = [
  { label: "Matches Watched", value: "248", icon: Activity, color: "#3BD4E7" },
  { label: "Predictions", value: "89", icon: Target, color: "#7C4DFF" },
  { label: "Rooms Joined", value: "34", icon: Heart, color: "#FF4D8D" },
  { label: "Favourite Teams", value: "3", icon: Star, color: "#FF9100" },
];

export function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = ["Overview", "History", "Achievements"];

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
          <BackButton to="/dashboard" />
          <Breadcrumbs items={[{ label: "My Profile" }]} />
        </div>

        {/* Profile Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-10 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(124,77,255,0.12) 0%, rgba(59,212,231,0.1) 50%, rgba(255,77,141,0.08) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl"
                style={{ background: "linear-gradient(135deg, #7C4DFF, #3BD4E7)", boxShadow: "0 0 50px rgba(124,77,255,0.4)" }}
              >
                👤
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FF4D8D, #7C4DFF)", boxShadow: "0 0 15px rgba(255,77,141,0.4)" }}
              >
                <Camera size={14} className="text-white" />
              </motion.button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-4xl font-black text-white">SportsFan Pro</h1>
                <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(255,145,0,0.15)", border: "1px solid rgba(255,145,0,0.3)", color: "#FF9100" }}>
                  ⭐ PRO
                </div>
              </div>
              <p className="text-white/40 mb-2">@sportsfanpro · Member since 2024</p>
              <p className="text-white/60 text-sm max-w-md">Cricket & Basketball enthusiast. RCB die-hard fan 🔴 | NBA Lakers supporter 🟣 | Sports analytics nerd 📊</p>

              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", boxShadow: "0 0 15px rgba(59,212,231,0.3)" }}
                >
                  <Edit3 size={14} className="text-white" />
                  <span className="text-white">Edit Profile</span>
                </motion.button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                >
                  <Bell size={14} />
                  Notifications
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              {quickStats.map((s) => (
                <div key={s.label} className="text-center p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-white/30 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={activeTab === tab ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white", boxShadow: "0 0 20px rgba(59,212,231,0.3)" } : { color: "rgba(255,255,255,0.4)" }}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "Overview" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Favourite Teams */}
            <GlassCard className="p-6">
              <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                <Heart size={18} style={{ color: "#FF4D8D" }} />
                Favourite Teams
              </h3>
              <div className="space-y-3">
                {favTeams.map((team, i) => (
                  <motion.div
                    key={team.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-xl cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    onClick={() => navigate(`/sport/${team.sportId}/league/${team.leagueId}/team/${team.teamId}`)}
                    whileHover={{ background: "rgba(255,255,255,0.07)", scale: 1.01 } as any}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${team.color}15`, border: `1px solid ${team.color}30` }}>
                      <TeamLogo teamId={team.teamId} short={team.short} size={34} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{team.name}</p>
                      <p className="text-white/30 text-xs">{team.short}</p>
                    </div>
                    <ChevronRight size={16} className="text-white/20" />
                  </motion.div>
                ))}
                <button className="w-full py-3 rounded-xl text-sm text-white/40 hover:text-white transition-colors" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
                  + Add favourite team
                </button>
              </div>
            </GlassCard>

            {/* Settings */}
            <GlassCard className="p-6">
              <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                <Shield size={18} style={{ color: "#7C4DFF" }} />
                Account Settings
              </h3>
              <div className="space-y-2">
                {[
                  { icon: Bell, label: "Push Notifications", desc: "Match alerts, score updates" },
                  { icon: Shield, label: "Privacy Settings", desc: "Manage who sees your activity" },
                  { icon: Star, label: "Subscription", desc: "SportsX Pro · Active" },
                  { icon: Trophy, label: "Achievements", desc: "4 badges earned" },
                ].map((item, i) => (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                    whileHover={{ background: "rgba(255,255,255,0.07)" } as any}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,77,255,0.15)" }}>
                      <item.icon size={16} style={{ color: "#7C4DFF" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{item.label}</p>
                      <p className="text-white/30 text-xs">{item.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-white/20" />
                  </motion.button>
                ))}

                <motion.button
                  whileHover={{ scale: 1.01 } as any}
                  whileTap={{ scale: 0.99 } as any}
                  onClick={() => navigate("/login")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-left"
                  style={{ background: "rgba(255,77,141,0.06)", border: "1px solid rgba(255,77,141,0.15)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,77,141,0.15)" }}>
                    <LogOut size={16} style={{ color: "#FF4D8D" }} />
                  </div>
                  <span style={{ color: "#FF4D8D" }} className="font-medium text-sm">Sign Out</span>
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === "History" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 className="text-white font-bold">Match History & Predictions</h3>
              </div>
              {matchHistory.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between px-6 py-4"
                  style={{ borderBottom: i < matchHistory.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                >
                  <div>
                    <p className="text-white font-semibold">{m.match}</p>
                    <p className="text-white/40 text-xs mt-0.5">{m.result}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-xs">{m.date}</span>
                    <span
                      className="px-3 py-1 rounded-lg text-xs font-semibold"
                      style={
                        m.badge === "Accurate"
                          ? { background: "rgba(0,230,118,0.12)", color: "#00E676", border: "1px solid rgba(0,230,118,0.25)" }
                          : { background: "rgba(255,77,141,0.12)", color: "#FF4D8D", border: "1px solid rgba(255,77,141,0.25)" }
                      }
                    >
                      {m.badge}
                    </span>
                  </div>
                </motion.div>
              ))}
            </GlassCard>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {activeTab === "Achievements" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((a, i) => (
                <motion.div key={a.title} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, type: "spring" }}>
                  <GlassCard className="p-6 text-center" hover>
                    <div className="text-5xl mb-4">{a.icon}</div>
                    <h4 className="text-white font-bold mb-1">{a.title}</h4>
                    <p className="text-white/40 text-xs">{a.desc}</p>
                    <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: `${a.color}20` }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: a.color }}
                      />
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
