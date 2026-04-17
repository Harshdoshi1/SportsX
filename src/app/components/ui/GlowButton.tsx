import { motion } from "motion/react";
import { ReactNode } from "react";

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: {
    bg: "linear-gradient(135deg, #3BD4E7, #7C4DFF)",
    shadow: "0 0 30px rgba(59,212,231,0.4), 0 4px 20px rgba(124,77,255,0.3)",
    hoverShadow: "0 0 50px rgba(59,212,231,0.6), 0 8px 30px rgba(124,77,255,0.5)",
  },
  secondary: {
    bg: "linear-gradient(135deg, #7C4DFF, #FF4D8D)",
    shadow: "0 0 30px rgba(124,77,255,0.4), 0 4px 20px rgba(255,77,141,0.3)",
    hoverShadow: "0 0 50px rgba(124,77,255,0.6), 0 8px 30px rgba(255,77,141,0.5)",
  },
  danger: {
    bg: "linear-gradient(135deg, #FF4D8D, #FF4747)",
    shadow: "0 0 30px rgba(255,77,141,0.4)",
    hoverShadow: "0 0 50px rgba(255,77,141,0.6)",
  },
  success: {
    bg: "linear-gradient(135deg, #00E676, #00BCD4)",
    shadow: "0 0 30px rgba(0,230,118,0.4)",
    hoverShadow: "0 0 50px rgba(0,230,118,0.6)",
  },
  ghost: {
    bg: "rgba(255,255,255,0.06)",
    shadow: "none",
    hoverShadow: "0 0 30px rgba(59,212,231,0.2)",
  },
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3",
  lg: "px-8 py-4 text-lg",
};

export function GlowButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
  size = "md",
}: GlowButtonProps) {
  const v = variants[variant];
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-xl font-semibold text-white transition-all duration-300 cursor-pointer
        flex items-center justify-center gap-2 border border-white/10
        ${sizes[size]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      style={{ background: v.bg, boxShadow: v.shadow }}
      whileHover={disabled ? {} : { scale: 1.03, boxShadow: v.hoverShadow }}
      whileTap={disabled ? {} : { scale: 0.97 }}
    >
      {children}
    </motion.button>
  );
}
