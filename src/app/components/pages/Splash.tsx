import { useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Zap } from "lucide-react";

export function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center relative"
    >
      {/* Animated center glow */}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(124,77,255,0.3) 0%, transparent 70%)" }}
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute w-[350px] h-[350px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(59,212,231,0.25) 0%, transparent 70%)" }}
      />

      {/* Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.3 }}
        className="relative mb-8"
      >
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #3BD4E7, #7C4DFF, #FF4D8D)",
            boxShadow: "0 0 80px rgba(124,77,255,0.6), 0 0 40px rgba(59,212,231,0.4)",
          }}
        >
          <Zap size={56} className="text-white" />
        </div>
        {/* Orbiting ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-12px] rounded-full border-2 border-dashed border-[#3BD4E7]/30"
        />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <h1
          className="text-6xl font-black tracking-tight mb-3"
          style={{ background: "linear-gradient(135deg, #3BD4E7 0%, #a78bfa 50%, #FF4D8D 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          SportsX
        </h1>
        <p className="text-white/50 text-lg tracking-widest uppercase">Sports Intelligence Platform</p>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-16 w-64"
      >
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, delay: 0.5, ease: "easeInOut" }}
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #3BD4E7, #7C4DFF, #FF4D8D)" }}
          />
        </div>
        <motion.p
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center text-white/30 text-xs mt-3 tracking-widest"
        >
          LOADING EXPERIENCE...
        </motion.p>
      </motion.div>

      {/* Version */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 text-white/20 text-xs"
      >
        v2.0.0 • Premium Edition
      </motion.p>
    </motion.div>
  );
}
