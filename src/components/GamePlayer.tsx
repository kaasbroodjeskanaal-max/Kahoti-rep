import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { GameSession, Player, Question } from "../types";
import { Check, X, Award, Loader2, Sparkles, LogOut, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GamePlayerProps {
  sessionId: string;
  nickname: string;
  onExit: () => void;
}

export default function GamePlayer({ sessionId, nickname, onExit }: GamePlayerProps) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [self, setSelf] = useState<Player | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playerUid, setPlayerUid] = useState<string>("");

  // Get active user ID securely using Supabase auth with dynamic local storage fallback
  useEffect(() => {
    async function loadUser() {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.user?.id) {
        setPlayerUid(authSession.user.id);
      } else {
        let localId = localStorage.getItem("quiz_player_uuid");
        if (!localId) {
          localId = `anon_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
          localStorage.setItem("quiz_player_uuid", localId);
        }
        setPlayerUid(localId);
      }
    }
    loadUser();
  }, []);

  const fetchSessionAndSelf = async () => {
    if (!sessionId || !playerUid) return;
    try {
      // 1. Fetch Session Details
      const { data: sessionData, error: sErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sErr || !sessionData) {
        alert("Plaatsen mislukt: De host heeft deze quizsessie afgesloten of de sessie bestaat niet meer.");
        onExit();
        return;
      }

      setSession({
        id: sessionData.id,
        hostId: sessionData.host_id,
        code: sessionData.code,
        status: sessionData.status,
        quizId: sessionData.quiz_id,
        quizTitle: sessionData.quiz_title,
        currentQuestionIndex: sessionData.current_question_index,
        questionStartTime: sessionData.question_start_time,
        questionDuration: sessionData.question_duration,
        totalQuestions: sessionData.total_questions,
      });

      // 2. Fetch Quiz questions if not cached yet
      if (questions.length === 0 && sessionData.quiz_id) {
        const { data: quizData, error: qErr } = await supabase
          .from("quizzes")
          .select("questions")
          .eq("id", sessionData.quiz_id)
          .single();
        if (!qErr && quizData) {
          setQuestions(quizData.questions || []);
        }
      }

      // 3. Fetch Player Self info
      const { data: playerData, error: pErr } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerUid)
        .eq("session_id", sessionId)
        .single();

      if (!pErr && playerData) {
        setSelf({
          id: playerData.id,
          nickname: playerData.nickname,
          score: playerData.score ?? 0,
          streak: playerData.streak ?? 0,
          currentAnswerIndex: playerData.current_answer_index,
          currentAnswerTime: playerData.current_answer_time,
          isHost: playerData.is_host,
          joinedAt: playerData.joined_at,
        });
        setHasAnswered(playerData.current_answer_index !== null);
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Fout tijdens ophalen spelerdata:", err);
    }
  };

  // 1. Double layer realtime updates: Periodical Polling fallback + Realtime listener
  useEffect(() => {
    if (!sessionId || !playerUid) return;

    fetchSessionAndSelf();
    const interval = setInterval(fetchSessionAndSelf, 1500);

    const realtimeChannel = supabase
      .channel(`session-player-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        () => fetchSessionAndSelf()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `id=eq.${playerUid}` },
        () => fetchSessionAndSelf()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(realtimeChannel);
    };
  }, [sessionId, playerUid]);

  // Handle countdown resets
  useEffect(() => {
    if (session?.status === "countdown") {
      setHasAnswered(false);
    }
  }, [session?.status, session?.currentQuestionIndex]);

  // Answer submission Handler
  const handleSelectOption = async (optionIdx: number) => {
    if (hasAnswered || !session || !playerUid) return;

    try {
      const startTimeStamp = session.questionStartTime ? new Date(session.questionStartTime).getTime() : Date.now();
      const reactionDelay = Date.now() - startTimeStamp;

      setHasAnswered(true);

      const { error } = await supabase
        .from("players")
        .update({
          current_answer_index: optionIdx,
          current_answer_time: reactionDelay,
        })
        .eq("id", playerUid)
        .eq("session_id", sessionId);

      if (error) throw new Error(error.message);
    } catch (err) {
      console.error("Fout bij indienen antwoord:", err);
    }
  };

  const currentQuestionIdx = session?.currentQuestionIndex ?? 0;
  const activeQuestion = questions[currentQuestionIdx];

  const optionColors = [
    "bg-red-500 hover:bg-red-600 active:bg-red-750",
    "bg-blue-500 hover:bg-blue-600 active:bg-blue-750",
    "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700",
    "bg-green-500 hover:bg-green-600 active:bg-green-750",
  ];

  const shapes = ["▲", "♦", "●", "■"];

  return (
    <div className="min-h-[85vh] bg-slate-50 flex flex-col justify-between p-4 font-sans selection:bg-indigo-100">
      {isLoading || !playerUid ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Deelnemen aan spel...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* LOBBY WAITING SCREEN */}
          {session?.status === "lobby" && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto py-10"
            >
              <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 text-3xl font-black shadow-xs">
                {nickname.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-750 font-bold text-xs rounded-full uppercase tracking-wider">
                  Ingelogd als {nickname}
                </span>
                <h1 className="text-2xl font-black font-display text-slate-800">
                  Je bent binnen!
                </h1>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  Wacht geduldig tot de host het spel start. Je naam verschijnt op het grote scherm!
                </p>
              </div>

              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-3 rounded-2xl border border-indigo-100 font-bold justify-center font-mono w-full">
                Code: {session.code.slice(0, 3)} {session.code.slice(3)}
              </div>

              <button
                onClick={onExit}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer pt-6"
              >
                <LogOut className="w-3.5 h-3.5" /> Lobby verlaten
              </button>
            </motion.div>
          )}

          {/* COUNTDOWN PREPARATION TIMERS */}
          {session?.status === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-12"
            >
              <div className="text-lg font-bold text-indigo-600 tracking-wider uppercase">Maak je klaaarr!</div>
              <h1 className="text-4xl font-black font-display text-slate-850">
                Vraag {currentQuestionIdx + 1} komt eraan
              </h1>
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-md animate-ping text-white text-3xl font-black">
                ⏱
              </div>
            </motion.div>
          )}

          {/* ACTIVE QUESTION OPTIONS INPUT PANEL */}
          {session?.status === "question" && activeQuestion && (
            <motion.div
              key="question"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col justify-between space-y-4"
            >
              {/* Top brief */}
              <div className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Vraag {currentQuestionIdx + 1}</p>
                  <h3 className="font-bold text-slate-800 font-display text-base md:text-lg line-clamp-1">
                    {activeQuestion.questionText}
                  </h3>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl text-indigo-700 font-bold font-mono text-sm flex items-center gap-1 shrink-0">
                  <Clock className="w-4 h-4" /> {activeQuestion.timeLimit}s
                </div>
              </div>

              {/* Action Buttons Interface */}
              {!hasAnswered ? (
                <div className="flex-1 grid grid-cols-2 gap-3 pb-4">
                  {activeQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full rounded-3xl text-white font-display text-3xl font-black flex flex-col items-center justify-center p-6 gap-2 border-b-6 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${optionColors[idx]}`}
                    >
                      <span className="text-5xl">{shapes[idx]}</span>
                      <span className="text-sm font-bold block max-w-full truncate px-2 leading-normal">
                        {option}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                /* WAITING TIMER STATE FOR FASTER RESPONDERS */
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 bg-white border border-slate-100 rounded-3xl p-8 shadow-xs">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold animate-bounce">
                    ✓
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 font-display">Antwoord ingediend!</h3>
                  <p className="text-gray-500 text-sm max-w-xs">
                    Je was supersnel! Wacht even tot de rest klaar is of de tijd afloopt.
                  </p>
                  <Loader2 className="w-6 h-6 animate-spin text-slate-350" />
                </div>
              )}
            </motion.div>
          )}

          {/* QUESTION RESULT SCREEN: SHOW CORRECTNESS */}
          {session?.status === "show_answer" && activeQuestion && self && (
            <motion.div
              key="show_answer"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col justify-center max-w-md mx-auto py-6"
            >
              {self.currentAnswerIndex === activeQuestion.correctOptionIndex ? (
                /* CORRECT ANSWER DESIGN */
                <div className="bg-emerald-500 border-b-8 border-emerald-600 rounded-3xl p-8 text-white text-center space-y-6 shadow-md">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-extrabold mx-auto animate-bounce">
                    <Check className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black font-display">Correct geantwoord!</h2>
                    <p className="text-emerald-100 font-semibold text-sm">
                      Mooi gewerkt! Jouw reflexen zijn geweldig.
                    </p>
                  </div>

                  <div className="bg-emerald-600/45 p-4 rounded-2xl border border-white/10 inline-block">
                    <p className="text-xs text-emerald-250">Punten & Streak update</p>
                    <h3 className="text-2xl font-mono font-bold text-white flex items-center gap-1 justify-center">
                      <Sparkles className="w-5 h-5 text-yellow-300 inline animate-spin-slow" /> +{self.score > 0 ? "Berekend door host" : "..."}
                    </h3>
                  </div>

                  {self.streak > 1 && (
                    <div className="bg-orange-600/90 py-2 border border-orange-500 rounded-full inline-block px-4 text-xs font-black uppercase text-white animate-pulse">
                      🔥 {self.streak} Vragen Streak!
                    </div>
                  )}
                </div>
              ) : (
                /* INCORRECT / UNANSWERED DESIGN */
                <div className="bg-red-500 border-b-8 border-red-600 rounded-3xl p-8 text-white text-center space-y-6 shadow-md">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-extrabold mx-auto">
                    <X className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black font-display">
                      {self.currentAnswerIndex === null ? "Te laat!" : "Helaas, onjuist!"}
                    </h2>
                    <p className="text-red-100 text-sm">
                      Het juiste antwoord was: <span className="font-bold underline">{activeQuestion.options[activeQuestion.correctOptionIndex]}</span>
                    </p>
                  </div>

                  <div className="bg-red-650/40 p-4 rounded-xl border border-white/10 text-xs">
                    Volgende vraag beter! Neem de tijd om aandachtig te lezen.
                  </div>
                </div>
              )}

              <p className="text-center text-gray-400 text-xs mt-6">Kijk op het grote scherm van de host voor de scoreverdeling!</p>
            </motion.div>
          )}

          {/* INTER LEVEL WAITING BOARD */}
          {session?.status === "leaderboard" && self && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto py-8"
            >
              <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <p className="text-indigo-600 text-sm font-extrabold tracking-wider uppercase">Tussenstand</p>
                <h2 className="text-3xl font-black font-display text-slate-800">
                  Mijn Score: {self.score} pt
                </h2>
                <p className="text-gray-500 text-sm">
                  De host toont nu de top 5 op het grote scherm. Maak je klaar voor de volgende ronde!
                </p>
              </div>

              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 text-sm rounded-full border border-indigo-150 font-bold justify-center font-mono animate-pulse">
                Huidige streak: {self.streak} 🔥
              </div>
            </motion.div>
          )}

          {/* FINAL RESULTS GRAPH/PODIUM CLIENT DISPLAY */}
          {session?.status === "ended" && self && (
            <motion.div
              key="ended"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto py-10"
            >
              <div className="w-24 h-24 bg-yellow-50 border border-yellow-100 rounded-full flex items-center justify-center text-yellow-500 shadow-md">
                <Award className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-black font-display text-slate-800">Einde van de Quiz!</h1>
                <p className="text-gray-500 text-sm">
                  De quiz is afgelopen. Bekijk het podium op het scherm van de host om te zien of je de top 3 hebt bereikt!
                </p>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-5 w-full space-y-1 border-b-4 border-slate-950 shadow-sm font-display">
                <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Mijn Eindscore</p>
                <h2 className="text-3xl font-black font-mono text-white">{self.score} pt</h2>
              </div>

              <button
                onClick={onExit}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold tracking-wide transition cursor-pointer shadow-md"
              >
                Sluiten en Terug
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
