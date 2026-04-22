import { motion } from "motion/react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
}

export function EmptyState({ title = "No Data Available", message = "There is no data to display for this section right now.", icon = "📭" }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-4xl mb-4">{icon}</span>
      <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
      <p className="text-white/40 text-xs text-center max-w-xs">{message}</p>
    </motion.div>
  );
}
