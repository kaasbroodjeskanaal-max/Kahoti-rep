import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { GameSession, Player, Question, checkIsCorrect, getThemeConfig } from "../types";
import { Check, X, Award, Loader2, Sparkles, LogOut, Clock, Trophy, ChevronUp, ChevronDown, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parseNicknameAndAvatar, ShapeIcon } from "../avatarUtils";
import confetti from "canvas-confetti";
import { LuckyWheel } from "./LuckyWheel";
import { translations } from "../translations";

interface GamePlayerProps {
  lang?: "nl" | "en";
  sessionId: string;
  nickname: string;
  onExit: () => void;
}

export default function GamePlayer({ lang = "nl", sessionId, nickname, onExit }: GamePlayerProps) {
  const t = translations[lang];

  const { displayName, avatarUrl } = parseNicknameAndAvatar(nickname || "");
  const [session, setSession] = useState<GameSession | null>(null);
  const [self, setSelf] = useState<Player | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerUid, setPlayerUid] = useState<string>("");
  const [playerCountdown, setPlayerCountdown] = useState<number | string>(3);
  const [isKicked, setIsKicked] = useState(false);
  const [puzzleItems, setPuzzleItems] = useState<{ originalIndex: number; text: string }[]>([]);
  const [sliderVal, setSliderVal] = useState<number>(3);

  const [allPlayersSorted, setAllPlayersSorted] = useState<{ id: string; nickname: string; score: number }[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  const currentQuestionIdx = session?.currentQuestionIndex ?? 0;
  const activeQuestion = questions[currentQuestionIdx];

  useEffect(() => {
    if (session?.status === "ended" && sessionId && playerUid) {
      const fetchScoresAndRanking = async () => {
        try {
          const { data, error } = await supabase
            .from("players")
            .select("id, score, nickname")
            .eq("session_id", sessionId)
            .order("score", { ascending: false });

          if (!error && data) {
            setAllPlayersSorted(data.map(p => ({
              id: p.id,
              nickname: p.nickname,
              score: p.score ?? 0
            })));
            
            const index = data.findIndex(p => p.id === playerUid);
            if (index !== -1) {
              setPlayerRank(index + 1);
            }
          }
        } catch (err) {
          console.error("Error fetching end-of-game ranks:", err);
        }
      };

      fetchScoresAndRanking();
    }
  }, [session?.status, sessionId, playerUid]);

  // Trigger local device confetti matching each progressive reveal stage
  useEffect(() => {
    if (session?.status === "ended" && playerRank !== null) {
      const revealStage = session?.currentQuestionIndex ?? 0;
      
      // Stage 1: 5th place revealed
      if (revealStage === 1 && playerRank === 5) {
        confetti({ particleCount: 60, spread: 50, colors: ["#10b981", "#3b82f6"], origin: { y: 0.65 }, zIndex: 99999 });
      }
      // Stage 2: 4th place revealed
      if (revealStage === 2 && playerRank === 4) {
        confetti({ particleCount: 65, spread: 55, colors: ["#6366f1", "#ec4899"], origin: { y: 0.65 }, zIndex: 99999 });
      }
      // Stage 3: 3rd place revealed
      if (revealStage === 3 && playerRank === 3) {
        confetti({ particleCount: 100, spread: 65, colors: ["#d97706", "#f59e0b", "#ffffff"], origin: { y: 0.6 }, zIndex: 99999 });
      }
      // Stage 4: 2nd place revealed
      if (revealStage === 4 && playerRank === 2) {
        confetti({ particleCount: 120, spread: 75, colors: ["#cbd5e1", "#94a3b8", "#f1f5f9"], origin: { y: 0.6 }, zIndex: 99999 });
      }
      // Stage 5: 1st place revealed
      if (revealStage === 5) {
        if (playerRank === 1) {
          // Epic winner cascade
          const end = Date.now() + 3 * 1000;
          const colors = ["#fbbf24", "#f59e0b", "#6366f1", "#ec4899"];
          (function frame() {
            confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: 99999 });
            confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: 99999 });
            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          }());
        } else {
          // Normal celebration for other players
          confetti({ particleCount: 40, spread: 60, colors: ["#a78bfa", "#f472b6"], origin: { y: 0.75 }, zIndex: 99999 });
        }
      }
    }
  }, [session?.status, playerRank, session?.currentQuestionIndex]);

  // Get active user ID securely using Supabase auth with dynamic local storage fallback
  useEffect(() => {
    async function loadUser() {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.user?.id) {
        setPlayerUid(authSession.user.id);
      } else {
        let localId = localStorage.getItem("quiz_player_uuid");
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!localId || !uuidRegex.test(localId)) {
          localId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              });
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
        .maybeSingle();

      if (pErr) {
        console.error("Fout tijdens ophalen spelerdata:", pErr);
      }

      if (!isLoading && !playerData) {
        setIsKicked(true);
        setIsLoading(false);
        return;
      }

      if (playerData) {
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
        if (playerData.current_answer_index !== null) {
          setHasAnswered(true);
        }
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

  // Handle countdown resets & manage dynamic countdown values (3, 2, 1, GO!)
  useEffect(() => {
    if (session?.status === "countdown") {
      setHasAnswered(false);
      setSelectedIndices([]);
      setPlayerCountdown(3);
      const countdownInterval = setInterval(() => {
        setPlayerCountdown((prev) => {
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

  // Reset answer states when the question index increments/changes
  useEffect(() => {
    if (session?.currentQuestionIndex !== undefined) {
      setHasAnswered(false);
      setSelectedIndices([]);
      const currentQ = questions[session.currentQuestionIndex];
      if (currentQ && currentQ.questionType === "slider" && currentQ.options) {
        setSliderVal(Math.ceil(currentQ.options.length / 2));
      } else {
        setSliderVal(3);
      }
    }
  }, [session?.currentQuestionIndex, questions]);

  // Setup puzzle shuffling on activeQuestion change
  useEffect(() => {
    if (activeQuestion && activeQuestion.questionType === "puzzle") {
      const initialItems = activeQuestion.options.map((text, idx) => ({
        originalIndex: idx,
        text: text
      }));
      // Securely shuffle them so they are not in the correct [0, 1, 2, 3] order initially
      let shuffled = [...initialItems];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      // Safety: check if shuffle is exactly sorted. If so, swap adjacent items
      const isMatched = shuffled.every((item, idx) => item.originalIndex === idx);
      if (isMatched && shuffled.length > 1) {
        [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
      }
      setPuzzleItems(shuffled);
    } else {
      setPuzzleItems([]);
    }
  }, [activeQuestion?.id]);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= puzzleItems.length) return;
    const updated = [...puzzleItems];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    setPuzzleItems(updated);
  };

  const getPuzzleCardColor = (text: string, idx: number) => {
    const clean = text.toLowerCase();
    if (clean.includes("rood") || clean.includes("red") || clean.includes("🔴")) return "from-red-600 to-red-500 text-white shadow-red-500/20";
    if (clean.includes("blauw") || clean.includes("blue") || clean.includes("🔵")) return "from-blue-600 to-blue-500 text-white shadow-blue-500/20";
    if (clean.includes("geel") || clean.includes("yellow") || clean.includes("🟡")) return "from-yellow-500 to-yellow-400 text-slate-950 shadow-yellow-500/10";
    if (clean.includes("groen") || clean.includes("green") || clean.includes("🟢")) return "from-emerald-600 to-emerald-500 text-white shadow-emerald-500/20";
    if (clean.includes("oranje") || clean.includes("orange") || clean.includes("🟠")) return "from-orange-500 to-orange-400 text-white shadow-orange-500/20";
    if (clean.includes("paars") || clean.includes("purple") || clean.includes("🟣")) return "from-purple-600 to-purple-500 text-white shadow-purple-500/20";
    
    // fallback based on index
    const fallbacks = [
      "from-red-600 to-red-500 text-white shadow-red-500/10",
      "from-blue-600 to-blue-500 text-white shadow-blue-500/10",
      "from-yellow-500 to-yellow-400 text-slate-950 shadow-yellow-500/10",
      "from-emerald-600 to-emerald-500 text-white shadow-emerald-500/10",
      "from-purple-600 to-purple-500 text-white shadow-purple-500/10",
      "from-orange-500 to-orange-400 text-white shadow-orange-500/10",
    ];
    return fallbacks[idx % fallbacks.length];
  };

  // Helper to submit raw answer index or bitmask to DB
  const submitAnswerToSupabase = async (answerValue: number) => {
    if (hasAnswered || !session || !playerUid) return;

    try {
      const startTimeStamp = session.questionStartTime ? new Date(session.questionStartTime).getTime() : Date.now();
      const reactionDelay = Date.now() - startTimeStamp;

      setHasAnswered(true);

      const { error } = await supabase
        .from("players")
        .update({
          current_answer_index: answerValue,
          current_answer_time: reactionDelay,
        })
        .eq("id", playerUid)
        .eq("session_id", sessionId);

      if (error) throw new Error(error.message);
    } catch (err) {
      console.error("Fout bij indienen antwoord:", err);
    }
  };

  // Answer submission Handler for single correct questions
  const handleSelectOption = async (optionIdx: number) => {
    await submitAnswerToSupabase(optionIdx);
  };

  // Toggle handlers for multi correct questions
  const handleToggleOptionSelection = (optionIdx: number) => {
    setSelectedIndices((prev) =>
      prev.includes(optionIdx) ? prev.filter((i) => i !== optionIdx) : [...prev, optionIdx]
    );
  };

  const handleSubmitMultipleAnswers = async () => {
    if (selectedIndices.length === 0) return;
    let bitmask = 0;
    selectedIndices.forEach((idx) => {
      bitmask |= (1 << idx);
    });
    await submitAnswerToSupabase(bitmask);
  };

  const [secondsLeft, setSecondsLeft] = useState(0);
  const isAnsweringOpen = session?.status === "question";

  useEffect(() => {
    if (session?.status === "question" && session?.questionStartTime) {
      const updateTimer = () => {
        const start = new Date(session.questionStartTime!).getTime();
        const now = Date.now();
        const elapsedMs = now - start;
        const duration = session.questionDuration ?? 20;
        setSecondsLeft(Math.max(0, duration - Math.floor(elapsedMs / 1000)));
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 100);
      return () => clearInterval(timerInterval);
    }
  }, [session?.status, session?.questionStartTime, session?.questionDuration]);

  const firstQ = questions[0];
  const playerTheme = activeQuestion?.theme || firstQ?.theme || "default";
  const lobbyTheme = activeQuestion?.lobbyTheme || firstQ?.lobbyTheme || "default";
  const activeTheme = session?.status === "lobby"
    ? getThemeConfig(lobbyTheme)
    : getThemeConfig(playerTheme);

  const getPointsEarnedForThisQuestion = () => {
    if (!activeQuestion || !self) return 0;

    if (activeQuestion.questionType === "wheel_spin") {
      const selectedIndex = self.currentAnswerIndex;
      if (selectedIndex === null || selectedIndex === undefined || selectedIndex < 0 || selectedIndex >= activeQuestion.options.length) {
        return 0;
      }
      const optionText = activeQuestion.options[selectedIndex];
      const textToAnalyze = optionText.toLowerCase();

      if (textToAnalyze.includes("bankroet") || textToAnalyze.includes("verlies alles") || textToAnalyze.includes("bankrupt") || textToAnalyze.includes("alles kwijt")) {
        return -self.score;
      } else if (textToAnalyze.includes("verdubbel") || textToAnalyze.includes("double") || textToAnalyze.includes("x2") || textToAnalyze.includes("vermenigvuldig")) {
        return self.score;
      } else {
        const numberMatches = optionText.match(/[-+]?\s*\d+/g);
        if (numberMatches && numberMatches.length > 0) {
          const parsedValue = parseInt(numberMatches[0].replace(/\s+/g, ""), 10);
          if (!isNaN(parsedValue)) {
            return parsedValue;
          }
        }
        return 300;
      }
    }

    const isCorrect = checkIsCorrect(self.currentAnswerIndex, activeQuestion);
    if (!isCorrect) return 0;

    const maxPoints = activeQuestion.points || 1000;
    const responseTime = self.currentAnswerTime || 0;
    const timeLimitMs = (activeQuestion.timeLimit || 20) * 1000;
    const speedRatio = Math.min(1, Math.max(0, responseTime / timeLimitMs));
    const pointsEarned = Math.round(maxPoints * (1 - (speedRatio / 2)));

    const currentStreak = self.streak;
    const streakBonus = currentStreak > 2 ? Math.min((currentStreak - 2) * 50, 250) : 0;
    return pointsEarned + streakBonus;
  };

  const optionColors = [
    "bg-red-500 hover:bg-red-600 active:bg-red-700",
    "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
    "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700",
    "bg-green-500 hover:bg-green-600 active:bg-green-700",
    "bg-purple-500 hover:bg-purple-600 active:bg-purple-700",
    "bg-orange-500 hover:bg-orange-600 active:bg-orange-700",
  ];

  const shapes = ["▲", "♦", "●", "■", "★", "♣"];

  const currentThemeName = session?.status === "lobby" ? (lobbyTheme || "default") : (playerTheme || "default");
  const isThemeDark = ["space", "halloween", "neon"].includes(currentThemeName) || (currentThemeName === "default" && localStorage.getItem("quiz_dark_mode") === "true");
  const textTitleClass = isThemeDark ? "text-white font-black" : "text-slate-800 font-black";
  const textMutedClass = isThemeDark ? "text-slate-300" : "text-gray-500";

  if (isKicked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center text-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-red-900/40 p-10 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 blur-3xl rounded-full scale-110" />
          <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500 text-3xl font-black mx-auto mb-6 relative z-10">
            🚫
          </div>
          <h2 className="text-3xl font-black font-display text-white mb-3 relative z-10 leading-snug">Je bent verwijderd</h2>
          <p className="text-slate-400 text-sm mb-8 font-sans leading-relaxed relative z-10">
            De host heeft je uit deze quizlobby gekickt. Dit kan zijn wegens een ongepaste naam, onsportief gedrag of omdat de lobby opnieuw is opgestart.
          </p>
          <button
            onClick={onExit}
            className="w-full bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-extrabold font-display py-4 rounded-xl shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer relative z-10"
          >
            Terug naar Startpagina
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${activeTheme.bgClasses} ${isThemeDark ? "text-white" : "text-slate-800"} flex flex-col justify-between p-4 font-sans selection:bg-indigo-100 transition-all duration-700 relative`}>
      {/* Decorative background overlays for themes */}
      {activeTheme.name !== "Standaard" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          {activeTheme.name === "Winter" && (
            <>
              <div className="absolute top-[10%] left-[15%] text-2xl animate-bounce">❄️</div>
              <div className="absolute top-[35%] left-[85%] text-xl animate-bounce">❄️</div>
              <div className="absolute top-[75%] left-[8%] text-3xl animate-bounce">❄️</div>
              <div className="absolute top-[18%] left-[55%] text-lg animate-bounce">❄️</div>
              <div className="absolute top-[65%] left-[70%] text-2xl animate-bounce">❄️</div>
            </>
          )}
          {activeTheme.name === "Zomer" && (
            <>
              <div className="absolute top-[8%] left-[22%] text-3xl animate-spin duration-10000">☀️</div>
              <div className="absolute top-[20%] left-[80%] text-3xl animate-pulse">🌴</div>
              <div className="absolute bottom-[12%] left-[6%] text-2xl">🍹</div>
              <div className="absolute bottom-[18%] right-[12%] text-3xl animate-bounce">🍦</div>
            </>
          )}
          {activeTheme.name === "Halloween" && (
            <>
              <div className="absolute top-[12%] left-[12%] text-3xl animate-bounce">👻</div>
              <div className="absolute top-[45%] left-[82%] text-3xl animate-pulse">🎃</div>
              <div className="absolute bottom-[18%] left-[40%] text-3xl animate-bounce">🦇</div>
              <div className="absolute top-[28%] left-[68%] text-2xl">🕸️</div>
            </>
          )}
          {activeTheme.name === "Kosmisch" && (
            <>
              <div className="absolute top-[12%] left-[22%] text-lg animate-pulse">⭐</div>
              <div className="absolute top-[48%] left-[85%] text-xl animate-pulse">✨</div>
              <div className="absolute bottom-[18%] left-[12%] text-3xl animate-pulse">🪐</div>
              <div className="absolute top-[68%] left-[58%] text-xl animate-pulse">🌟</div>
            </>
          )}
          {activeTheme.name === "Neon Retro" && (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_95%,rgba(244,63,94,0.15)_95%)] bg-[size:100%_40px] animate-pulse" />
              <div className="absolute top-[12%] left-[12%] text-2xl animate-pulse">⚡</div>
              <div className="absolute top-[58%] left-[85%] text-2xl animate-pulse">🕹️</div>
            </>
          )}
        </div>
      )}

      {isLoading || !playerUid ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-slate-400 text-sm">Deelnemen aan spel...</p>
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
              <div className="w-24 h-24 bg-white border-4 border-indigo-100 rounded-full flex items-center justify-center shadow-xs overflow-hidden">
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-full uppercase tracking-wider">
                  Ingelogd als {displayName}
                </span>
                <h1 className={`text-2xl font-display ${textTitleClass}`}>
                  Je bent binnen!
                </h1>
                <p className={`text-sm max-w-xs mx-auto ${textMutedClass}`}>
                  Wacht geduldig tot de host het spel start. Je naam verschijnt op het grote scherm!
                </p>
              </div>

              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-3 rounded-2xl border border-indigo-100 font-bold justify-center font-mono w-full">
                Code: {String(session?.code || "").padStart(6, "0").slice(0, 3)} {String(session?.code || "").padStart(6, "0").slice(3)}
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-6 px-4 relative z-10"
            >
              <div className="space-y-1">
                <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-full uppercase tracking-wider">
                  Bereid je voor!
                </span>
                <p className="text-slate-400 text-xs font-bold font-mono tracking-wider">
                  VRAAG {currentQuestionIdx + 1} VAN DE {session.totalQuestions}
                </p>
              </div>

              <div className={`${activeTheme.cardBg} rounded-3xl p-8 shadow-lg max-w-sm w-full text-center space-y-3 border border-white/5 relative z-10`}>
                <p className="text-[10px] text-indigo-200 font-extrabold tracking-widest uppercase">
                  {currentQuestionIdx === 0 ? "QUIZ" : "VRAAG"}
                </p>
                <h2 className="font-extrabold font-display text-2xl md:text-3xl text-white leading-tight">
                  {currentQuestionIdx === 0 
                    ? (session?.quizTitle || "Inladen...")
                    : (activeQuestion?.questionText || "Volgende vraag...")}
                </h2>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full bg-indigo-500/10 animate-ping" />
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={playerCountdown}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1.1, opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md font-black text-2xl ${
                      playerCountdown === "GO!" 
                        ? "bg-emerald-500 text-white animate-pulse" 
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {playerCountdown}
                  </motion.div>
                </AnimatePresence>
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
              className="flex-1 flex flex-col justify-between space-y-4 relative z-10"
            >
              {/* High-visibility Dynamic Question Display Header */}
              <div className={`${activeTheme.cardBg} rounded-3xl p-5 md:p-6 flex flex-col gap-3 shadow-md border border-white/5 relative z-10`}>
                <div className="flex justify-between items-center bg-white/5 px-2.5 py-1 rounded-full border border-white/10 self-start w-full">
                  <span className="text-[10px] text-indigo-300 font-black tracking-widest uppercase">
                    VRAAG {currentQuestionIdx + 1} / {session.totalQuestions}
                  </span>
                  <div className="bg-white/10 border border-white/15 px-2 py-0.5 rounded-full text-white font-bold font-mono text-[10px] flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-indigo-300 animate-pulse" /> {secondsLeft}s
                  </div>
                </div>

                <h1 className="text-lg sm:text-xl font-bold font-display text-white leading-snug">
                  {activeQuestion.questionText}
                </h1>

                {activeQuestion.imageUrl && (
                  <div className="flex justify-center max-h-36 overflow-hidden rounded-xl border border-white/5 bg-black/20">
                    <img 
                      src={activeQuestion.imageUrl} 
                      alt="Question Context" 
                      referrerPolicy="no-referrer"
                      className="object-contain" 
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons Interface */}
              {!hasAnswered ? (
                !isAnsweringOpen ? (
                  <div className={`flex-1 flex flex-col items-center justify-center text-center space-y-4 ${activeTheme.cardBg} rounded-3xl p-8 shadow-md relative z-10`}>
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin mb-2" />
                    <h3 className="text-xl font-extrabold font-display text-indigo-300">Maak je klaar! 🎰</h3>
                    <p className="text-slate-400 text-xs">
                      Je mag zo meteen aan het Rad van Fortuin draaien...
                    </p>
                  </div>
                ) : activeQuestion.questionType === "wheel_spin" ? (
                  <div className={`flex-1 flex flex-col justify-center items-center py-4 px-2 space-y-4 ${activeTheme.cardBg} rounded-3xl p-6 relative z-10 shadow-lg border border-white/5`}>
                    <div className="text-center">
                      <span className="text-xs font-black tracking-widest text-amber-500 uppercase flex items-center justify-center gap-1">
                        🎰 Geluksronde - Waag een gokje
                      </span>
                      <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                        Klik op de spin knop om te zien hoeveel bonuspunten jij verdient of verliest!
                      </p>
                    </div>

                    <LuckyWheel
                      options={activeQuestion.options}
                      onSpinComplete={async (winIdx, winOptionText) => {
                        if (winOptionText.includes("+") || winOptionText.toLowerCase().includes("verdubbel") || winOptionText.toLowerCase().includes("double") || winOptionText.toLowerCase().includes("x2")) {
                          confetti({
                            particleCount: 80,
                            spread: 60,
                            origin: { y: 0.75 },
                            colors: ["#F59E0B", "#10B981", "#3B82F6", "#EC4899"]
                          });
                        }
                        await submitAnswerToSupabase(winIdx);
                      }}
                    />
                  </div>
                ) : activeQuestion.questionType === "puzzle" ? (
                  <div className="flex-1 flex flex-col gap-4 pb-4 select-none">
                    <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-2xl text-center">
                      <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">🧩 Verplaats de kaarten in de correcte volgorde!</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Bovenste is #1, onderste is de laatste.</p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <AnimatePresence mode="popLayout">
                        {puzzleItems.map((item, idx) => {
                          const cardColor = getPuzzleCardColor(item.text, item.originalIndex);
                          return (
                            <motion.div
                              layout
                              key={item.originalIndex}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                              className={`flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r ${cardColor} shadow-md border border-white/10`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-black/25 flex items-center justify-center font-black font-mono text-xs text-white shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-extrabold text-white truncate text-base">
                                  {item.text}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moveItem(idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/20 hover:bg-black/35 text-white disabled:opacity-20 disabled:hover:bg-black/20 transition-all cursor-pointer"
                                  title="Omhoog verplaatsen"
                                >
                                  <ChevronUp className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(idx, idx + 1)}
                                  disabled={idx === puzzleItems.length - 1}
                                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/20 hover:bg-black/35 text-white disabled:opacity-20 disabled:hover:bg-black/20 transition-all cursor-pointer"
                                  title="Omlaag verplaatsen"
                                >
                                  <ChevronDown className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={async () => {
                        let val = 0;
                        for (let i = 0; i < puzzleItems.length; i++) {
                          val = val * 10 + puzzleItems[i].originalIndex;
                        }
                        await submitAnswerToSupabase(val);
                      }}
                      className="w-full mt-2 bg-purple-650 hover:bg-purple-550 text-white font-display font-black py-4 rounded-2xl border-b-6 border-purple-800 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-base cursor-pointer"
                    >
                      Volgorde Bevestigen 🚀
                    </button>
                  </div>
                ) : activeQuestion.questionType === "slider" ? (
                  <div className="flex-1 flex flex-col gap-6 py-4 px-2 space-y-4 select-none">
                    <div className="text-center">
                      <span className="text-sm font-black tracking-widest text-teal-400 uppercase flex items-center justify-center gap-1">
                        🎚️ Schuif naar het juiste getal
                      </span>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                        Gebruik de schuifbalk om een waarde van 1 tot {activeQuestion.options?.length ?? 5} te kiezen!
                      </p>
                    </div>

                    {/* Massive visual value display */}
                    <div className="relative flex justify-center items-center py-6">
                      <div className="absolute inset-0 bg-teal-500/5 blur-2xl rounded-full" />
                      <motion.div
                        key={sliderVal}
                        initial={{ scale: 0.75, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-28 h-28 rounded-full bg-teal-500 text-white text-5xl font-black font-display flex items-center justify-center shadow-lg shadow-teal-500/25 border-4 border-white relative"
                      >
                        {sliderVal}
                        <div className="absolute -bottom-1 bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                          SCHAAL
                        </div>
                      </motion.div>
                    </div>

                    {/* Highly tactile slider input */}
                    <div className="space-y-4 px-4">
                      <input
                        type="range"
                        min="1"
                        max={activeQuestion.options?.length ?? 5}
                        step="1"
                        value={sliderVal}
                        onChange={(e) => setSliderVal(Number(e.target.value))}
                        className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500 border border-slate-800"
                      />
                      <div className="flex justify-between text-xs font-mono text-slate-400 px-1 font-bold">
                        <span>Min (1)</span>
                        <span>Midden ({Math.ceil((activeQuestion.options?.length ?? 5) / 2)})</span>
                        <span>Max ({activeQuestion.options?.length ?? 5})</span>
                      </div>
                    </div>

                    {/* Selector Dots */}
                    <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                      {(activeQuestion.options || ["1", "2", "3", "4", "5"]).map((_, idx) => {
                        const num = idx + 1;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSliderVal(num)}
                            className={`w-9 h-9 rounded-full font-black text-sm flex items-center justify-center border-2 transition-all cursor-pointer ${
                              sliderVal === num
                                ? "bg-teal-500 border-teal-600 text-white shadow-md scale-110"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={async () => {
                        await submitAnswerToSupabase(sliderVal - 1);
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-display font-black py-4 rounded-2xl border-b-6 border-teal-800 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-base cursor-pointer"
                    >
                      Bevestig Getal ({sliderVal}) ⭐
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-3 pb-4">
                    {/* Instructions banner */}
                    {activeQuestion.correctOptionIndices && activeQuestion.correctOptionIndices.length > 1 && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-200 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950/40 text-xs font-bold flex items-center gap-2">
                        <span className="animate-pulse">💡</span>
                        <span>MULTI-SELECT: Vink alle juiste opties aan en druk op de grote knop onderaan!</span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeQuestion.options.map((option, idx) => {
                        const isMultiCorrect = activeQuestion.correctOptionIndices && activeQuestion.correctOptionIndices.length > 1;
                        const isSelected = selectedIndices.includes(idx);
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isMultiCorrect) {
                                handleToggleOptionSelection(idx);
                              } else {
                                handleSelectOption(idx);
                              }
                            }}
                            className={`w-full rounded-2xl text-white font-display text-xl font-black flex items-center justify-between px-6 py-4 gap-4 border-b-6 shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ${
                              optionColors[idx % optionColors.length]
                            } ${isSelected ? "ring-4 ring-white border-white scale-[1.02]" : ""}`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <ShapeIcon idx={idx} className="w-8 h-8 shrink-0 fill-white" />
                              <span className="text-base font-bold text-left block max-w-full leading-normal truncate pr-2">
                                {option}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="bg-white/35 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ring-2 ring-white">
                                ✓
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {activeQuestion.correctOptionIndices && activeQuestion.correctOptionIndices.length > 1 && (
                      <button
                        onClick={() => handleSubmitMultipleAnswers()}
                        disabled={selectedIndices.length === 0}
                        className="w-full mt-2 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-650 text-white font-display font-black py-4 rounded-2xl border-b-6 border-indigo-800 focus:scale-[0.99] hover:scale-[1.01] shadow-lg transition-all uppercase tracking-widest text-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        Antwoord Insturen ({selectedIndices.length})
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* WAITING TIMER STATE FOR FASTER RESPONDERS */
                <div className={`${activeTheme.cardBg} flex-1 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl p-8 shadow-md border border-white/5`}>
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-400/30 flex items-center justify-center text-2xl font-bold animate-bounce shadow-md">
                    ✓
                  </div>
                  <h3 className={`text-2xl font-display ${textTitleClass}`}>Antwoord ingediend!</h3>
                  <p className={`text-sm max-w-xs ${textMutedClass}`}>
                    Je was supersnel! Wacht even tot de rest klaar is of de tijd afloopt.
                  </p>
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-450" />
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
               {activeQuestion.questionType === "wheel_spin" ? (
                /* LUCKY WHEEL RESULT DESIGN */
                <div className="bg-amber-500 border-b-8 border-amber-600 rounded-3xl p-8 text-white text-center space-y-6 shadow-md">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-extrabold mx-auto animate-bounce">
                    <Sparkles className="w-10 h-10 text-yellow-300" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider">Gok Resultaat! 🎰</h2>
                    <p className="text-amber-100 font-semibold text-sm">
                      Jij landde op: <span className="underline font-black">{self.currentAnswerIndex !== null && self.currentAnswerIndex !== undefined && self.currentAnswerIndex >= 0 ? activeQuestion.options[self.currentAnswerIndex] : "Geen gok gedaan"}</span>
                    </p>
                  </div>

                  <div className="bg-amber-600/45 p-4 rounded-2xl border border-white/10 inline-block">
                    <p className="text-xs text-amber-250 uppercase font-black tracking-widest text-[9px] mb-0.5">Verandering Score</p>
                    <h3 className="text-2xl font-mono font-bold text-white flex items-center gap-1 justify-center">
                      {getPointsEarnedForThisQuestion() >= 0 ? "+" : ""}{getPointsEarnedForThisQuestion()} pt
                    </h3>
                  </div>
                  
                  <p className="text-xs text-amber-100/80 italic leading-relaxed">
                    Spannende gokronde! Je score is bijgewerkt op basis van jouw geluksspin.
                  </p>
                </div>
              ) : checkIsCorrect(self.currentAnswerIndex, activeQuestion) ? (
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
                      <Sparkles className="w-5 h-5 text-yellow-300 inline animate-spin-slow" /> +{getPointsEarnedForThisQuestion()} pt
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
                      Het juiste antwoord was: <span className="font-bold underline">
                        {(activeQuestion.correctOptionIndices && activeQuestion.correctOptionIndices.length > 1)
                          ? activeQuestion.correctOptionIndices.map((idx) => activeQuestion.options[idx]).join(", ")
                          : activeQuestion.options[activeQuestion.correctOptionIndex ?? 0]}
                      </span>
                    </p>
                  </div>

                  <div className="bg-red-650/40 p-4 rounded-xl border border-white/10 text-xs">
                    Volgende vraag beter! Neem de tijd om aandachtig te lezen.
                  </div>
                </div>
              )}

              {/* Candidate current points indicators */}
              <div className="mt-4 bg-slate-900 text-white p-4.5 rounded-3xl border-b-4 border-slate-950 flex justify-between items-center shadow-lg w-full max-w-sm mx-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <span className="text-xs text-slate-300 font-extrabold uppercase tracking-widest">
                    Jouw Totaalscore
                  </span>
                </div>
                <span className="text-xl font-black font-mono text-indigo-400">
                  {self.score} pt
                </span>
              </div>

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
              <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-550 rounded-2xl flex items-center justify-center text-indigo-300 shadow-md">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <p className="text-indigo-400 text-sm font-extrabold tracking-wider uppercase">Tussenstand</p>
                <h2 className={`text-3xl font-display ${textTitleClass}`}>
                  Mijn Score: {self.score} pt
                </h2>
                <p className={`text-sm ${textMutedClass}`}>
                  De host toont nu de top 5 op het grote scherm. Maak je klaar voor de volgende ronde!
                </p>
              </div>

              <div className="flex items-center gap-2 bg-indigo-500/25 text-indigo-300 px-4 py-2 text-sm rounded-full border border-indigo-400/40 font-bold justify-center font-mono animate-pulse">
                Huidige streak: {self.streak} 🔥
              </div>
            </motion.div>
          )}

          {/* FINAL RESULTS GRAPH/PODIUM CLIENT DISPLAY */}
          {session?.status === "ended" && self && (() => {
            const revealStage = session?.currentQuestionIndex ?? 0;

            // Check if this player's rank is officially revealed yet
            let isMyRankRevealed = false;
            if (playerRank !== null) {
              if (playerRank === 5 && revealStage >= 1) isMyRankRevealed = true;
              else if (playerRank === 4 && revealStage >= 2) isMyRankRevealed = true;
              else if (playerRank === 3 && revealStage >= 3) isMyRankRevealed = true;
              else if (playerRank === 2 && revealStage >= 4) isMyRankRevealed = true;
              else if (playerRank === 1 && revealStage >= 5) isMyRankRevealed = true;
              else if (playerRank > 5 && revealStage >= 5) isMyRankRevealed = true;
            }

            // If my rank is NOT yet revealed, show the Live Reveal Arena!
            if (!isMyRankRevealed) {
              return (
                <motion.div
                  key="ended-live-reveal-arena"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col space-y-6 max-w-md mx-auto py-6 px-4"
                >
                  <div className="text-center space-y-2">
                    <span className="bg-indigo-500/10 text-indigo-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/20 animate-pulse">
                      Live Finale Onthulling
                    </span>
                    <h1 className={`text-3xl font-display ${textTitleClass} leading-tight`}>
                      Op welke plaats sta jij?
                    </h1>
                    <p className={`text-sm ${textMutedClass}`}>
                      De host is nu live de eindstand aan het onthullen! Kijk mee hoe de slots openen... 🤫
                    </p>
                  </div>

                  {/* Real-time progression stats for the 5 spots */}
                  <div className="space-y-3 bg-slate-900/40 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/10 shadow-lg backdrop-blur-xs">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left px-1">
                      Finale Standen
                    </p>
                    
                    {[1, 2, 3, 4, 5].map((place) => {
                      // Determine if this place is currently revealed
                      let isPlaceRevealed = false;
                      if (place === 5 && revealStage >= 1) isPlaceRevealed = true;
                      if (place === 4 && revealStage >= 2) isPlaceRevealed = true;
                      if (place === 3 && revealStage >= 3) isPlaceRevealed = true;
                      if (place === 2 && revealStage >= 4) isPlaceRevealed = true;
                      if (place === 1 && revealStage >= 5) isPlaceRevealed = true;

                      const playerAtPlace = allPlayersSorted[place - 1];

                      if (isPlaceRevealed && playerAtPlace) {
                        const { displayName: pName, avatarUrl: pAvatar } = parseNicknameAndAvatar(playerAtPlace.nickname || "");
                        const isYou = playerRank === place;
                        return (
                          <motion.div
                            key={`place-${place}`}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isYou
                                ? "bg-indigo-650/30 border-indigo-500 shadow-md"
                                : "bg-slate-900/60 border-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative">
                                <img src={pAvatar} alt="avatar" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700" />
                                <span className="absolute -top-1 -left-1 bg-indigo-650 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white text-white">
                                  {place}
                                </span>
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="font-bold text-slate-205 text-sm truncate flex items-center gap-1.5">
                                  <span className="text-white">{pName.replace(/[:|~]/g, "")}</span>
                                  {isYou && (
                                    <span className="bg-indigo-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm">Jij!</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {place === 1 ? "🏆 Winnaar" : place <= 3 ? "🥈 Podium" : "🎖️ Finalist"}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-extrabold text-indigo-400">
                              {playerAtPlace.score} pt
                            </span>
                          </motion.div>
                        );
                      } else {
                        return (
                          <div
                            key={`place-${place}`}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/20 border border-slate-800/40 opacity-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 text-xs">
                                🔒
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-bold text-slate-500">???</p>
                                <p className="text-[10px] text-slate-600">Nog niet onthuld</p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-700">??? pt</span>
                          </div>
                        );
                      }
                    })}
                  </div>

                  <div className="bg-slate-900/80 dark:bg-slate-950/80 text-slate-400 rounded-2xl p-4 flex items-center justify-center gap-3 border border-slate-800">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span className="font-bold text-xs uppercase tracking-widest font-mono text-white">Lobby Onthulling Live...</span>
                  </div>
                </motion.div>
              );
            }

            // 3. YOUR RANK IS REVEALED! SHOW INDIVIDUAL CONGRATULATIONS WITH AWESOME VISUALS!
            if (playerRank === 1) {
              return (
                <motion.div
                  key="ended-winner"
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto py-10"
                >
                  <div className="w-32 h-32 bg-amber-500/20 border-4 border-amber-400 rounded-full flex items-center justify-center text-amber-400 shadow-2xl relative">
                    <Trophy className="w-16 h-16 animate-bounce text-amber-400" />
                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-1.5 animate-pulse">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-amber-400 text-xs font-black uppercase tracking-widest font-mono">
                      🏆 EERSTE PLAATS - CHAMPION! 🏆
                    </p>
                    <h1 className={`text-4xl font-display ${textTitleClass} leading-tight`}>
                      EINDWINNAAR!
                    </h1>
                    <p className={`font-medium text-sm ${textMutedClass}`}>
                      Gefeliciteerd {displayName}! Je bent de absolute winnaar geworden met een schitterende score van {self.score} pt!
                    </p>
                  </div>
                  
                  <button
                    onClick={onExit}
                    className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 py-4 rounded-xl font-bold tracking-wide transition cursor-pointer shadow-md text-sm uppercase mt-4 animate-pulse"
                  >
                    Klaar en Sluiten 🎉
                  </button>
                </motion.div>
              );
            }

            if (playerRank === 2) {
              return (
                <motion.div
                  key="ended-silver"
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto py-10"
                >
                  <div className="w-28 h-28 bg-slate-100/10 border-4 border-slate-300 rounded-full flex items-center justify-center text-slate-300 shadow-2xl relative animate-bounce animate-duration-1000">
                    <Award className="w-14 h-14 text-slate-300" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-300 text-xs font-black uppercase tracking-widest font-mono">
                      🥈 TWEEDE PLAATS - SILVER! 🥈
                    </p>
                    <h1 className={`text-3.5xl font-display ${textTitleClass} leading-tight`}>
                      Fantastisch!
                    </h1>
                    <p className={`font-medium text-sm ${textMutedClass}`}>
                      Gefeliciteerd {displayName}! Je hebt een waanzinnige 2e plaats bemachtigd op het podium met {self.score} pt!
                    </p>
                  </div>
                  
                  <button
                    onClick={onExit}
                    className="w-full bg-indigo-650 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold tracking-wide transition cursor-pointer shadow-md text-sm uppercase mt-4"
                  >
                    Klaar en Sluiten 🎉
                  </button>
                </motion.div>
              );
            }

            if (playerRank === 3) {
              return (
                <motion.div
                  key="ended-bronze"
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto py-10"
                >
                  <div className="w-28 h-28 bg-amber-950/20 border-4 border-amber-600 rounded-full flex items-center justify-center text-amber-500 shadow-2xl relative animate-bounce animate-duration-1000">
                    <Award className="w-14 h-14 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-amber-500 text-xs font-black uppercase tracking-widest font-mono">
                      🥉 DERDE PLAATS - BRONZE! 🥉
                    </p>
                    <h1 className={`text-3.5xl font-display ${textTitleClass} leading-tight`}>
                      Super gedaan!
                    </h1>
                    <p className={`font-medium text-sm ${textMutedClass}`}>
                      Mooi werk {displayName}! Je eindigt op een eervolle 3e plaats en claimt brons met {self.score} pt!
                    </p>
                  </div>
                  
                  <button
                    onClick={onExit}
                    className="w-full bg-indigo-655 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold tracking-wide transition cursor-pointer shadow-md text-sm uppercase mt-4"
                  >
                    Klaar en Sluiten 🎉
                  </button>
                </motion.div>
              );
            }

            if (playerRank === 4 || playerRank === 5) {
              return (
                <motion.div
                  key="ended-finalist"
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto py-10"
                >
                  <div className="w-28 h-28 bg-indigo-950/40 border-4 border-indigo-400 rounded-full flex items-center justify-center text-indigo-400 shadow-2xl relative animate-bounce animate-duration-1200">
                    <Award className="w-14 h-14 text-indigo-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-indigo-400 text-xs font-black uppercase tracking-widest font-mono">
                      🎖️ GEFELICITEERD - FINALIST! 🎖️
                    </p>
                    <h1 className={`text-3.5xl font-display ${textTitleClass} leading-tight`}>
                      {playerRank}e Plaats!
                    </h1>
                    <p className={`font-medium text-sm ${textMutedClass}`}>
                      Wauw {displayName}! Je bent geëindigd als een van de officiële top finalisten (de {playerRank}e plaats!) met een score van {self.score} pt! Wat een prestatie!
                    </p>
                  </div>
                  
                  <button
                    onClick={onExit}
                    className="w-full bg-indigo-655 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold tracking-wide transition cursor-pointer shadow-md text-sm uppercase mt-4"
                  >
                    Klaar en Sluiten 🎉
                  </button>
                </motion.div>
              );
            }

            // For ranks 6 and below
            return (
              <motion.div
                key="ended-finished-others"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto py-10"
              >
                <div className="w-24 h-24 bg-teal-950/25 border-2 border-teal-500 rounded-full flex items-center justify-center text-teal-400 shadow-md">
                  <Award className="w-12 h-12" />
                </div>

                <div className="space-y-2">
                  <h1 className={`text-3xl font-display ${textTitleClass}`}>Einde van de Quiz!</h1>
                  <p className={`text-sm ${textMutedClass}`}>
                    Gefeliciteerd met het volbrengen van alle vragen! Jouw score en positie zijn hieronder zichtbaar.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 w-full">
                  {playerRank !== null && (
                    <div className="bg-linear-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5 w-full space-y-1 border-b-4 border-emerald-700 shadow-md font-display">
                      <p className="text-xs text-emerald-100 font-bold uppercase tracking-widest">Jouw Eindpositie</p>
                      <h2 className="text-3.5xl font-black font-mono">
                        {playerRank}e <span className="text-lg font-sans font-medium">plaats</span>
                      </h2>
                      <p className="text-xs text-emerald-100/80 font-sans">
                        van de {allPlayersSorted.length} Deelnemers
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-5 w-full space-y-1 border-b-4 border-slate-950 border border-slate-800 shadow-sm font-display">
                    <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Mijn Eindscore</p>
                    <h2 className="text-3xl font-black font-mono text-white">{self.score} pt</h2>
                  </div>
                </div>

                <button
                  onClick={onExit}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold tracking-wide transition cursor-pointer shadow-md mt-4"
                >
                  Sluiten en Terug
                </button>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      )}
    </div>
  );
}
