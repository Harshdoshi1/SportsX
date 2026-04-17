import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({ to, label = "Back" }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <motion.button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all border border-white/10 hover:border-white/20"
      style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}
      whileHover={{ scale: 1.03, x: -2 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </motion.button>
  );
}
