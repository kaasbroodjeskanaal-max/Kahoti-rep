import { useState, useEffect } from "react";
import { supabase, subscribeToThreatIntel } from "./supabase";
import QuizJoin from "./components/QuizJoin";
import QuizManager from "./components/QuizManager";
import GameHost from "./components/GameHost";
import GamePlayer from "./components/GamePlayer";
import { Quiz } from "./types";
import { Play, Award, Loader2, Users, Database, Sun, Moon, ShieldAlert } from "lucide-react";

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
  const [mode, setMode] = useState<null | "join" | "manage" | "playing" | "hosting">(null);

  // Active Session Details
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [playerNickname, setPlayerNickname] = useState("");

  // Darkmode State
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("quiz_dark_mode") === "true";
  });

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
            🚨 DDoS & Spam Shield Actief
          </span>
          <h1 className="text-3xl font-black font-display text-white tracking-tight">
            Verzoek Snelheidslimiet Overschreden
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed font-sans">
            {threatState.blockedReason || "Het systeem heeft een ongebruikelijk hoge activiteit gedetecteerd vanaf deze browser. De client is tijdelijk geblokkeerd om serveroverbelasting en onnodig egress-verbruik te voorkomen."}
          </p>

          {/* Massively visual physical countdown card */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center gap-1.5 mt-6">
            <span className="text-6xl font-black font-mono tracking-tight text-red-500 animate-pulse">
              {blockedCountdown}s
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Tijdelijke Afkoelperiode Actief
            </span>
          </div>

          <p className="text-slate-600 text-[10px] leading-normal uppercase tracking-widest pt-4 font-mono font-bold">
            Kahoti Systeembeveiliging & DDoS Beheersing
          </p>
        </div>
      </div>
    );
  }

  // Render Screens based on active Mode
  if (mode === "join") {
    return (
      <QuizJoin
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
        onHostGame={(quiz) => {
          const lastExit = localStorage.getItem("last_session_exit_timestamp");
          const lastStart = localStorage.getItem("last_session_start_timestamp");
          const now = Date.now();
          if (lastExit && now - Number(lastExit) < 10000) {
            const secondsLeft = Math.ceil((10000 - (now - Number(lastExit))) / 1000);
            alert(`Niet zo snel! Je hebt net een live sessie gestorven/gestopt. Wacht nog ${secondsLeft} seconden om een nieuwe op te starten.`);
            return;
          }
          if (lastStart && now - Number(lastStart) < 15000) {
            const secondsLeft = Math.ceil((15000 - (now - Number(lastStart))) / 1000);
            alert(`Snelheidslimiet! Wacht nog ${secondsLeft} seconden tussen het herhaaldelijk openen/hosten van live quizzen.`);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-100 font-sans transition-colors duration-250 relative">
      {/* Floating Dark Mode Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center"
          title={isDark ? "Lichte modus" : "Donkere modus"}
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-500 animate-[spin_5s_linear_infinite]" /> : <Moon className="w-5 h-5 text-indigo-500" />}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 flex-1 flex flex-col justify-center items-center text-center">
        {/* Subtle glowing element */}
        <div className="relative mb-6 flex justify-center">
          <div className="absolute inset-0 bg-indigo-500/25 blur-3xl rounded-full scale-110" />
          <img 
            src="https://cdn.imageurlgenerator.com/uploads/9df1cd72-ee23-4abc-8f99-c7bf3a38bebc.jpeg"
            alt="Kahoti Logo"
            className="relative w-32 h-32 md:w-40 md:h-40 object-cover rounded-3xl border-4 border-white dark:border-slate-800 shadow-xl"
            referrerPolicy="no-referrer"
          />
        </div>

        <h1 className="text-6xl md:text-8xl font-extrabold font-display tracking-tight text-indigo-600 dark:text-indigo-400 leading-tight mb-3">
          Kahoti
        </h1>
        <h2 className="text-2xl md:text-4xl font-bold font-display text-slate-800 dark:text-white mb-6">
          Realtime Quiz Builder & Playroom
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl max-w-xl mb-12">
          De ultieme Kahoot-stijl quizervaring! Maak eenvoudig eigen quizzen met afbeeldingen, deel de code en ontdek wie de slimste is op het realtime leaderboard.
        </p>

        {/* Home Navigation Options */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl font-display">
          {/* Card: Join Game */}
          <button
            onClick={() => setMode("join")}
            className="group bg-linear-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white p-8 rounded-3xl text-left border border-indigo-400 shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 cursor-pointer flex flex-col justify-between min-h-[220px]"
          >
            <div>
              <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4 group-hover:bg-white/30 transition">
                <Play className="w-8 h-8 fill-current" />
              </div>
              <h2 className="text-3xl font-black mb-2">Meedoen aan Spel</h2>
              <p className="text-indigo-100 text-sm font-sans">Aanmelden met Spelcode en live meespelen met de rest.</p>
            </div>
            <span className="text-indigo-50 text-sm font-bold mt-4 flex items-center gap-1 group-hover:translate-x-2 transition-transform">
              Ga spelen →
            </span>
          </button>

          {/* Card: Create & Host */}
          <button
            onClick={() => setMode("manage")}
            className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-100 p-8 rounded-3xl text-left border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 cursor-pointer flex flex-col justify-between min-h-[220px]"
          >
            <div>
              <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <Database className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black mb-2">Quizzen beheren</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-sans">Quizzen ontwerpen met afbeeldingen en direct hosten.</p>
            </div>
            <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold mt-4 flex items-center gap-1 group-hover:translate-x-2 transition-transform">
              Zelf hosten →
            </span>
          </button>
        </div>

        {/* Feature list showcase */}
        <div className="mt-20 border-t border-slate-200 dark:border-slate-800 w-full pt-12 grid grid-cols-2 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
          <div className="flex gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl h-fit shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base font-display">Realtime Sync</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-sans mt-1">Spelers antwoorden synchroon en direct.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="p-3 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 rounded-2xl h-fit shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base font-display">Leaderboard</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-sans mt-1">Punten en streaks na elke gestelde vraag.</p>
            </div>
          </div>
          <div className="flex gap-4 col-span-2 md:col-span-1">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl h-fit shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base font-display">Supabase SQL</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-sans mt-1">Uiterst stabiele opslag met PostgreSQL.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400 dark:text-slate-500 font-medium">
        © {new Date().getFullYear()} Kahoti. Gebouwd met Supabase & PostgreSQL.
      </footer>
    </div>
  );
}
