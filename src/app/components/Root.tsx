import { Outlet } from "react-router";
import { motion } from "motion/react";
import { useAdminMatchPolling } from "../../contexts/MatchContext";

export function Root() {
  useAdminMatchPolling();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(145deg, #000104 0%, #01040c 34%, #01030a 68%, #000208 100%)" }}>
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ x: [0, 60, -30, 0], y: [0, -80, 40, 0], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,77,255,0.06) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, -50, 70, 0], y: [0, 60, -40, 0], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[10%] right-[-15%] w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,212,231,0.05) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, 80, -20, 0], y: [0, -30, 90, 0], scale: [1, 1.1, 0.85, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 10 }}
          className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,77,141,0.04) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, -40, 60, 0], y: [0, 50, -60, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,77,255,0.04) 0%, transparent 70%)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.7) 100%)" }} />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.44) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.44) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
