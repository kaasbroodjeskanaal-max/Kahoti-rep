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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-100 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 flex-1 flex flex-col justify-center items-center text-center">
        {/* Subtle glowing element */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
          <span className="relative text-6xl md:text-7xl" role="img" aria-label="quiz logo">
            🎉
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold font-display tracking-tight text-slate-800 leading-tight mb-6 max-w-3xl">
          Realtime Quiz Builder & Playroom
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-xl mb-12">
          De ultieme Kahoot-stijl quizervaring! Maak eenvoudig eigen quizzen met afbeeldingen, deel de code en ontdek wie de slimste is op het realtime leaderboard.
        </p>

        {/* Home Navigation Options */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
          {/* Card: Join Game */}
          <button
            onClick={() => setMode("join")}
            className="group bg-linear-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white p-8 rounded-3xl text-left border border-indigo-400 shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 cursor-pointer flex flex-col justify-between min-h-[220px]"
          >
            <div>
              <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4 group-hover:bg-white/30 transition">
                <Play className="w-8 h-8 fill-current" />
              </div>
              <h2 className="text-3xl font-black font-display mb-2">Meedoen aan Spel</h2>
              <p className="text-indigo-100 text-sm">Aanmelden met Spelcode en live meespelen met de rest.</p>
            </div>
            <span className="text-indigo-50 text-sm font-bold mt-4 flex items-center gap-1 group-hover:translate-x-2 transition-transform">
              Ga spelen →
            </span>
          </button>

          {/* Card: Create & Host */}
          <button
            onClick={() => setMode("manage")}
            className="group bg-white hover:bg-slate-50 text-slate-800 p-8 rounded-3xl text-left border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 cursor-pointer flex flex-col justify-between min-h-[220px]"
          >
            <div>
              <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <Database className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black font-display mb-2">Quizzen beheren</h2>
              <p className="text-gray-500 text-sm">Quizzen ontwerpen met afbeeldingen en direct hosten.</p>
            </div>
            <span className="text-indigo-600 text-sm font-bold mt-4 flex items-center gap-1 group-hover:translate-x-2 transition-transform">
              Zelf hosten →
            </span>
          </button>
        </div>

        {/* Feature list showcase */}
        <div className="mt-20 border-t border-slate-200 w-full pt-12 grid grid-cols-2 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
          <div className="flex gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl h-fit shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base font-display">Realtime Sync</h4>
              <p className="text-slate-500 text-sm font-sans mt-1">Spelers antwoorden synchroon en direct.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl h-fit shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base font-display">Leaderboard</h4>
              <p className="text-slate-500 text-sm font-sans mt-1">Punten en streaks na elke gestelde vraag.</p>
            </div>
          </div>
          <div className="flex gap-4 col-span-2 md:col-span-1">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl h-fit shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base font-display">Supabase SQL</h4>
              <p className="text-slate-500 text-sm font-sans mt-1">Uiterst stabiele opslag met PostgreSQL.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-8 border-t border-slate-200 text-center text-sm text-slate-400 font-medium">
        © {new Date().getFullYear()} Realtime Quiz. Gebouwd met Supabase & PostgreSQL.
      </footer>
    </div>
  );
}
