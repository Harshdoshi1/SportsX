import { motion, AnimatePresence } from "motion/react";
import { X, Trophy, Activity, Users, Bell } from "lucide-react";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const notifications = [
  { id: 1, type: "live", icon: Activity, title: "Match Started!", message: "RCB vs CSK — IPL 2026 Live now", time: "Just now", color: "#FF4D8D" },
  { id: 2, type: "score", icon: Trophy, title: "Score Update", message: "Virat Kohli scores a century! 🏏", time: "2 min ago", color: "#3BD4E7" },
  { id: 3, type: "room", icon: Users, title: "Room Invite", message: "SportsFan invited you to join their room", time: "5 min ago", color: "#7C4DFF" },
  { id: 4, type: "alert", icon: Bell, title: "Match Reminder", message: "MI vs KKR starts in 30 minutes", time: "25 min ago", color: "#FF9100" },
  { id: 5, type: "live", icon: Activity, title: "Wicket!", message: "Maxwell OUT for 68 runs", time: "1 hr ago", color: "#FF4D8D" },
  { id: 6, type: "score", icon: Trophy, title: "Result", message: "RCB won by 24 runs vs SRH", time: "3 hr ago", color: "#00E676" },
];

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col"
            style={{
              background: "rgba(8, 5, 24, 0.95)",
              backdropFilter: "blur(24px)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <h2 className="text-white font-bold text-lg">Notifications</h2>
                <p className="text-white/40 text-xs mt-0.5">6 new alerts</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-lg text-white/50 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.map((notif, index) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl cursor-pointer transition-all group"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  whileHover={{
                    background: "rgba(255,255,255,0.07)",
                    scale: 1.01,
                  }}
                >
                  <div className="flex gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${notif.color}20`, border: `1px solid ${notif.color}30` }}
                    >
                      <notif.icon size={18} style={{ color: notif.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{notif.title}</p>
                      <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-white/30 text-xs mt-1">{notif.time}</p>
                    </div>
                    {index < 3 && (
                      <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: notif.color }} />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button className="w-full py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
                Mark all as read
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
