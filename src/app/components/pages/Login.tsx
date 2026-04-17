import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Mail, Lock, User, Eye, EyeOff, Zap, ArrowRight } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = () => navigate("/dashboard");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      {/* Animated blobs for login page */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -60, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,212,231,0.15) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,77,141,0.15) 0%, transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)",
                boxShadow: "0 0 40px rgba(124,77,255,0.5)",
              }}
            >
              <Zap size={32} className="text-white" />
            </div>
          </div>
          <h1
            className="text-4xl font-black tracking-tight mb-2"
            style={{ background: "linear-gradient(135deg, #3BD4E7, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            SportsX
          </h1>
          <p className="text-white/40 text-sm">Sports Intelligence Platform</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-3xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Tab Switcher */}
          <div className="flex p-1 rounded-xl mb-8" style={{ background: "rgba(255,255,255,0.05)" }}>
            {["Login", "Sign Up"].map((tab) => (
              <button
                key={tab}
                onClick={() => setIsLogin(tab === "Login")}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={
                  (tab === "Login") === isLogin
                    ? {
                        background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)",
                        color: "white",
                        boxShadow: "0 0 20px rgba(59,212,231,0.3)",
                      }
                    : { color: "rgba(255,255,255,0.4)" }
                }
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: isLogin ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 10 : -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {!isLogin && (
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-white/30 outline-none text-sm transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(59,212,231,0.5)"; e.target.style.boxShadow = "0 0 20px rgba(59,212,231,0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-white/30 outline-none text-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(59,212,231,0.5)"; e.target.style.boxShadow = "0 0 20px rgba(59,212,231,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-white placeholder-white/30 outline-none text-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(59,212,231,0.5)"; e.target.style.boxShadow = "0 0 20px rgba(59,212,231,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button className="text-xs text-[#3BD4E7]/70 hover:text-[#3BD4E7] transition-colors">
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                onClick={handleSubmit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-2"
                style={{
                  background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)",
                  boxShadow: "0 0 30px rgba(124,77,255,0.4), 0 4px 20px rgba(59,212,231,0.3)",
                }}
              >
                {isLogin ? "Sign In" : "Create Account"}
                <ArrowRight size={18} />
              </motion.button>
            </motion.div>
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-white/20 text-xs">OR CONTINUE WITH</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {["Google", "Apple"].map((provider) => (
              <motion.button
                key={provider}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                className="py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {provider}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-white/30 text-xs mt-6"
        >
          By continuing, you agree to our Terms & Privacy Policy
        </motion.p>
      </div>
    </motion.div>
  );
}
