import { motion } from "motion/react";
import { ChevronRight, Home } from "lucide-react";
import { useNavigate } from "react-router";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 text-sm"
    >
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-1 text-white/40 hover:text-[#3BD4E7] transition-colors"
      >
        <Home size={14} />
        <span>Home</span>
      </button>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight size={14} className="text-white/20" />
          {item.path && index < items.length - 1 ? (
            <button
              onClick={() => navigate(item.path!)}
              className="text-white/40 hover:text-[#3BD4E7] transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[#3BD4E7] font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </motion.div>
  );
}
