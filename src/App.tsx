import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import QuizJoin from "./components/QuizJoin";
import QuizManager from "./components/QuizManager";
import GameHost from "./components/GameHost";
import GamePlayer from "./components/GamePlayer";
import { Quiz } from "./types";
import { Play, Award, Loader2, Users, Database } from "lucide-react";

export default function App() {
  const [mode, setMode] = useState<null | "join" | "manage" | "playing" | "hosting">(null);

  // Active Session Details
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [playerNickname, setPlayerNickname] = useState("");

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
          setMode("manage");
          setActiveQuiz(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-[85vh] bg-slate-50 flex flex-col justify-between selection:bg-indigo-100 font-sans">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 flex-1 flex flex-col justify-center items-center text-center">
        {/* Subtle glowing element */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full" />
          <span className="relative text-5xl md:text-6xl" role="img" aria-label="quiz logo">
            🎉
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold font-display tracking-tight text-slate-800 leading-tight mb-4 max-w-2xl">
          Realtime Quiz Builder & Playroom
        </h1>
        <p className="text-gray-500 text-base md:text-lg max-w-xl mb-12">
          De ultieme Kahoot-stijl quizervaring! Maak eenvoudig eigen quizzen handmatig, deel de code en spoor direct wie de slimste is op het realtime leaderboard.
        </p>

        {/* Home Navigation Options */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Card: Join Game */}
          <button
            onClick={() => setMode("join")}
            className="group bg-linear-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white p-8 rounded-3xl text-left border-b-6 border-indigo-700 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 cursor-pointer flex flex-col justify-between min-h-[170px]"
          >
            <div>
              <div className="inline-flex p-2.5 bg-white/10 rounded-xl mb-4 group-hover:bg-white/15 transition">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <h2 className="text-2xl font-black font-display mb-1">Meedoen aan Spel</h2>
              <p className="text-indigo-100 text-xs">Aanmelden met Spelcode en live meespelen.</p>
            </div>
            <span className="text-indigo-100 text-sm font-bold mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Ga spelen →
            </span>
          </button>

          {/* Card: Create & Host */}
          <button
            onClick={() => setMode("manage")}
            className="group bg-white hover:bg-slate-50 text-slate-800 p-8 rounded-3xl text-left border border-slate-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 cursor-pointer flex flex-col justify-between min-h-[170px]"
          >
            <div>
              <div className="inline-flex p-2.5 bg-indigo-50 text-indigo-600 rounded-xl mb-4">
                <Database className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black font-display mb-1">Quizzen beheren</h2>
              <p className="text-gray-500 text-xs">Quizzen handmatig ontwerpen en direct live hosten.</p>
            </div>
            <span className="text-indigo-600 text-sm font-bold mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Zelf hosten →
            </span>
          </button>
        </div>

        {/* Feature list showcase */}
        <div className="mt-16 border-t border-slate-200 w-full pt-10 grid grid-cols-2 md:grid-cols-3 gap-6 text-left max-w-3xl">
          <div className="flex gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl h-fit shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">Realtime Sync</h4>
              <p className="text-gray-400 text-xs font-sans mt-0.5">Spelers antwoorden synchroon en direct.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl h-fit shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">Leaderboard</h4>
              <p className="text-gray-400 text-xs font-sans mt-0.5">Punten en streaks na elke gestelde vraag.</p>
            </div>
          </div>
          <div className="flex gap-3 col-span-2 md:col-span-1">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl h-fit shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">Supabase SQL</h4>
              <p className="text-gray-400 text-xs font-sans mt-0.5">Uiterst stabiele opslag met PostgreSQL.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-6 border-t border-slate-200 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Realtime Quiz. Gebouwd met Supabase & PostgreSQL.
      </footer>
    </div>
  );
}
