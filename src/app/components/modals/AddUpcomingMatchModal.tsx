import { useState } from "react";
import { motion } from "motion/react";
import { X, Calendar, Clock, Link as LinkIcon, Trophy, Tag, Loader2 } from "lucide-react";
import { SPORT_CATEGORY_OPTIONS, sportKeyFromCategory, useMatchStore, type SportCategory } from "../../../contexts/MatchContext";

interface AddUpcomingMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (match: any) => void;
  defaultCategory?: SportCategory;
  defaultSectionLabel?: string;
}

export function AddUpcomingMatchModal({ isOpen, onClose, onSuccess, defaultCategory, defaultSectionLabel }: AddUpcomingMatchModalProps) {
  const { addUpcomingMatch } = useMatchStore();
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<SportCategory>(defaultCategory || "Cricket > IPL");
  const [sectionLabel, setSectionLabel] = useState(defaultSectionLabel || "IPL 2026");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
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

    if (!title.trim()) {
      setError("Match title is required");
      return false;
    }

    if (title.length > 100) {
      setError("Title must be 100 characters or less");
      return false;
    }

    if (!date) {
      setError("Date is required");
      return false;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setError("Date must be in the future");
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const scheduledAtIso = new Date(`${date}T${time || "00:00"}:00`).toISOString();
      const saved = addUpcomingMatch({
        sourceUrl: url,
        sport: sportKeyFromCategory(category),
        category,
        sectionLabel: sectionLabel.trim() || "Upcoming",
        matchTitle: title.trim(),
        scheduledAtIso,
      });
      onSuccess(saved);
      onClose();
      
      // Reset form
      setUrl("");
      setTitle("");
      setDate("");
      setTime("");
      setCategory(defaultCategory || "Cricket > IPL");
      setSectionLabel(defaultSectionLabel || "IPL 2026");
    } catch (err: any) {
      setError(err.message || "Failed to add match. Please try again.");
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
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3BD4E7, #00E676)",
                boxShadow: "0 0 20px rgba(59,212,231,0.3)",
              }}
            >
              <Clock size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Add Upcoming Match</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* URL */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
              <LinkIcon size={14} />
              Match URL
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
                e.target.style.borderColor = "rgba(59,212,231,0.5)";
                e.target.style.boxShadow = "0 0 20px rgba(59,212,231,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Sport */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
              <Trophy size={14} />
              Sport
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SportCategory)}
              className="w-full px-4 py-3 rounded-xl text-white outline-none text-sm transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {SPORT_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Section Label */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
              <Tag size={14} />
              Section Label
            </label>
            <input
              value={sectionLabel}
              onChange={(e) => setSectionLabel(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-white outline-none text-sm transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              placeholder='e.g., "IPL 2026"'
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-2 block">
              Match Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="MI vs CSK - Match 1"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none text-sm transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(59,212,231,0.5)";
                e.target.style.boxShadow = "0 0 20px rgba(59,212,231,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
                e.target.style.boxShadow = "none";
              }}
            />
            <p className="text-white/30 text-xs mt-1">{title.length}/100 characters</p>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar size={14} />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white outline-none text-sm transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>
            <div>
              <label className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
                <Clock size={14} />
                Time (IST)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white outline-none text-sm transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm p-3 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
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
                background: "linear-gradient(135deg, #3BD4E7, #00E676)",
                boxShadow: "0 0 30px rgba(59,212,231,0.3)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Match"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
