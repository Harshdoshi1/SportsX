import { motion } from "motion/react";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "blue" | "purple" | "pink" | "green" | "none";
  onClick?: () => void;
  style?: React.CSSProperties;
}

const glowMap = {
  blue: "hover:shadow-[0_0_40px_rgba(59,212,231,0.2)]",
  purple: "hover:shadow-[0_0_40px_rgba(124,77,255,0.2)]",
  pink: "hover:shadow-[0_0_40px_rgba(255,77,141,0.2)]",
  green: "hover:shadow-[0_0_40px_rgba(0,230,118,0.2)]",
  none: "",
};

export function GlassCard({ children, className = "", hover = false, glow = "blue", onClick, style }: GlassCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className={`
        backdrop-blur-xl rounded-2xl border transition-all duration-300
        ${glowMap[glow]}
        ${className}
      `}
      style={{
        background: "rgba(6, 9, 22, 0.82)",
        borderColor: "rgba(123, 142, 214, 0.2)",
        boxShadow: "0 14px 34px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
        ...style,
      }}
      whileHover={hover ? { scale: 1.02, y: -2 } : {}}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
