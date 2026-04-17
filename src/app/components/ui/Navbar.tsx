import { motion } from "motion/react";
import { Search, Bell, User, Zap } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { NotificationPanel } from "./NotificationPanel";

export function Navbar() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchValue, setSearchValue] = useState("");

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
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search teams, players, matches..."
                  className="w-full pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 outline-none rounded-lg transition-all"
                  style={{
                    background: "rgba(8,12,28,0.95)",
                    border: "1px solid rgba(126,146,224,0.22)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,212,231,0.5)";
                    e.target.style.boxShadow = "0 0 20px rgba(59,212,231,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.08)";
                    e.target.style.boxShadow = "none";
                  }}
                />
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
