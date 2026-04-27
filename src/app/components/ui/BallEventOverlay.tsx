import { AnimatePresence, motion } from "motion/react";

export type BallEventType = "four" | "six" | "wicket" | "run" | "dot";

export type BallEventOverlayState = {
  id: number;
  type: BallEventType;
  label: string;
};

type BallEventOverlayProps = {
  event: BallEventOverlayState | null;
  fullCover?: boolean;
};

const themeByType: Record<BallEventType, { bg: string; color: string; glow: string; shake?: boolean }> = {
  four: {
    bg: "rgba(59,130,246,0.15)",
    color: "#3B82F6",
    glow: "0 0 40px rgba(59,130,246,0.22)",
  },
  six: {
    bg: "rgba(139,92,246,0.2)",
    color: "#8B5CF6",
    glow: "0 0 45px rgba(139,92,246,0.28)",
  },
  wicket: {
    bg: "rgba(239,68,68,0.2)",
    color: "#EF4444",
    glow: "0 0 52px rgba(239,68,68,0.32)",
    shake: true,
  },
  run: {
    bg: "rgba(16,185,129,0.16)",
    color: "#10B981",
    glow: "0 0 35px rgba(16,185,129,0.2)",
  },
  dot: {
    bg: "rgba(148,163,184,0.18)",
    color: "#94A3B8",
    glow: "0 0 30px rgba(148,163,184,0.16)",
  },
};

export function BallEventOverlay({ event, fullCover = false }: BallEventOverlayProps) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`pointer-events-none absolute inset-0 z-20 overflow-hidden ${fullCover ? "rounded-2xl" : "rounded-xl"}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${themeByType[event.type].shake ? "sx-anim-shake" : ""}`}
            style={{ background: themeByType[event.type].bg }}
          />
          <motion.div
            initial={{ y: 26, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: event.type === "six" ? 1.08 : 1 }}
            exit={{ y: -22, opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.28 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-sm md:text-base font-black sx-anim-float-up"
            style={{
              color: themeByType[event.type].color,
              background: "rgba(17,24,39,0.88)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: themeByType[event.type].glow,
            }}
          >
            {event.label}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
