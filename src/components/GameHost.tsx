import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { Quiz, GameSession, Player } from "../types";
import { Users, Play, Award, ArrowRight, RefreshCw, LogOut, Check, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GameHostProps {
  quiz: Quiz;
  onExit: () => void;
}

export default function GameHost({ quiz, onExit }: GameHostProps) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [code, setCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  const [isInitializing, setIsInitializing] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Game Session on Mount
  useEffect(() => {
    const createSession = async () => {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const generatedSessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      try {
        const { error } = await supabase.from("sessions").insert({
          id: generatedSessionId,
          host_id: "host_user", // Simplified host user ID
          code: generatedCode,
          status: "lobby",
          quiz_id: quiz.id,
          quiz_title: quiz.title,
          current_question_index: 0,
          question_start_time: null,
          question_duration: quiz.questions[0]?.timeLimit || 20,
          total_questions: quiz.questions.length,
        });

        if (error) throw new Error(error.message);

        setCode(generatedCode);
        setSessionId(generatedSessionId);
      } catch (err) {
        console.error("Fout bij aanmaken sessie:", err);
      }
    };

    createSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quiz]);

  // Dual-Layer Synchronisation: Realtime Channel + Periodic Polling (Guarantees reliability)
  const fetchSessionAndPlayers = async () => {
    if (!sessionId) return;
    try {
      // 1. Fetch Session
      const { data: sessionData, error: sErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!sErr && sessionData) {
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
        setIsInitializing(false);
      }

      // 2. Fetch Players
      const { data: playersData, error: pErr } = await supabase
        .from("players")
        .select("*")
        .eq("session_id", sessionId);

      if (!pErr && playersData) {
        const list: Player[] = playersData.map((p: any) => ({
          id: p.id,
          nickname: p.nickname,
          score: p.score ?? 0,
          streak: p.streak ?? 0,
          currentAnswerIndex: p.current_answer_index,
          currentAnswerTime: p.current_answer_time,
          isHost: p.is_host,
          joinedAt: p.joined_at,
        }));
        setPlayers(list);
      }
    } catch (err) {
      console.error("Fout tijdens data synchronisatie:", err);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    fetchSessionAndPlayers();
    const interval = setInterval(fetchSessionAndPlayers, 1500);

    // Dynamic Realtime connection
    const realtimeChannel = supabase
      .channel(`session-host-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        () => fetchSessionAndPlayers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `session_id=eq.${sessionId}` },
        () => fetchSessionAndPlayers()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(realtimeChannel);
    };
  }, [sessionId]);

  // 3. Game State Managers & Clock Counters
  const currentQuestion = session ? quiz.questions[session.currentQuestionIndex] : null;

  // Active Timer counting down the seconds during the "question" state
  useEffect(() => {
    if (!session || !currentQuestion) return;

    if (session.status === "question") {
      setTimeLeft(currentQuestion.timeLimit);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            autoTransitionToAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status, session?.currentQuestionIndex]);

  // Read answer submissions in real time
  const totalActives = players.length;
  const answeredCount = players.filter((p) => p.currentAnswerIndex !== null).length;

  // Auto transition to SHOW_ANSWER if everyone has responded
  useEffect(() => {
    if (session?.status === "question" && totalActives > 0 && answeredCount === totalActives) {
      if (timerRef.current) clearInterval(timerRef.current);
      autoTransitionToAnswer();
    }
  }, [answeredCount, totalActives, session?.status]);

  const autoTransitionToAnswer = async () => {
    if (!sessionId) return;
    try {
      await supabase
        .from("sessions")
        .update({ status: "show_answer" })
        .eq("id", sessionId);
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Custom State Progression Actions
  const handleStartSpel = async () => {
    if (!sessionId || !currentQuestion) return;
    try {
      await supabase
        .from("sessions")
        .update({ status: "countdown" })
        .eq("id", sessionId);

      // Quick countdown delay on big screen
      setTimeout(async () => {
        // Bulk reset player answer inputs for the first question
        await supabase
          .from("players")
          .update({
            current_answer_index: null,
            current_answer_time: null,
          })
          .eq("session_id", sessionId);

        await supabase
          .from("sessions")
          .update({
            status: "question",
            question_start_time: new Date().toISOString(),
            question_duration: currentQuestion.timeLimit,
          })
          .eq("id", sessionId);
      }, 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const calculatePlayerPointsAndStreak = (player: Player) => {
    if (!currentQuestion) return { newScore: player.score, newStreak: 0, pointsEarned: 0 };

    const isCorrect = player.currentAnswerIndex === currentQuestion.correctOptionIndex;
    let pointsEarned = 0;

    if (isCorrect) {
      const maxPoints = currentQuestion.points;
      const basePoints = maxPoints * 0.5;
      const speedRatio = Math.max(0, 1 - (player.currentAnswerTime || 0) / (currentQuestion.timeLimit * 1000));
      pointsEarned = Math.round(basePoints + basePoints * speedRatio);
    }

    const newStreak = isCorrect ? player.streak + 1 : 0;
    const streakBonus = newStreak > 2 ? Math.min((newStreak - 2) * 50, 250) : 0;
    const finalEarned = pointsEarned > 0 ? pointsEarned + streakBonus : 0;

    return {
      newScore: player.score + finalEarned,
      newStreak,
      pointsEarned: finalEarned,
    };
  };

  const handleGoToLeaderboard = async () => {
    if (!sessionId || !currentQuestion) return;
    try {
      // Calculate active scores of players on host transitions
      for (const p of players) {
        const { newScore, newStreak } = calculatePlayerPointsAndStreak(p);
        await supabase
          .from("players")
          .update({
            score: newScore,
            streak: newStreak,
          })
          .eq("id", p.id);
      }

      await supabase
        .from("sessions")
        .update({ status: "leaderboard" })
        .eq("id", sessionId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextQuestion = async () => {
    if (!session || !sessionId) return;
    const nextIdx = session.currentQuestionIndex + 1;
    const isLast = nextIdx >= quiz.questions.length;

    try {
      if (isLast) {
        await supabase
          .from("sessions")
          .update({ status: "ended" })
          .eq("id", sessionId);
      } else {
        const nextQ = quiz.questions[nextIdx];

        // Bulk Reset player answers in one query
        await supabase
          .from("players")
          .update({
            current_answer_index: null,
            current_answer_time: null,
          })
          .eq("session_id", sessionId);

        await supabase
          .from("sessions")
          .update({
            current_question_index: nextIdx,
            question_duration: nextQ.timeLimit,
            status: "countdown",
          })
          .eq("id", sessionId);

        setTimeout(async () => {
          await supabase
            .from("sessions")
            .update({
              status: "question",
              question_start_time: new Date().toISOString(),
            })
            .eq("id", sessionId);
        }, 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinishQuiz = async () => {
    if (!sessionId) return;
    try {
      await supabase
        .from("sessions")
        .update({ status: "ended" })
        .eq("id", sessionId);
    } catch (err) {
      console.error(err);
    }
  };

  const getStats = () => {
    const stats = [0, 0, 0, 0];
    players.forEach((p) => {
      if (p.currentAnswerIndex !== null && p.currentAnswerIndex >= 0 && p.currentAnswerIndex <= 3) {
        stats[p.currentAnswerIndex]++;
      }
    });
    return stats;
  };

  const optionColors = [
    "bg-red-500 border-red-700 text-white",
    "bg-blue-500 border-blue-700 text-white",
    "bg-yellow-500 border-yellow-600 text-white",
    "bg-green-500 border-green-700 text-white",
  ];

  const shapes = ["▲", "♦", "●", "■"];

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col justify-between">
      {isInitializing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <RefreshCw className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
          <p className="text-slate-400 font-display text-lg">Opzetten van quizsessie op Supabase...</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="bg-slate-950 px-8 py-4 border-b border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-xs text-indigo-400 tracking-wider font-bold uppercase">Hosten</span>
              <h2 className="text-xl font-bold font-display text-slate-100 line-clamp-1">{quiz.title}</h2>
            </div>
            <button
              onClick={onExit}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Spel Verlaten
            </button>
          </header>

          <main className="flex-1 flex flex-col justify-center max-w-7xl w-full mx-auto p-6 md:p-8 shrink-0">
            <AnimatePresence mode="wait">
              {/* STATUS: LOBBY */}
              {session?.status === "lobby" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8 text-center"
                >
                  <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
                    <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-4 text-center">
                      <p className="text-indigo-400 font-bold uppercase tracking-wider text-sm">Join via deze Spelcode</p>
                      <h1 className="text-7xl font-extrabold font-mono tracking-wider bg-linear-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent select-all">
                        {code.slice(0, 3)} {code.slice(3)}
                      </h1>
                      <div className="text-slate-400 text-sm pt-2">
                        Voer deze 6 cijfers in op de startpagina om deze quiz te betreden.
                      </div>
                    </div>

                    <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-4 text-center">
                      <p className="text-indigo-400 font-bold uppercase tracking-wider text-sm">Spelers in Lobby</p>
                      <h1 className="text-6xl font-extrabold font-display">
                        {players.length}
                      </h1>
                      <button
                        onClick={handleStartSpel}
                        disabled={players.length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-slate-950 py-4 rounded-2xl font-black text-lg cursor-pointer"
                      >
                        <Play className="w-5 h-5 fill-current" /> Start Spel
                      </button>
                    </div>
                  </div>

                  {/* Joined Player Grid */}
                  <div className="bg-slate-950/40 border border-slate-800/60 rounded-3xl p-6 min-h-[250px]">
                    <h3 className="text-slate-400 text-sm font-semibold mb-6 flex items-center gap-2 justify-center">
                      <Users className="w-4 h-4 text-indigo-400" /> DEELNEMERS ({players.length})
                    </h3>
                    {players.length === 0 ? (
                      <div className="text-slate-500 italic py-12">Wacht op spelers...</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2">
                        {players.map((p, idx) => (
                          <motion.div
                            key={p.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-indigo-950/40 border border-indigo-950 px-4 py-3 rounded-2xl text-indigo-200 font-bold font-display flex items-center justify-between text-ellipsis overflow-hidden"
                          >
                            <span className="truncate">{p.nickname}</span>
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STATUS: COUNTDOWN PRE-QUESTION */}
              {session?.status === "countdown" && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-24"
                >
                  <p className="text-indigo-400 text-lg font-bold uppercase tracking-widest mb-4">Volgende Vraag</p>
                  <h3 className="text-3xl font-bold font-display max-w-2xl mx-auto mb-10 text-slate-100">
                    "{currentQuestion?.questionText}"
                  </h3>
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-indigo-500 bg-indigo-950/50 text-6xl font-black font-display animate-pulse text-indigo-300">
                    GO!
                  </div>
                </motion.div>
              )}

              {/* STATUS: QUESTION IN PROGRESS */}
              {session?.status === "question" && currentQuestion && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Top Stats of question */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-950 px-4 py-2.5 rounded-xl border border-indigo-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        <span className="font-mono font-bold text-2xl text-indigo-200">{timeLeft}s</span>
                      </div>
                      <span className="text-slate-400 font-medium">
                        Vraag {session.currentQuestionIndex + 1} / {session.totalQuestions}
                      </span>
                    </div>

                    <div className="bg-slate-950 px-4 py-2 rounded-xl text-slate-400 text-sm font-semibold border border-slate-800">
                      Antwoorden: <span className="text-indigo-400 font-bold text-lg">{answeredCount}</span> / {totalActives}
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl px-8 py-10 text-center space-y-2 shadow-xs">
                    <p className="text-xs text-indigo-400 tracking-widest font-bold uppercase">MEERKEUZEVRAAG</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display leading-snug">
                      {currentQuestion.questionText}
                    </h1>
                  </div>

                  {/* Options Large Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-4 px-6 py-5 rounded-2xl border text-xl font-bold ${optionColors[idx]} font-display`}
                      >
                        <span className="text-2xl">{shapes[idx]}</span>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>

                  {/* Answer Progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${(answeredCount / Math.max(1, totalActives)) * 100}%` }}
                    />
                  </div>
                </motion.div>
              )}

              {/* STATUS: SHOW CORRECT ANSWER WITH CHART */}
              {session?.status === "show_answer" && currentQuestion && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-1">
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Resultaat</span>
                    <h1 className="text-3xl font-black font-display text-white">
                      Correcte antwoord is onthuld!
                    </h1>
                  </div>

                  {/* Question detail */}
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center">
                    <h2 className="text-2xl font-bold font-display text-slate-100">
                      "{currentQuestion.questionText}"
                    </h2>
                  </div>

                  {/* Dynamic Stats Chart & options feedback */}
                  <div className="grid md:grid-cols-2 gap-8 items-center bg-slate-950/50 p-6 md:p-8 border border-slate-800 rounded-3xl">
                    <div className="space-y-4">
                      {getStats().map((votes, idx) => {
                        const isCorrectOption = idx === currentQuestion.correctOptionIndex;
                        const percentage = totalActives > 0 ? (votes / totalActives) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-2">
                             <div className="flex justify-between items-center text-sm font-semibold">
                              <span className="flex items-center gap-2 text-slate-300">
                                <span className={isCorrectOption ? "text-emerald-400 font-extrabold" : "text-slate-450"}>
                                  {shapes[idx]} {currentQuestion.options[idx]}
                                </span>
                                {isCorrectOption && (
                                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Correct
                                  </span>
                                )}
                              </span>
                              <span className="text-slate-400 font-mono">
                                {votes} stem{votes === 1 ? "" : "men"} ({Math.round(percentage)}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 border border-slate-800 h-6 rounded-lg overflow-hidden flex">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isCorrectOption ? "bg-emerald-500" : "bg-indigo-950"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Stats summary display */}
                    <div className="text-center space-y-6 md:border-l md:border-slate-800 md:pl-8">
                      <div>
                        <p className="text-slate-400 text-sm font-semibold">Totaal Antwoorden</p>
                        <h1 className="text-6xl font-black tracking-tight text-white">{answeredCount}</h1>
                        <p className="text-slate-400 text-xs">van de {totalActives} actieve spelers</p>
                      </div>

                      <button
                        onClick={handleGoToLeaderboard}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-650 text-white py-4 rounded-xl font-bold shadow-lg transition cursor-pointer"
                      >
                        Toon Leaderboard <ArrowRight className="w-5 h-55" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STATUS: TIME-SCORE LEADERBOARD */}
              {session?.status === "leaderboard" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 bg-indigo-950/75 border border-indigo-800 text-indigo-300 text-sm font-bold rounded-full mb-3 uppercase">
                      Tussenstand
                    </span>
                    <h1 className="text-4xl font-extrabold font-display text-white">Leaderboard</h1>
                    <p className="text-slate-400">Score na vraag {session.currentQuestionIndex + 1} / {session.totalQuestions}</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 rounded-3xl p-6 md:p-8 max-w-2xl mx-auto space-y-4">
                    {sortedPlayers.length === 0 ? (
                      <div className="text-center text-slate-500 py-6 italic">Geen spelergegevens beschikbaar.</div>
                    ) : (
                      <div className="space-y-2.5">
                        {sortedPlayers.slice(0, 5).map((player, idx) => {
                          const medalColors = ["bg-amber-400 text-slate-950", "bg-slate-300 text-slate-950", "bg-amber-600 text-white"];
                          const isTop3 = idx < 3;

                          return (
                            <motion.div
                              key={player.id}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl"
                            >
                              <div className="flex items-center gap-4 overflow-hidden">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isTop3 ? medalColors[idx] : "bg-slate-800 text-slate-300"}`}>
                                  {idx + 1}
                                </span>
                                <span className="font-extrabold text-lg text-slate-100 truncate">{player.nickname}</span>
                                {player.streak > 1 && (
                                  <span className="inline-flex items-center gap-0.5 bg-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white animate-pulse">
                                    🔥 {player.streak} Streak
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xl font-bold text-indigo-400">{player.score} pt</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-slate-800">
                      {session.currentQuestionIndex + 1 < session.totalQuestions ? (
                        <button
                          onClick={handleNextQuestion}
                          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition cursor-pointer"
                        >
                          Volgende Vraag <ArrowRight className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={handleFinishQuiz}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-4 rounded-xl font-extrabold text-lg transition cursor-pointer"
                        >
                          <Award className="w-5 h-5" /> Onthul Eindwinnaars!
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STATUS: GAME ENDED SHOW CONFETTI AND PODIUM */}
              {session?.status === "ended" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-8 py-10"
                >
                  <div className="space-y-2">
                    <div className="inline-flex p-3 bg-amber-500/20 text-amber-400 rounded-3xl animate-bounce mb-3">
                      <Award className="w-12 h-12" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold font-display text-white">Eindklassement</h1>
                    <p className="text-slate-400 max-w-md mx-auto">De strijd zit erop! Gefeliciteerd aan alle winnaars.</p>
                  </div>

                  <div className="flex justify-center items-end gap-3 md:gap-6 max-w-2xl mx-auto pt-16 pb-8 px-4 h-[320px]">
                    {sortedPlayers[1] && (
                      <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center w-28 md:w-36"
                      >
                        <span className="text-slate-300 font-extrabold text-sm md:text-base mb-2 max-w-full truncate px-2" title={sortedPlayers[1].nickname}>
                          {sortedPlayers[1].nickname}
                        </span>
                        <span className="text-slate-400 font-mono text-xs font-semibold mb-2">{sortedPlayers[1].score ?? 0} pt</span>
                        <div className="w-full bg-slate-800 border-t border-slate-700 h-28 md:h-36 rounded-t-2xl flex flex-col items-center justify-center shadow-md relative">
                          <span className="text-4xl text-slate-300 font-bold font-display">2</span>
                          <span className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Zilver</span>
                        </div>
                      </motion.div>
                    )}

                    {sortedPlayers[0] && (
                      <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center w-32 md:w-44 z-10"
                      >
                        <Sparkles className="w-6 h-6 text-amber-400 animate-pulse mb-1" />
                        <span className="text-amber-400 font-display font-extrabold text-base md:text-lg mb-2 max-w-full truncate px-2" title={sortedPlayers[0].nickname}>
                          🏆 {sortedPlayers[0].nickname}
                        </span>
                        <span className="text-amber-300 font-mono text-sm font-semibold mb-2">{sortedPlayers[0].score ?? 0} pt</span>
                        <div className="w-full bg-linear-to-b from-amber-400 to-amber-500 bg-amber-400 hover:scale-105 transition border-t border-amber-300 h-36 md:h-48 rounded-t-2xl flex flex-col items-center justify-center shadow-lg relative">
                          <span className="text-5xl text-slate-950 font-black font-display">1</span>
                          <span className="text-xs text-slate-900 uppercase font-black tracking-widest mt-1">Goud</span>
                        </div>
                      </motion.div>
                    )}

                    {sortedPlayers[2] && (
                      <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col items-center w-24 md:w-32"
                      >
                        <span className="text-amber-700 font-extrabold text-sm mb-2 max-w-full truncate px-2" title={sortedPlayers[2].nickname}>
                          {sortedPlayers[2].nickname}
                        </span>
                        <span className="text-slate-400 font-mono text-xs font-semibold mb-2">{sortedPlayers[2].score ?? 0} pt</span>
                        <div className="w-full bg-slate-800 border-t border-slate-700 h-20 md:h-28 rounded-t-2xl flex flex-col items-center justify-center shadow-md relative">
                          <span className="text-3xl text-amber-655 font-bold font-display">3</span>
                          <span className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Brons</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="max-w-md mx-auto pt-6">
                    <button
                      onClick={onExit}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-4 rounded-xl font-bold transition cursor-pointer"
                    >
                      Terug naar Dashboard
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
}
