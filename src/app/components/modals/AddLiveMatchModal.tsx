import { useState } from "react";
import { motion } from "motion/react";
import { X, Radio, Link as LinkIcon, Loader2, AlertCircle } from "lucide-react";
import { sportKeyFromCategory, useMatchStore, type SportCategory } from "../../../contexts/MatchContext";
import { cricketApi } from "../../services/cricketApi";

interface AddLiveMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (match: any) => void;
  defaultCategory?: SportCategory;
  defaultSectionLabel?: string;
}

export function AddLiveMatchModal({ isOpen, onClose, onSuccess, defaultCategory, defaultSectionLabel }: AddLiveMatchModalProps) {
  const { addLiveMatch, setLiveSnapshot, setConnectionLost } = useMatchStore();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateForm = () => {
    if (!url.trim()) {
      setError("URL is required");
      return false;
    }
    
    try {
      new URL(url);
    } catch {
      setError("Invalid URL format");
      return false;
    }

    setError("");
    return true;
  };

  const inferCategory = (payload: any): SportCategory => {
    const tournamentId = String(payload?.match?.tournamentId || "").toLowerCase();
    if (tournamentId === "ipl") return "Cricket > IPL";
    if (tournamentId === "icc") return "Cricket > ICC";
    return defaultCategory || "Cricket > Other";
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const details: any = await cricketApi.getMatchDetailsByUrl(url, true);
      const team1 = String(details?.match?.team1 || "Team A").trim();
      const team2 = String(details?.match?.team2 || "Team B").trim();
      const category = inferCategory(details);
      const sectionLabel = String(details?.match?.series || defaultSectionLabel || "Live").trim() || "Live";
      const title = `${team1} vs ${team2} - Live`;

      const saved = addLiveMatch({
        sourceUrl: url,
        sport: sportKeyFromCategory(category),
        category,
        sectionLabel,
        matchTitle: title,
      });

      setConnectionLost(saved.id, false);
      setLiveSnapshot(saved.id, {
        match: details?.match || null,
        scoreboard: details?.scoreboard || null,
        fetchedAtIso: new Date().toISOString(),
        stale: Boolean((details as any)?.meta?.stale),
      });

      onSuccess(saved);
      onClose();
      
      // Reset form
      setUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to scrape match. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-lg rounded-2xl p-6 relative"
        style={{
          background: "rgba(10,10,15,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, #FF4D8D, #7C4DFF)",
                boxShadow: "0 0 20px rgba(255,77,141,0.3)",
              }}
            >
              <Radio size={20} className="text-white" />
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #FF4D8D, #7C4DFF)",
                  opacity: 0.5,
                }}
              />
            </div>
            <h2 className="text-xl font-bold text-white">Add Live Match</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* Info Banner */}
        <div
          className="flex items-start gap-3 p-3 rounded-lg mb-4"
          style={{
            background: "rgba(59,212,231,0.1)",
            border: "1px solid rgba(59,212,231,0.2)",
          }}
        >
          <AlertCircle size={16} className="text-[#3BD4E7] flex-shrink-0 mt-0.5" />
          <p className="text-[#3BD4E7] text-xs">
            The match URL will be scraped immediately and polling will start at 1-second intervals.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* URL */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
              <LinkIcon size={14} />
              Live Match URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://crex.live/match/..."
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none text-sm transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(255,77,141,0.5)";
                e.target.style.boxShadow = "0 0 20px rgba(255,77,141,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <p className="text-xs text-white/45">
            Teams, title, series, and scorecard are auto-fetched from the link and its /match-scorecard page.
          </p>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm p-3 rounded-lg flex items-start gap-2"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Scraping Failed</p>
                <p className="text-xs text-red-300">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #FF4D8D, #7C4DFF)",
                boxShadow: "0 0 30px rgba(255,77,141,0.3)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Radio size={16} />
                  Add Live Match
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
