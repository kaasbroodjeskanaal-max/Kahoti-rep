import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { Quiz, GameSession, Player } from "../types";
import { Users, Play, Award, ArrowRight, RefreshCw, LogOut, Check, Clock, Sparkles, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import { parseNicknameAndAvatar, ShapeIcon } from "../avatarUtils";

interface GameHostProps {
  quiz: Quiz;
  onExit: () => void;
}

interface PlayerAnswerRecord {
  playerId: string;
  nickname: string;
  answeredIndex: number | null;
  isCorrect: boolean;
  scoreBefore: number;
  scoreAfter: number;
  pointsEarned: number;
}

interface QuestionHistoryRecord {
  questionIndex: number;
  questionText: string;
  correctOptionIndex: number;
  options: string[];
  playerAnswers: PlayerAnswerRecord[];
  answeredCorrectCount: number;
  totalPlayers: number;
  percentageCorrect: number;
}

export default function GameHost({ quiz, onExit }: GameHostProps) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [code, setCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  const [isInitializing, setIsInitializing] = useState(true);
  const [countdownVal, setCountdownVal] = useState<number | string>(3);
  const [isSkippingLeaderboard, setIsSkippingLeaderboard] = useState(false);

  // Statistics and detailed analytics states
  const [quizHistory, setQuizHistory] = useState<Record<number, QuestionHistoryRecord>>({});
  const [activeEndTab, setActiveEndTab] = useState<"podium" | "analysis">("podium");

  // Load quiz history when session gets established
  useEffect(() => {
    if (sessionId) {
      try {
        const stored = localStorage.getItem(`quiz_history_${sessionId}`);
        if (stored) {
          setQuizHistory(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Error loading accumulated quiz history:", err);
      }
    }
  }, [sessionId]);

  // 1b. Manage pre-question screen count down (3, 2, 1, GO!)
  useEffect(() => {
    if (session?.status === "countdown") {
      setCountdownVal(3);
      const countdownInterval = setInterval(() => {
        setCountdownVal((prev) => {
          if (prev === 3) return 2;
          if (prev === 2) return 1;
          if (prev === 1) return "GO!";
          clearInterval(countdownInterval);
          return "GO!";
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [session?.status, session?.currentQuestionIndex]);

  // Handle host confetti triggers on stage 5 (winner reveal)
  useEffect(() => {
    if (session?.status === "ended" && session?.currentQuestionIndex === 5) {
      const duration = 6 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [session?.status, session?.currentQuestionIndex]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processedQuestionIndexRef = useRef<number | null>(null);

  // 1. Initialize Game Session on Mount
  useEffect(() => {
    const createSession = async () => {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const generatedSessionId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

      try {
        let activeHostId = "";
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.user?.id) {
          activeHostId = authSession.user.id;
        } else {
          activeHostId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              });
        }

        const { error } = await supabase.from("sessions").insert({
          id: generatedSessionId,
          host_id: activeHostId,
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
        setCode(String(sessionData.code || "").padStart(6, "0"));
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

  const isAnsweringOpen = session?.status === "question";

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
    if (!sessionId || !currentQuestion || !session) return;

    // Prevent duplicate processing of the same question index
    if (processedQuestionIndexRef.current === session.currentQuestionIndex) {
      return;
    }
    processedQuestionIndexRef.current = session.currentQuestionIndex;

    try {
      // Fetch latest players directly from database to prevent batch state lagging
      const { data: latestPlayers } = await supabase
        .from("players")
        .select("*")
        .eq("session_id", sessionId);

      if (latestPlayers && latestPlayers.length > 0) {
        // Build detailed correctness history metrics for this question
        const currentQIndex = session.currentQuestionIndex;
        const playerAnswers: PlayerAnswerRecord[] = latestPlayers.map((p) => {
          const isCorrect = p.current_answer_index === currentQuestion.correctOptionIndex;
          
          // points calculation mimicking calculatePlayerPointsAndStreak
          const maxPoints = currentQuestion.points || 1000;
          const responseTime = p.current_answer_time || 0;
          const timeLimitMs = (currentQuestion.timeLimit || 20) * 1000;
          const speedRatio = Math.min(1, Math.max(0, responseTime / timeLimitMs));
          const pointsEarned = isCorrect ? Math.round(maxPoints * (1 - (speedRatio / 2))) : 0;
          
          const currentStreak = p.streak ?? 0;
          const newStreak = isCorrect ? currentStreak + 1 : 0;
          const streakBonus = newStreak > 2 ? Math.min((newStreak - 2) * 50, 250) : 0;
          const finalEarned = pointsEarned > 0 ? pointsEarned + streakBonus : 0;

          return {
            playerId: p.id,
            nickname: p.nickname,
            answeredIndex: p.current_answer_index,
            isCorrect,
            scoreBefore: p.score ?? 0,
            scoreAfter: (p.score ?? 0) + finalEarned,
            pointsEarned: finalEarned,
          };
        });

        const answeredCorrectCount = playerAnswers.filter((pa) => pa.isCorrect).length;
        const totalPlayersCount = playerAnswers.length;
        const percentageCorrect = totalPlayersCount > 0 ? Math.round((answeredCorrectCount / totalPlayersCount) * 100) : 0;

        const newRecord: QuestionHistoryRecord = {
          questionIndex: currentQIndex,
          questionText: currentQuestion.questionText,
          correctOptionIndex: currentQuestion.correctOptionIndex,
          options: currentQuestion.options,
          playerAnswers,
          answeredCorrectCount,
          totalPlayers: totalPlayersCount,
          percentageCorrect,
        };

        setQuizHistory((prev) => {
          const updated = { ...prev, [currentQIndex]: newRecord };
          localStorage.setItem(`quiz_history_${sessionId}`, JSON.stringify(updated));
          return updated;
        });

        for (const p of latestPlayers) {
          const playerObj: Player = {
            id: p.id,
            nickname: p.nickname,
            score: p.score ?? 0,
            streak: p.streak ?? 0,
            currentAnswerIndex: p.current_answer_index,
            currentAnswerTime: p.current_answer_time,
            isHost: p.is_host,
            joinedAt: p.joined_at,
          };
          const { newScore, newStreak } = calculatePlayerPointsAndStreak(playerObj);
          await supabase
            .from("players")
            .update({
              score: newScore,
              streak: newStreak,
            })
            .eq("id", p.id);
        }
      }

      await supabase
        .from("sessions")
        .update({ status: "show_answer" })
        .eq("id", sessionId);
    } catch (err) {
      console.error("Fout tijdens autoTransitionToAnswer:", err);
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
      const maxPoints = currentQuestion.points || 1000;
      const responseTime = player.currentAnswerTime || 0;
      const timeLimitMs = (currentQuestion.timeLimit || 20) * 1000;
      const speedRatio = Math.min(1, Math.max(0, responseTime / timeLimitMs));
      pointsEarned = Math.round(maxPoints * (1 - (speedRatio / 2)));
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
    if (!sessionId) return;
    try {
      await supabase
        .from("sessions")
        .update({ status: "leaderboard" })
        .eq("id", sessionId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkipLeaderboard = async () => {
    if (!sessionId || !currentQuestion || !session) return;
    setIsSkippingLeaderboard(true);
    try {
      // Progress immediately as player scores are already processed
      const nextIdx = session.currentQuestionIndex + 1;
      const isLast = nextIdx >= quiz.questions.length;

      if (isLast) {
        await supabase
          .from("sessions")
          .update({ status: "ended", current_question_index: 0 })
          .eq("id", sessionId);
      } else {
        const nextQ = quiz.questions[nextIdx];

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
      console.error("Fout tijdens overslaan van leaderboard:", err);
    } finally {
      setIsSkippingLeaderboard(false);
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
          .update({ status: "ended", current_question_index: 0 })
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
        .update({ status: "ended", current_question_index: 0 })
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

  const handleNextRevealStage = async () => {
    if (!sessionId || !session) return;
    let nextStage = (session.currentQuestionIndex ?? 0) + 1;
    
    // Auto-skip steps if target podium/finalist spots are unoccupied
    if (nextStage === 1 && sortedPlayers.length < 5) {
      nextStage = 2;
    }
    if (nextStage === 2 && sortedPlayers.length < 4) {
      nextStage = 3;
    }
    if (nextStage === 3 && sortedPlayers.length < 3) {
      nextStage = 4;
    }
    if (nextStage === 4 && sortedPlayers.length < 2) {
      nextStage = 5;
    }

    if (nextStage > 5) return;

    // Optimistic UI update: Set state instantly so host UI doesn't lag on network
    setSession((prev) => prev ? { ...prev, currentQuestionIndex: nextStage } : null);

    // Trigger awesome stage-specific confetti live on Host big screen!
    try {
      if (nextStage === 1) {
        confetti({ particleCount: 65, spread: 60, origin: { x: 0.5, y: 0.85 }, colors: ["#10b981", "#3b82f6"], zIndex: 99999 });
      } else if (nextStage === 2) {
        confetti({ particleCount: 70, spread: 65, origin: { x: 0.5, y: 0.85 }, colors: ["#6366f1", "#ec4899"], zIndex: 99999 });
      } else if (nextStage === 3) {
        confetti({ particleCount: 110, spread: 70, origin: { x: 0.8, y: 0.65 }, colors: ["#d97706", "#f59e0b", "#ffffff"], zIndex: 99999 });
      } else if (nextStage === 4) {
        confetti({ particleCount: 130, spread: 75, origin: { x: 0.2, y: 0.65 }, colors: ["#cbd5e1", "#94a3b8", "#f1f5f9"], zIndex: 99999 });
      } else if (nextStage === 5) {
        // Epic golden victory screen loop
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const frame = () => {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: ["#fbbf24", "#f59e0b", "#ffffff"], zIndex: 99999 });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: ["#fbbf24", "#f59e0b", "#ffffff"], zIndex: 99999 });
          if (Date.now() < animationEnd) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }
    } catch (e) {
      console.warn("Confetti ignored on secondary click", e);
    }

    try {
      await supabase
        .from("sessions")
        .update({ current_question_index: nextStage })
        .eq("id", sessionId);
    } catch (err) {
      console.error("Error updating reveal stage:", err);
    }
  };

  const handleRevealAll = async () => {
    if (!sessionId) return;
    setSession((prev) => prev ? { ...prev, currentQuestionIndex: 5 } : null);
    
    // Epic golden victory screen loop
    try {
      const duration = 4 * 1000;
      const animationEnd = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: ["#fbbf24", "#f59e0b", "#3b82f6"], zIndex: 99999 });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: ["#fbbf24", "#f59e0b", "#3b82f6"], zIndex: 99999 });
        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch (e) {
      console.warn(e);
    }

    try {
      await supabase
        .from("sessions")
        .update({ current_question_index: 5 })
        .eq("id", sessionId);
    } catch (err) {
      console.error("Error revealing all:", err);
    }
  };

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
                        {String(code || "").padStart(6, "0").slice(0, 3)} {String(code || "").padStart(6, "0").slice(3)}
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

                  {/* Joined Player Centered Flow */}
                  <div className="bg-slate-950/40 border border-slate-800/60 rounded-3xl p-6 md:p-8 min-h-[250px]">
                    <h3 className="text-slate-400 text-sm font-semibold mb-6 flex items-center gap-2 justify-center">
                      <Users className="w-4 h-4 text-indigo-400" /> DEELNEMERS ({players.length})
                    </h3>
                    {players.length === 0 ? (
                      <div className="text-slate-500 italic py-12">Wacht op spelers...</div>
                    ) : (
                      <div className="flex flex-wrap justify-center items-center gap-4 max-h-[350px] overflow-y-auto p-2">
                        {players.map((p, idx) => {
                          const { displayName, avatarUrl } = parseNicknameAndAvatar(p.nickname || "");
                          return (
                          <motion.div
                            key={p.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: idx * 0.04 }}
                            className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl text-white font-bold font-display flex items-center gap-3 shadow-md hover:border-indigo-500 transition-colors duration-200 max-w-[220px]"
                          >
                            <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full border border-slate-700 bg-slate-800 shrink-0" />
                            <span className="truncate text-sm flex-1 text-left text-slate-100">{displayName}</span>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 relative">
                              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                            </div>
                          </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
 
              {/* STATUS: COUNTDOWN PRE-QUESTION */}
              {session?.status === "countdown" && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-16 flex flex-col items-center justify-center space-y-8"
                >
                  <div className="space-y-2">
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">
                      {session.currentQuestionIndex === 0 ? "QUIZ SESSIE" : "VOLGENDE VRAAG"}
                    </p>
                    <span className="inline-block px-3 py-1 bg-indigo-950 border border-indigo-805 text-indigo-200 text-xs font-semibold rounded-full font-display">
                      Vraag {session.currentQuestionIndex + 1} / {session.totalQuestions}
                    </span>
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl font-black font-display max-w-3xl mx-auto text-slate-100 leading-snug px-4 tracking-tight">
                    {session.currentQuestionIndex === 0 
                      ? `"${session?.quizTitle || quiz?.title || "Laadt quiz..."}"`
                      : `"${currentQuestion?.questionText || "Volgende vraag..."}"`
                    }
                  </h2>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-40 h-40 rounded-full bg-indigo-500/10 animate-ping" />
                    
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={countdownVal}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1.1, opacity: 1 }}
                        exit={{ scale: 1.4, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`inline-flex items-center justify-center w-36 h-36 rounded-full border-4 ${
                          countdownVal === "GO!" 
                            ? "border-emerald-500 bg-emerald-950/65 text-emerald-300" 
                            : "border-indigo-505 bg-indigo-950/65 text-indigo-300"
                        } text-6xl font-black font-display`}
                      >
                        {countdownVal}
                      </motion.div>
                    </AnimatePresence>
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
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl px-8 py-10 text-center space-y-4 shadow-xs">
                    <p className="text-xs text-indigo-400 tracking-widest font-bold uppercase">MEERKEUZEVRAAG</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display leading-snug">
                      {currentQuestion.questionText}
                    </h1>
                    {currentQuestion.imageUrl && (
                      <div className="pt-4 flex justify-center">
                        <img 
                          src={currentQuestion.imageUrl} 
                          alt="Vraag afbeelding" 
                          referrerPolicy="no-referrer"
                          className="max-h-64 object-contain rounded-xl border border-slate-700" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Options Large Grid */}
                  {!isAnsweringOpen ? (
                    <div className="bg-slate-950/60 border-2 border-dashed border-indigo-900/40 rounded-3xl p-12 text-center flex flex-col justify-center items-center gap-4 animate-pulse min-h-[220px]">
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-501 border-t-transparent animate-spin mb-2" />
                      <p className="text-indigo-300 font-black text-xl uppercase tracking-wider">
                        Antwoorden openen over een moment...
                      </p>
                      <p className="text-slate-400 text-sm">Bereid je voor om snel te antwoorden!</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {currentQuestion.options.map((option, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-4 px-6 py-5 rounded-2xl border text-xl font-bold ${optionColors[idx]} font-display`}
                        >
                          <ShapeIcon idx={idx} className="w-8 h-8 shrink-0 fill-white" />
                          <span>{option}</span>
                        </div>
                      ))}
                    </div>
                  )}

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
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center space-y-4">
                    <h2 className="text-2xl font-bold font-display text-slate-100">
                      "{currentQuestion.questionText}"
                    </h2>
                    {currentQuestion.imageUrl && (
                      <div className="pt-2 flex justify-center">
                        <img 
                          src={currentQuestion.imageUrl} 
                          alt="Vraag afbeelding" 
                          referrerPolicy="no-referrer"
                          className="max-h-32 object-contain rounded-xl border border-slate-700" 
                        />
                      </div>
                    )}
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
                                <span className={`flex items-center gap-1.5 ${isCorrectOption ? "text-emerald-400 font-extrabold" : "text-slate-400 font-medium"}`}>
                                  <ShapeIcon idx={idx} className="w-5 h-5 shrink-0 inline-block fill-current" />
                                  <span>{currentQuestion.options[idx]}</span>
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
                        className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg transition cursor-pointer text-base"
                      >
                        Toon Leaderboard <ArrowRight className="w-5 h-5" />
                      </button>

                      <button
                        onClick={handleSkipLeaderboard}
                        disabled={isSkippingLeaderboard}
                        className="w-full flex items-center justify-center gap-2 border border-slate-700 bg-slate-900/65 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white py-3 rounded-xl font-bold transition cursor-pointer text-xs"
                      >
                        {isSkippingLeaderboard ? "Laden..." : "Sla Leaderboard Over ⚡"}
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
                          const { displayName, avatarUrl } = parseNicknameAndAvatar(player.nickname || "");
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
                                <img src={avatarUrl} alt="avatar" className="w-10 h-10 -ml-2 rounded-full border-2 border-slate-700 bg-slate-800" />
                                <span className="font-extrabold text-lg text-slate-100 truncate">{displayName}</span>
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

              {/* STATUS: GAME ENDED SHOW CONFETTI AND PODIUM / ANALYSIS */}
              {session?.status === "ended" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8 py-6 text-center"
                >
                  <div className="space-y-2">
                    <div className="inline-flex p-3 bg-amber-500/20 text-amber-400 rounded-3xl animate-bounce mb-2">
                      <Award className="w-12 h-12" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold font-display text-white">Spel Afgelopen!</h1>
                    <p className="text-slate-400 max-w-md mx-auto">Bekijk hieronder de eindwinnaars of open het gedetailleerd overzicht.</p>
                  </div>

                  {/* Tab switches for the host */}
                  <div className="flex justify-center gap-4 max-w-md mx-auto">
                    <button
                      onClick={() => setActiveEndTab("podium")}
                      className={`px-6 py-2.5 rounded-full font-bold text-sm transition cursor-pointer flex items-center gap-2 ${
                        activeEndTab === "podium"
                          ? "bg-indigo-600 text-white shadow-md border border-indigo-500"
                          : "bg-slate-800 text-slate-405 hover:bg-slate-750 hover:text-white border border-transparent"
                      }`}
                    >
                      🏆 Podium
                    </button>
                    <button
                      onClick={() => setActiveEndTab("analysis")}
                      className={`px-6 py-2.5 rounded-full font-bold text-sm transition cursor-pointer flex items-center gap-2 ${
                        activeEndTab === "analysis"
                          ? "bg-indigo-600 text-white shadow-md border border-indigo-500"
                          : "bg-slate-800 text-slate-405 hover:bg-slate-755 hover:text-white border border-transparent"
                      }`}
                    >
                      📊 Gedetailleerd Overzicht
                    </button>
                  </div>

                  {activeEndTab === "podium" ? (
                    <div className="animate-fade-in relative px-4 max-w-4xl mx-auto">
                      {/* Ambient Glowing Background Halos under columns */}
                      <div className="absolute inset-0 pointer-events-none flex justify-center items-end gap-12 md:gap-24 opacity-30 blur-3xl overflow-hidden -z-10">
                        <div className="w-48 h-48 rounded-full bg-slate-500/30" />
                        <div className="w-64 h-64 rounded-full bg-amber-500/40 animate-pulse" />
                        <div className="w-48 h-48 rounded-full bg-amber-800/30" />
                      </div>

                      <div className="flex justify-center items-end gap-4 sm:gap-6 md:gap-8 max-w-3xl mx-auto pt-12 pb-10 h-[380px] border-b border-slate-800/60">
                        {/* 2nd Place Slot */}
                        {(() => {
                          const hasRevealed = (session?.currentQuestionIndex ?? 0) >= 4;
                          if (hasRevealed && sortedPlayers[1]) {
                            const { displayName: n1, avatarUrl: a1 } = parseNicknameAndAvatar(sortedPlayers[1].nickname || "");
                            return (
                              <motion.div
                                initial={{ y: 90, opacity: 0, scale: 0.9 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 80, damping: 15 }}
                                className="flex flex-col items-center w-28 sm:w-36 md:w-40 z-10 group"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute inset-0 bg-slate-300/20 rounded-full blur-md group-hover:blur-lg transition-all scale-110" />
                                  <img src={a1} alt="avatar" className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950 border-4 border-slate-350 rounded-full shadow-xl relative z-10" />
                                  <span className="absolute -bottom-1 -right-1 bg-slate-200 text-slate-950 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 z-20 font-display font-bold">2</span>
                                </div>
                                <span className="text-slate-100 font-display font-extrabold text-sm sm:text-base md:text-lg mb-0.5 max-w-full truncate px-1 text-center" title={n1}>
                                  {n1}
                                </span>
                                <span className="text-slate-400 font-mono text-xs font-bold mb-2.5">{sortedPlayers[1].score ?? 0} pt</span>
                                <div className="w-full bg-linear-to-b from-slate-400/90 to-slate-600/90 border-t border-slate-300 h-28 sm:h-36 md:h-40 rounded-t-3xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group-hover:from-slate-350/95 group-hover:to-slate-550/95 transition-all">
                                  <div className="absolute top-0 right-0 left-0 h-[2px] bg-white/20" />
                                  <span className="text-4xl sm:text-5xl md:text-6xl text-slate-950 font-black font-display tracking-tight leading-none drop-shadow-md">2</span>
                                  <span className="text-[10px] sm:text-xs text-slate-200 uppercase font-black tracking-widest mt-1">Zilver</span>
                                </div>
                              </motion.div>
                            );
                          } else {
                            return (
                              <div className="flex flex-col items-center w-28 sm:w-36 md:w-40 opacity-40 select-none">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950 border-4 border-dashed border-slate-800 rounded-full mb-2 flex items-center justify-center text-slate-600 text-xl shadow-inner animate-pulse">
                                  🔒
                                </div>
                                <span className="text-slate-600 font-display font-bold text-sm mb-1">???</span>
                                <span className="text-slate-700 font-mono text-xs font-semibold mb-2.5">0 pt</span>
                                <div className="w-full bg-slate-950/10 border-t border-slate-900/60 h-28 sm:h-36 md:h-40 rounded-t-3xl flex flex-col items-center justify-center border border-slate-800/20 shadow-inner">
                                  <span className="text-4xl text-slate-850 font-black font-display">2</span>
                                </div>
                              </div>
                            );
                          }
                        })()}

                        {/* 1st Place Slot with supreme gold details */}
                        {(() => {
                          const hasRevealed = (session?.currentQuestionIndex ?? 0) >= 5;
                          if (hasRevealed && sortedPlayers[0]) {
                            const { displayName: n0, avatarUrl: a0 } = parseNicknameAndAvatar(sortedPlayers[0].nickname || "");
                            return (
                              <motion.div
                                initial={{ y: 110, opacity: 0, scale: 0.85 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 60, damping: 12 }}
                                className="flex flex-col items-center w-36 sm:w-48 md:w-52 z-30 group"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-xl animate-pulse scale-125 z-0" />
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20">
                                    <Trophy className="w-8 h-8 text-amber-300 animate-bounce -mb-1" />
                                  </div>
                                  <img src={a0} alt="avatar" className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 border-4 border-amber-400 rounded-full shadow-2xl relative z-10" />
                                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-xs font-extrabold w-7 h-7 rounded-full flex items-center justify-center border-2 border-slate-900 z-20 font-display animate-pulse shadow-md">1</span>
                                </div>
                                <span className="text-amber-300 font-display font-black text-base sm:text-lg md:text-xl mb-0.5 max-w-full truncate px-1 text-center drop-shadow-md flex items-center justify-center gap-1" title={n0}>
                                  👑 {n0}
                                </span>
                                <span className="text-amber-200 font-mono text-sm font-black mb-3 text-glow-yellow">{sortedPlayers[0].score ?? 0} pt</span>
                                <div className="w-full bg-linear-to-b from-amber-400 to-amber-650 border-t-2 border-amber-300 h-36 sm:h-48 rounded-t-3xl flex flex-col items-center justify-center shadow-3xl relative overflow-hidden group-hover:from-amber-350 group-hover:to-amber-550 transition-all border border-amber-500/30">
                                  <span className="text-5xl sm:text-6xl md:text-7xl text-slate-950 font-black font-display tracking-tight leading-none drop-shadow-lg">1</span>
                                  <span className="text-[10px] sm:text-xs text-slate-950 uppercase font-black tracking-widest mt-1">Goud</span>
                                </div>
                              </motion.div>
                            );
                          } else {
                            return (
                              <div className="flex flex-col items-center w-36 sm:w-48 md:w-52 opacity-40 select-none z-20">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 border-4 border-dashed border-slate-800 rounded-full mb-2 flex items-center justify-center text-slate-600 text-2xl shadow-inner animate-pulse">
                                  🔒
                                </div>
                                <span className="text-slate-600 font-display font-bold text-base mb-1">???</span>
                                <span className="text-slate-705 font-mono text-sm font-semibold mb-3">0 pt</span>
                                <div className="w-full bg-slate-950/10 border-t border-slate-900/60 h-36 sm:h-48 rounded-t-3xl flex flex-col items-center justify-center border border-slate-800/20 shadow-inner">
                                  <span className="text-4xl text-slate-850 font-black font-display">1</span>
                                </div>
                              </div>
                            );
                          }
                        })()}

                        {/* 3rd Place Slot */}
                        {(() => {
                          const hasRevealed = (session?.currentQuestionIndex ?? 0) >= 3;
                          if (hasRevealed && sortedPlayers[2]) {
                            const { displayName: n2, avatarUrl: a2 } = parseNicknameAndAvatar(sortedPlayers[2].nickname || "");
                            return (
                              <motion.div
                                initial={{ y: 70, opacity: 0, scale: 0.9 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 100, damping: 16 }}
                                className="flex flex-col items-center w-24 sm:w-32 md:w-36 group"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute inset-0 bg-amber-700/20 rounded-full blur-md group-hover:blur-lg transition-all scale-110" />
                                  <img src={a2} alt="avatar" className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-950 border-4 border-amber-800 rounded-full shadow-lg relative z-10" />
                                  <span className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-[9px] font-black w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-slate-900 z-20 font-display font-bold">3</span>
                                </div>
                                <span className="text-amber-650 font-display font-extrabold text-xs sm:text-sm md:text-base mb-0.5 max-w-full truncate px-1 text-center" title={n2}>
                                  {n2}
                                </span>
                                <span className="text-slate-400 font-mono text-xs font-bold mb-2">{sortedPlayers[2].score ?? 0} pt</span>
                                <div className="w-full bg-linear-to-b from-amber-700 to-amber-900 border-t border-amber-655 h-24 sm:h-28 md:h-32 rounded-t-3xl flex flex-col items-center justify-center shadow-xl relative overflow-hidden group-hover:from-amber-650 group-hover:to-amber-850 transition-all">
                                  <span className="text-3xl sm:text-4xl md:text-5xl text-slate-950 font-black font-display tracking-tight leading-none drop-shadow-md">3</span>
                                  <span className="text-[9px] sm:text-[10px] text-amber-200 uppercase font-black tracking-widest mt-1">Brons</span>
                                </div>
                              </motion.div>
                            );
                          } else {
                            return (
                              <div className="flex flex-col items-center w-24 sm:w-32 md:w-36 opacity-40 select-none">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-950 border-4 border-dashed border-slate-800 rounded-full mb-2 flex items-center justify-center text-slate-600 text-lg shadow-inner animate-pulse">
                                  🔒
                                </div>
                                <span className="text-slate-600 font-display font-bold text-sm mb-1">???</span>
                                <span className="text-slate-705 font-mono text-xs font-semibold mb-2">0 pt</span>
                                <div className="w-full bg-slate-950/10 border-t border-slate-900/60 h-24 sm:h-28 md:h-32 rounded-t-3xl flex flex-col items-center justify-center border border-slate-800/20 shadow-inner">
                                  <span className="text-3xl text-slate-850 font-bold font-display">3</span>
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>

                      {/* 4th & 5th Place Finalists Row - SPECTACULAR GLOSSY GLASS BADGES */}
                      <div className="mt-10 grid grid-cols-2 gap-4 max-w-xl mx-auto px-4">
                        {/* 4e place slot */}
                        {sortedPlayers[3] && (() => {
                          const hasRevealed = (session?.currentQuestionIndex ?? 0) >= 2;
                          if (hasRevealed) {
                            const { displayName: n3, avatarUrl: a3 } = parseNicknameAndAvatar(sortedPlayers[3].nickname || "");
                            return (
                              <motion.div
                                initial={{ x: -30, opacity: 0, scale: 0.95 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                className="bg-slate-950/70 p-4 rounded-2xl border border-indigo-500/30 flex items-center gap-4.5 shadow-xl relative overflow-hidden group hover:border-indigo-400 transition"
                              >
                                <div className="absolute -right-2 -bottom-2 bg-indigo-500/5 w-16 h-16 rounded-full blur-xl pointer-events-none" />
                                <div className="relative shrink-0">
                                  <div className="absolute inset-0 bg-indigo-400/10 rounded-full blur-xs scale-110" />
                                  <img src={a3} alt="avatar" className="w-13 h-13 rounded-full border-2 border-indigo-450 bg-slate-950 shadow-md z-10 relative" />
                                  <span className="absolute -top-1 -left-1 bg-indigo-650 text-white text-[10px] font-black font-mono w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-slate-950 z-20 shadow">4</span>
                                </div>
                                <div className="min-w-0 text-left relative z-10">
                                  <p className="font-extrabold text-slate-100 text-sm sm:text-base truncate" title={n3}>{n3}</p>
                                  <p className="font-bold text-[10px] text-indigo-400 uppercase tracking-widest font-mono">4e Finalist</p>
                                  <p className="font-bold text-xs text-slate-350 font-mono mt-0.5">{sortedPlayers[3].score} pt</p>
                                </div>
                              </motion.div>
                            );
                          } else {
                            return (
                              <div className="bg-slate-950/20 p-4 rounded-xl border border-dashed border-slate-800/80 flex items-center gap-3 opacity-30 justify-center select-none w-full">
                                <span className="text-slate-500 font-display font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5">
                                  🔒 4e Standings
                                </span>
                              </div>
                            );
                          }
                        })()}

                        {/* 5e place slot */}
                        {sortedPlayers[4] && (() => {
                          const hasRevealed = (session?.currentQuestionIndex ?? 0) >= 1;
                          if (hasRevealed) {
                            const { displayName: n4, avatarUrl: a4 } = parseNicknameAndAvatar(sortedPlayers[4].nickname || "");
                            return (
                              <motion.div
                                initial={{ x: 30, opacity: 0, scale: 0.95 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                className="bg-slate-950/70 p-4 rounded-2xl border border-indigo-500/30 flex items-center gap-4.5 shadow-xl relative overflow-hidden group hover:border-indigo-400 transition"
                              >
                                <div className="absolute -right-2 -bottom-2 bg-indigo-500/5 w-16 h-16 rounded-full blur-xl pointer-events-none" />
                                <div className="relative shrink-0">
                                  <div className="absolute inset-0 bg-indigo-400/10 rounded-full blur-xs scale-110" />
                                  <img src={a4} alt="avatar" className="w-13 h-13 rounded-full border-2 border-indigo-450 bg-slate-950 shadow-md z-10 relative" />
                                  <span className="absolute -top-1 -left-1 bg-indigo-650 text-white text-[10px] font-black font-mono w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-slate-950 z-20 shadow">5</span>
                                </div>
                                <div className="min-w-0 text-left relative z-10">
                                  <p className="font-extrabold text-slate-100 text-sm sm:text-base truncate" title={n4}>{n4}</p>
                                  <p className="font-bold text-[10px] text-indigo-400 uppercase tracking-widest font-mono">5e Finalist</p>
                                  <p className="font-bold text-xs text-slate-350 font-mono mt-0.5">{sortedPlayers[4].score} pt</p>
                                </div>
                              </motion.div>
                            );
                          } else {
                            return (
                              <div className="bg-slate-950/20 p-4 rounded-xl border border-dashed border-slate-800/80 flex items-center gap-3 opacity-30 justify-center select-none w-full">
                                <span className="text-slate-500 font-display font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5">
                                  🔒 5e Standings
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>

                      {/* Host controls for reveal steps */}
                      {(() => {
                        const revealStage = session?.currentQuestionIndex ?? 0;
                        return (
                          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto mt-8 bg-slate-950/60 p-5 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-xs">
                            {revealStage < 5 ? (
                              <>
                                <button
                                  onClick={handleNextRevealStage}
                                  className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl transition flex items-center justify-center gap-2.5 cursor-pointer shadow-lg font-display text-sm animate-pulse-glow"
                                >
                                  {revealStage === 0 && (
                                    <>🎖️ Onthul 5e Plaats <ArrowRight className="w-4 h-4" /></>
                                  )}
                                  {revealStage === 1 && (
                                    <>🎖️ Onthul 4e Plaats <ArrowRight className="w-4 h-4" /></>
                                  )}
                                  {revealStage === 2 && (
                                    <>🥉 Onthul 3e Plaats <ArrowRight className="w-4 h-4" /></>
                                  )}
                                  {revealStage === 3 && (
                                    <>🥈 Onthul 2e Plaats <ArrowRight className="w-4 h-4" /></>
                                  )}
                                  {revealStage === 4 && (
                                    <>🏆 Onthul de Winnaar! <Sparkles className="w-4 h-4 text-yellow-300" /></>
                                  )}
                                </button>
                                <button
                                  onClick={handleRevealAll}
                                  className="w-full sm:w-auto text-slate-400 hover:text-white font-black text-xs px-4 py-2 transition cursor-pointer whitespace-nowrap"
                                >
                                  Alles Onthullen
                                </button>
                              </>
                            ) : (
                              <div className="text-emerald-400 font-black text-sm flex items-center gap-2 py-1.5 animate-pulse justify-center w-full">
                                <span>🎉 Alle finalisten en de winnaar zijn onthuld! 🎉</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-left space-y-8 max-w-4xl mx-auto px-4 pb-12 animate-fade-in text-slate-200">
                      {/* Section 1: All Player Points Overview */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                          <div>
                            <h2 className="text-lg font-bold font-display text-white">Eindstand Spelers</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Snel overzicht van alle scores en placements</p>
                          </div>
                          <span className="bg-indigo-950/40 text-indigo-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-900 font-mono">
                            {sortedPlayers.length} Spelers
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sortedPlayers.map((player, idx) => {
                            const { displayName, avatarUrl } = parseNicknameAndAvatar(player.nickname || "");
                            return (
                              <div key={player.id || idx} className="flex items-center justify-between bg-slate-850 p-4 rounded-xl border border-slate-800/60 hover:border-slate-800 transition">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-800 font-display font-black text-sm flex items-center justify-center text-slate-300">
                                    {idx + 1}
                                  </div>
                                  <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-700" />
                                  <div>
                                    <h4 className="font-extrabold text-white text-sm">{displayName}</h4>
                                    <p className="text-xs text-slate-400">Plaats #{idx + 1}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-black text-indigo-400 text-sm">{player.score ?? 0} pt</p>
                                  {player.streak > 1 && (
                                    <span className="text-[10px] bg-orange-600/20 text-orange-400 px-1.5 py-0.5 rounded font-black">
                                      🔥 {player.streak} Streak
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 2: Question-by-Question breakdown analysis */}
                      <div className="space-y-6">
                        <div className="border-b border-slate-800 pb-2">
                          <h2 className="text-lg font-bold font-display text-white">Vraag-voor-Vraag Detailanalyse</h2>
                          <p className="text-xs text-slate-400 mt-0.5 font-sans">Zie details over wie welke vraag goed of fout had en de totale succespercentages</p>
                        </div>

                        {quiz.questions.map((q, qIdx) => {
                          const statsObj = quizHistory[qIdx];
                          const pct = statsObj ? statsObj.percentageCorrect : 0;
                          const correctCount = statsObj ? statsObj.answeredCorrectCount : 0;
                          const totalCount = statsObj ? statsObj.totalPlayers : sortedPlayers.length;

                          return (
                            <div key={qIdx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                              {/* Question summary row */}
                              <div className="bg-slate-850 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
                                <div className="space-y-1.5 max-w-xl">
                                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider block font-mono">
                                    VRAAG {qIdx + 1} • {q.points || 1000} PT
                                  </span>
                                  <h3 className="text-sm md:text-base font-extrabold text-white leading-snug">{q.questionText}</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-center bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-xl">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Correct beantwoord</p>
                                    <p className="text-xl font-mono font-black text-emerald-400">
                                      {pct}%
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">({correctCount} van de {totalCount} spelers)</p>
                                  </div>
                                </div>
                              </div>

                              {/* Question options mapping indicating correct ans */}
                              <div className="p-4 bg-slate-900/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {q.options.map((opt, oIdx) => {
                                  const isCorrectAns = oIdx === q.correctOptionIndex;
                                  return (
                                    <div key={oIdx} className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                      isCorrectAns 
                                        ? "bg-emerald-950/25 border-emerald-900/70 text-emerald-300" 
                                        : "bg-slate-850/45 border-slate-850 text-slate-500"
                                    }`}>
                                      <span className="truncate pr-2 font-medium">{oIdx + 1}. {opt}</span>
                                      {isCorrectAns && (
                                        <span className="bg-emerald-550/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-emerald-950/80">
                                          GOED ANTWOORD
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Player correctness list layout */}
                              <div className="p-5 space-y-3">
                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Breuk per speler (goed of fout):</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                  {sortedPlayers.map((player) => {
                                    // Identify correctness from stored stats block
                                    const playerAnsObj = statsObj?.playerAnswers.find(pa => pa.playerId === player.id);
                                    
                                    const isCorrect = playerAnsObj ? playerAnsObj.isCorrect : false;
                                    const pAnsweredIdx = playerAnsObj !== undefined ? playerAnsObj.answeredIndex : null;
                                    const cleanNickname = parseNicknameAndAvatar(player.nickname || "");

                                    return (
                                      <div key={player.id} className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                                        pAnsweredIdx === null
                                          ? "bg-slate-855/30 border-slate-800/80 text-slate-500"
                                          : isCorrect
                                            ? "bg-emerald-950/20 border-emerald-900/60 text-emerald-250"
                                            : "bg-red-950/20 border-red-900/60 text-red-250"
                                      }`}>
                                        <div className="flex items-center gap-2 truncate">
                                          <img src={cleanNickname.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-slate-800" />
                                          <span className="font-bold truncate" title={cleanNickname.displayName}>
                                            {cleanNickname.displayName}
                                          </span>
                                        </div>
                                        <div className="font-mono flex items-center gap-1.5 text-[11px] font-bold">
                                          {pAnsweredIdx === null ? (
                                            <span className="text-slate-500 font-sans text-[10px] italic">Geen ingediend antwoord</span>
                                          ) : isCorrect ? (
                                            <span className="bg-emerald-500 text-slate-950 font-mono font-black rounded-full w-5 h-5 flex items-center justify-center text-[10px]" title="Goed beantwoord">
                                              ✓
                                            </span>
                                          ) : (
                                            <span className="bg-red-500 text-slate-950 font-mono font-black rounded-full w-5 h-5 flex items-center justify-center text-[10px]" title="Fout beantwoord">
                                              ✗
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="max-w-md mx-auto pt-4">
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
