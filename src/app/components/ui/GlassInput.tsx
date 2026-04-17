import { InputHTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
  error?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ icon: Icon, label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-white/60 text-sm font-medium block">{label}</label>
        )}
        <div className="relative">
          {Icon && (
            <Icon
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
            />
          )}
          <input
            ref={ref}
            className={`
              w-full py-3 rounded-xl text-white placeholder-white/30 outline-none text-sm transition-all
              ${Icon ? "pl-11 pr-4" : "px-4"}
              ${className}
            `}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(59,212,231,0.5)";
              e.target.style.boxShadow = "0 0 20px rgba(59,212,231,0.1)";
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.08)";
              e.target.style.boxShadow = "none";
              props.onBlur?.(e);
            }}
            {...props}
          />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";
