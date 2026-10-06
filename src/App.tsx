import { useState, useEffect, useRef } from "react";
import { supabase, subscribeToThreatIntel } from "./supabase";
import QuizJoin from "./components/QuizJoin";
import QuizManager from "./components/QuizManager";
import GameHost from "./components/GameHost";
import GamePlayer from "./components/GamePlayer";
import SnowEffect from "./components/SnowEffect";
import { Quiz } from "./types";
import { Play, Pause, Award, Users, Database, Sun, Moon, ShieldAlert, Sparkles, ArrowRight, Gamepad2, Volume2, VolumeX, Bell, Snowflake, Music } from "lucide-react";
import { translations } from "./translations";
import { sfx } from "./soundManager";
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
    return (localStorage.getItem("kahoti_rep_lang") as "nl" | "en") || "nl";
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

  // Sound Effects State
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    return sfx.isEnabled();
  });
  
  // Snowfall state (active by default for Christmas Event)
  const [showSnow, setShowSnow] = useState(() => {
    return localStorage.getItem("kahoti_snow_enabled") !== "false";
  });

  const toggleSnow = () => {
    const next = !showSnow;
    setShowSnow(next);
    localStorage.setItem("kahoti_snow_enabled", String(next));
    if (next) {
      sfx.playSelectAnswer();
    }
  };

  const [activeModal, setActiveModal] = useState<"rules" | "privacy" | "terms" | null>(null);

  // Background Song (Timeline 1.mp4) State for site entry
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const [bgMusicEnabled, setBgMusicEnabled] = useState(() => {
    return localStorage.getItem("kahoti_bg_music_enabled") !== "false";
  });
  const [bgMusicPlaying, setBgMusicPlaying] = useState(false);

  // Auto-play Timeline 1.mp4 on site entry (landing page, mode === null)
  useEffect(() => {
    const audio = bgMusicRef.current;
    if (!audio) return;
    audio.volume = 0.45;

    // If navigated away from landing page (into game or manager) or disabled, pause music
    if (!bgMusicEnabled || mode !== null) {
      audio.pause();
      setBgMusicPlaying(false);
      return;
    }

    // Try playing immediately upon landing on the site
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setBgMusicPlaying(true);
        })
        .catch(() => {
          // Browser autoplay restriction prevents unmuted playback without prior user gesture.
          // Attach one-time listeners so the song starts on the very first user click/touch/keydown anywhere!
          setBgMusicPlaying(false);
          const handleFirstGesture = () => {
            if (bgMusicRef.current && mode === null && (localStorage.getItem("kahoti_bg_music_enabled") !== "false")) {
              bgMusicRef.current
                .play()
                .then(() => setBgMusicPlaying(true))
                .catch(() => {});
            }
          };
          window.addEventListener("pointerdown", handleFirstGesture, { once: true });
          window.addEventListener("touchstart", handleFirstGesture, { once: true });
          window.addEventListener("keydown", handleFirstGesture, { once: true });
        });
    }
  }, [bgMusicEnabled, mode]);

  const toggleBgMusic = () => {
    const audio = bgMusicRef.current;
    if (!audio) return;
    if (bgMusicPlaying) {
      audio.pause();
      setBgMusicPlaying(false);
      setBgMusicEnabled(false);
      localStorage.setItem("kahoti_bg_music_enabled", "false");
    } else {
      audio
        .play()
        .then(() => {
          setBgMusicPlaying(true);
          setBgMusicEnabled(true);
          localStorage.setItem("kahoti_bg_music_enabled", "true");
        })
        .catch((err) => console.log("Audio play error:", err));
    }
  };

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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-red-900 selection:text-white relative overflow-x-hidden">
      
      {/* Background Song for Site Entry (Timeline 1.mp4) */}
      <audio
        ref={bgMusicRef}
        src="/uploads/Timeline 1.mp4"
        loop
        preload="auto"
        onPlay={() => setBgMusicPlaying(true)}
        onPause={() => setBgMusicPlaying(false)}
      />

      {/* Festive Falling Snow Effect */}
      {showSnow && <SnowEffect count={32} />}

      {/* Christmas Event Active Announcement Banner */}
      <div className="bg-gradient-to-r from-red-950 via-emerald-950 to-red-950 text-amber-200 text-xs font-semibold py-3 px-4 text-center relative z-50 border-b border-red-800/40 flex items-center justify-center gap-2 shadow-sm">
        <Sparkles className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
        <span className="font-bold tracking-wide">{t.christmasActiveNotice || t.nameChangeNotice}</span>
      </div>

      {/* Modern Festive Christmas Header */}
      <header className="px-6 md:px-12 py-5 w-full flex items-center justify-between z-50 relative sticky top-0 bg-slate-950/85 backdrop-blur-xl border-b border-red-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-600/30 border border-white/20">
            🎄
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold font-display text-xl tracking-tight flex items-center gap-1.5 text-white">
              Kahoti-Rep <span className="text-red-400 text-xs px-2 py-0.5 rounded-full bg-red-950 border border-red-800/50 font-bold uppercase tracking-wider">Kerst Event 🎅</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-inner">
          {/* Timeline 1 Background Song Toggle */}
          <button
            onClick={toggleBgMusic}
            className={`px-3 h-8 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer ${
              bgMusicPlaying
                ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-emerald-950/40"
                : "bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200"
            }`}
            title={bgMusicPlaying ? (lang === "nl" ? "Pauzeer Timeline 1 achtergrondmuziek" : "Pause Timeline 1 music") : (lang === "nl" ? "Speel Timeline 1 achtergrondmuziek" : "Play Timeline 1 music")}
          >
            <Music className={`w-3.5 h-3.5 ${bgMusicPlaying ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
            <span className="hidden sm:inline">Timeline 1</span>
            {bgMusicPlaying ? (
              <span className="flex items-end gap-0.5 h-3 ml-0.5">
                <span className="w-0.5 h-2 bg-emerald-400 animate-pulse" style={{ animationDuration: '0.6s' }} />
                <span className="w-0.5 h-3 bg-emerald-300 animate-pulse" style={{ animationDuration: '0.4s' }} />
                <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse" style={{ animationDuration: '0.8s' }} />
              </span>
            ) : (
              <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />
            )}
          </button>

          {/* Quick Jingle Bells Melodie Button */}
          <button
            onClick={() => sfx.playJingleBells()}
            className="px-2.5 h-8 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer"
            title="Speel vrolijke Jingle Bells melodie"
          >
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span className="hidden sm:inline">Jingle Bells</span>
          </button>

          {/* Sneeuwval Toggle Button */}
          <button
            onClick={toggleSnow}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${showSnow ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" : "text-slate-500 opacity-60 hover:opacity-100"}`}
            title={showSnow ? "Sneeuwval uitschakelen" : "Sneeuwval inschakelen"}
          >
            <Snowflake className={`w-4 h-4 ${showSnow ? "animate-spin" : ""}`} style={{ animationDuration: '10s' }} />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          <button
            onClick={() => { setLang("nl"); localStorage.setItem("kahoti_rep_lang", "nl"); }}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${lang === "nl" ? "bg-red-600 shadow-sm text-white" : "text-slate-400 opacity-70 hover:opacity-100"}`}
            title="Nederlands"
          >
            NL
          </button>
          <button
            onClick={() => { setLang("en"); localStorage.setItem("kahoti_rep_lang", "en"); }}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${lang === "en" ? "bg-red-600 shadow-sm text-white" : "text-slate-400 opacity-70 hover:opacity-100"}`}
            title="English"
          >
            EN
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5" />
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-400 transition"
            title={lang === "nl" ? "Donkere / lichte modus" : "Dark / light mode"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              const next = !sfxEnabled;
              sfx.setEnabled(next);
              setSfxEnabled(next);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-400 transition"
            title={lang === "nl" ? (sfxEnabled ? "Geluidseffecten dempen" : "Geluidseffecten inschakelen") : (sfxEnabled ? "Mute sound effects" : "Unmute sound effects")}
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative z-10 flex flex-col">
        {/* Festive Christmas Hero Section */}
        <section className="relative w-full py-20 lg:py-28 flex flex-col items-center justify-center text-center overflow-hidden min-h-[72vh]">
          {/* Absolute Background Gradient with Evergreen & Deep Ruby Velvet Glows */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-slate-950 to-emerald-950 z-0" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none -z-0" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none -z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
          
          <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-200 font-bold text-xs uppercase tracking-widest backdrop-blur-md shadow-lg shadow-red-950/40">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> 🎄 Kerstmis Quiz Special · Editie 2026 ❄️
                </div>
                <button
                  type="button"
                  onClick={toggleBgMusic}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border backdrop-blur-md cursor-pointer ${
                    bgMusicPlaying
                      ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-950/50 hover:bg-emerald-900/80"
                      : "bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                  title={bgMusicPlaying ? "Pauzeer muziek" : "Speel Timeline 1"}
                >
                  <Music className={`w-3.5 h-3.5 ${bgMusicPlaying ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
                  <span>{bgMusicPlaying ? (t.bgMusicPlaying || "🎵 Muziek actief: Timeline 1.mp4") : (t.bgMusicPaused || "▶️ Speel muziek: Timeline 1.mp4")}</span>
                  {bgMusicPlaying && (
                    <span className="flex items-end gap-0.5 h-3 ml-1">
                      <span className="w-0.5 h-2 bg-emerald-400 animate-pulse" style={{ animationDuration: '0.6s' }} />
                      <span className="w-0.5 h-3 bg-emerald-300 animate-pulse" style={{ animationDuration: '0.4s' }} />
                      <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse" style={{ animationDuration: '0.8s' }} />
                    </span>
                  )}
                </button>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-[5.5rem] font-black font-display tracking-tight leading-[1.08] mb-6 text-white drop-shadow-xl">
                {t.subtitle}
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed max-w-3xl mb-12 drop-shadow-md">
                {t.tagline}
              </p>
            </motion.div>

            {/* Action Buttons with Festive Styling */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center gap-6 mt-2 w-full justify-center"
            >
              <button
                onClick={() => {
                  sfx.playSelectAnswer();
                  setMode("join");
                }}
                className="group relative flex items-center gap-5 pl-4 pr-10 py-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white shadow-[0_0_40px_rgba(239,68,68,0.35)] hover:shadow-[0_0_60px_rgba(239,68,68,0.55)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer overflow-hidden border-2 border-red-400"
              >
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-inner">
                  <Gamepad2 className="w-7 h-7 text-white" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xl font-black uppercase tracking-widest leading-none mb-1">{t.joinGame}</span>
                  <span className="text-xs font-bold text-red-100">{t.joinGameDesc}</span>
                </div>
              </button>

              <button
                onClick={() => {
                  sfx.playSelectAnswer();
                  setMode("manage");
                }}
                className="group flex items-center gap-4 px-8 py-5 rounded-full bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-100 backdrop-blur-md transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-emerald-800/50 hover:-translate-y-1 active:translate-y-0 cursor-pointer"
              >
                <Database className="w-6 h-6 text-emerald-300 group-hover:text-white transition-colors" />
                <div className="flex flex-col text-left">
                  <span className="text-lg font-bold tracking-wide leading-none mb-1">{t.manageQuizzes}</span>
                  <span className="text-xs font-bold text-emerald-300">{t.hostBtn}</span>
                </div>
              </button>
            </motion.div>
          </div>
          
          {/* Decorative wave divider */}
          <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-none z-10">
            <svg className="block w-full h-[60px] md:h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,121.32,196.36,108.68,239.37,100.41,280.93,76.54,321.39,56.44Z" className="fill-slate-950"></path>
            </svg>
          </div>
        </section>

        {/* Content Section: Goals & Who We Are with Festive Touches */}
        <section className="py-20 px-6 md:px-12 w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-16 relative z-10">
          <div className="bg-slate-900/60 rounded-[2.5rem] p-10 md:p-12 border border-red-900/40 shadow-xl shadow-red-950/20 hover:-translate-y-1 transition-transform duration-300 backdrop-blur-md">
            <div className="w-16 h-16 bg-red-950/60 border border-red-800/50 text-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm text-3xl">
              🎁
            </div>
            <h3 className="text-2xl font-black font-display tracking-tight mb-3 text-white flex items-center gap-2">
              {t.ourGoal}
            </h3>
            <p className="text-slate-300 text-base leading-relaxed font-medium">
              {t.ourGoalDesc}
            </p>
          </div>

          <div className="bg-slate-900/60 rounded-[2.5rem] p-10 md:p-12 border border-emerald-900/40 shadow-xl shadow-emerald-950/20 hover:-translate-y-1 transition-transform duration-300 backdrop-blur-md">
            <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm text-3xl">
              🎄
            </div>
            <h3 className="text-2xl font-black font-display tracking-tight mb-3 text-white flex items-center gap-2">
              {t.whoWeAre}
            </h3>
            <p className="text-slate-300 text-base leading-relaxed font-medium">
              {t.whoWeAreDesc}
            </p>
          </div>
        </section>
      </main>

      <footer className="w-full bg-slate-900 border-t border-slate-800 py-12 px-6">
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