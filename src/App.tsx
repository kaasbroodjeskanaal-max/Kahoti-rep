import { useState, useEffect } from "react";
import { supabase, subscribeToThreatIntel } from "./supabase";
import QuizJoin from "./components/QuizJoin";
import QuizManager from "./components/QuizManager";
import GameHost from "./components/GameHost";
import GamePlayer from "./components/GamePlayer";
import { Quiz } from "./types";
import { Play, Award, Users, Database, Sun, Moon, ShieldAlert, Sparkles, ArrowRight, Gamepad2 } from "lucide-react";
import { translations } from "./translations";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Threat Intel & Anti-DDoS Circuit Breaker State
  const [threatState, setThreatState] = useState<any>(null);
  const [blockedCountdown, setBlockedCountdown] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToThreatIntel((stats) => {
      setThreatState(stats);
      if (stats.isBlocked) {
        const remaining = Math.ceil((stats.blockedUntil - Date.now()) / 1000);
        setBlockedCountdown(remaining > 0 ? remaining : 0);
      } else {
        setBlockedCountdown(0);
      }
    });
    return unsubscribe;
  }, []);

  // Decrement seconds on countdown thread
  useEffect(() => {
    if (blockedCountdown <= 0) return;
    const timer = setInterval(() => {
      setBlockedCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [blockedCountdown]);

  // Language state (nl or en)
  const [lang, setLang] = useState<"nl" | "en">(() => {
    return (localStorage.getItem("kahoti_lang") as "nl" | "en") || "nl";
  });

  const t = translations[lang];

  const [mode, setMode] = useState<null | "join" | "manage" | "playing" | "hosting">(null);

  // Active Session Details
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [playerNickname, setPlayerNickname] = useState("");

  // Darkmode State
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("quiz_dark_mode") === "true";
  });
  
  const [activeModal, setActiveModal] = useState<"rules" | "privacy" | "terms" | null>(null);

  useEffect(() => {
    localStorage.setItem("quiz_dark_mode", String(isDark));
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Render Screens based on active Mode
  if (threatState?.isBlocked && blockedCountdown > 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none relative z-[99999] transition-all">
        {/* Glowing warning circle */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-125 animate-pulse" />
          <div className="w-24 h-24 rounded-3xl bg-red-500/15 border-2 border-red-500/30 flex items-center justify-center shadow-lg relative z-10 transition">
            <ShieldAlert className="w-12 h-12 text-red-500 animate-bounce" />
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <span className="bg-red-500/15 border border-red-500/25 text-red-400 font-mono text-[10px] uppercase tracking-[0.25em] font-black px-4 py-2 rounded-full inline-block">
            {t.shieldActive}
          </span>
          <h1 className="text-3xl font-black font-display text-white tracking-tight">
            {t.rateLimitExceeded}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed font-sans">
            {threatState.blockedReason ? (lang === "nl" ? threatState.blockedReason : "Anti-DDoS alert: Access is temporarily locked to protect server telemetry.") : t.blockedReason}
          </p>

          {/* Massively visual physical countdown card */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center gap-1.5 mt-6">
            <span className="text-6xl font-black font-mono tracking-tight text-red-500 animate-pulse">
              {blockedCountdown}s
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {t.cooldownPeriod}
            </span>
          </div>

          <p className="text-slate-600 text-[10px] leading-normal uppercase tracking-widest pt-4 font-mono font-bold">
            {t.securityTitle}
          </p>
        </div>
      </div>
    );
  }

  // Render Screens based on active Mode
  if (mode === "join") {
    return (
      <QuizJoin
        lang={lang}
        onJoined={(sessionId, nick) => {
          setActiveSessionId(sessionId);
          setPlayerNickname(nick);
          setMode("playing");
        }}
        onBack={() => setMode(null)}
      />
    );
  }

  if (mode === "playing") {
    return (
      <GamePlayer
        lang={lang}
        sessionId={activeSessionId}
        nickname={playerNickname}
        onExit={() => {
          setMode(null);
          setActiveSessionId("");
          setPlayerNickname("");
        }}
      />
    );
  }

  if (mode === "manage") {
    return (
      <QuizManager
        lang={lang}
        onHostGame={(quiz) => {
          const lastExit = localStorage.getItem("last_session_exit_timestamp");
          const lastStart = localStorage.getItem("last_session_start_timestamp");
          const now = Date.now();
          if (lastExit && now - Number(lastExit) < 10000) {
            const secondsLeft = Math.ceil((10000 - (now - Number(lastExit))) / 1000);
            alert(t.waitExit.replace("{seconds}", String(secondsLeft)));
            return;
          }
          if (lastStart && now - Number(lastStart) < 15000) {
            const secondsLeft = Math.ceil((15000 - (now - Number(lastStart))) / 1000);
            alert(t.waitStart.replace("{seconds}", String(secondsLeft)));
            return;
          }
          localStorage.setItem("last_session_start_timestamp", String(now));
          setActiveQuiz(quiz);
          setMode("hosting");
        }}
        onBack={() => setMode(null)}
      />
    );
  }

  if (mode === "hosting" && activeQuiz) {
    return (
      <GameHost
        lang={lang}
        quiz={activeQuiz}
        onExit={() => {
          localStorage.setItem("last_session_exit_timestamp", String(Date.now()));
          setMode("manage");
          setActiveQuiz(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-slate-900 dark:text-white flex flex-col font-sans selection:bg-purple-200 dark:selection:bg-purple-900 relative">
      
      {/* Modern Minimal Header */}
      <header className="px-6 md:px-12 py-6 w-full flex items-center justify-between z-50 relative sticky top-0 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-600/30">
            K
          </div>
          <span className="font-extrabold font-display text-xl tracking-tight">
            Kahoti
          </span>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50">
          <button
            onClick={() => { setLang("nl"); localStorage.setItem("kahoti_lang", "nl"); }}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${lang === "nl" ? "bg-white dark:bg-slate-800 shadow-sm text-purple-600 dark:text-purple-400" : "text-slate-500 opacity-60 hover:opacity-100"}`}
            title="Nederlands"
          >
            NL
          </button>
          <button
            onClick={() => { setLang("en"); localStorage.setItem("kahoti_lang", "en"); }}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${lang === "en" ? "bg-white dark:bg-slate-800 shadow-sm text-purple-600 dark:text-purple-400" : "text-slate-500 opacity-60 hover:opacity-100"}`}
            title="English"
          >
            EN
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative z-10 flex flex-col">
        {/* Purple Gradient Hero Section */}
        <section className="relative w-full py-20 lg:py-32 flex flex-col items-center justify-center text-center overflow-hidden min-h-[70vh]">
          {/* Absolute Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-950 z-0" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0 mix-blend-overlay" />
          
          <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-purple-100 font-bold text-xs uppercase tracking-widest mb-8 backdrop-blur-md shadow-lg">
                <Sparkles className="w-4 h-4" /> The Next-Gen Platform
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-[6.5rem] font-black font-display tracking-tighter leading-[1.05] mb-6 text-white drop-shadow-xl">
                {t.subtitle}
              </h1>
              
              <p className="text-xl md:text-2xl text-purple-100/90 font-medium leading-relaxed max-w-3xl mb-12 drop-shadow-md">
                {t.tagline}
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center gap-6 mt-4 w-full justify-center"
            >
              <button
                onClick={() => setMode("join")}
                className="group relative flex items-center gap-5 pl-4 pr-10 py-3 rounded-full bg-white text-purple-900 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer overflow-hidden border-2 border-white"
              >
                <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-white transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-inner">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xl font-black uppercase tracking-widest leading-none mb-1">{t.joinGame}</span>
                  <span className="text-xs font-bold text-purple-900/70">{t.joinGameDesc}</span>
                </div>
              </button>

              <button
                onClick={() => setMode("manage")}
                className="group flex items-center gap-4 px-8 py-5 rounded-full bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-white backdrop-blur-md transition-all shadow-lg hover:shadow-purple-800/50 hover:-translate-y-1 active:translate-y-0 cursor-pointer"
              >
                <Database className="w-6 h-6 text-purple-300 group-hover:text-white transition-colors" />
                <div className="flex flex-col text-left">
                  <span className="text-lg font-bold tracking-wide leading-none mb-1">{t.manageQuizzes}</span>
                  <span className="text-xs font-bold text-purple-300">{t.hostBtn}</span>
                </div>
              </button>
            </motion.div>
          </div>
          
          {/* Decorative wave divider */}
          <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-none z-10">
            <svg className="block w-full h-[60px] md:h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,121.32,196.36,108.68,239.37,100.41,280.93,76.54,321.39,56.44Z" className="fill-white dark:fill-[#050505]"></path>
            </svg>
          </div>
        </section>

        {/* Content Section: Goals & Who We Are */}
        <section className="py-24 px-6 md:px-12 w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 relative z-10">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-10 md:p-14 border border-slate-200/60 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform duration-300">
            <div className="w-16 h-16 bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
              <Play className="w-8 h-8" />
            </div>
            <h3 className="text-3xl font-black font-display tracking-tight mb-4 text-slate-900 dark:text-white">
              {t.ourGoal}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed font-medium">
              {t.ourGoalDesc}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-10 md:p-14 border border-slate-200/60 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform duration-300">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-3xl font-black font-display tracking-tight mb-4 text-slate-900 dark:text-white">
              {t.whoWeAre}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed font-medium">
              {t.whoWeAreDesc}
            </p>
          </div>
        </section>

      </main>

      <footer className="w-full bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center md:text-left">
            © {new Date().getFullYear()} {t.footer}
          </div>
          
          <div className="flex items-center gap-6 text-sm font-bold text-slate-600 dark:text-slate-400">
            <button onClick={() => setActiveModal("rules")} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors uppercase tracking-wider">
              {t.rules}
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button onClick={() => setActiveModal("privacy")} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors uppercase tracking-wider">
              {t.privacy}
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button onClick={() => setActiveModal("terms")} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors uppercase tracking-wider">
              {t.terms}
            </button>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8">
                <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white mb-4">
                  {activeModal === "rules" && t.rulesTitle}
                  {activeModal === "privacy" && t.privacyTitle}
                  {activeModal === "terms" && t.termsTitle}
                </h3>
                <div className="text-slate-600 dark:text-slate-400 font-medium whitespace-pre-wrap leading-relaxed">
                  {activeModal === "rules" && t.rulesDesc}
                  {activeModal === "privacy" && t.privacyDesc}
                  {activeModal === "terms" && t.termsDesc}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-4 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors uppercase tracking-widest text-sm cursor-pointer"
                >
                  {lang === "nl" ? "Begrepen" : "Understood"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}