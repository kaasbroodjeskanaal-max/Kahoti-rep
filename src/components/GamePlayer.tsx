import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { GameSession, Player, Question, checkIsCorrect, getThemeConfig } from "../types";
import { Check, X, Award, Loader2, Sparkles, LogOut, Clock, Trophy, ChevronUp, ChevronDown, Sliders, GripVertical, Flame, Crown, Medal, Lock, Dices, ListOrdered, Lightbulb, Snowflake, Sun, Palmtree, Ghost, Zap, Gamepad2, Ban, Search, Users, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parseNicknameAndAvatar, ShapeIcon, parseQuizTitle } from "../avatarUtils";
import confetti from "canvas-confetti";
import { LuckyWheel } from "./LuckyWheel";
import { translations } from "../translations";
import { sfx } from "../soundManager";

interface GamePlayerProps {
  lang?: "nl" | "en";
  sessionId: string;
  nickname: string;
  onExit: () => void;
}

export default function GamePlayer({ lang = "nl", sessionId, nickname, onExit }: GamePlayerProps) {
  const t = translations[lang];

  const { displayName, avatarUrl, isVerified } = parseNicknameAndAvatar(nickname || "");
  const [session, setSession] = useState<GameSession | null>(null);
  const [self, setSelf] = useState<Player | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Maintain refs to avoid stale closure pitfalls in interval timers and realtime database subscriptions
  const questionsRef = React.useRef<Question[]>([]);
  const isLoadingRef = React.useRef<boolean>(true);
  const isFetchingQuestionsRef = React.useRef<boolean>(false);
  const isFetchingSessionRef = React.useRef<boolean>(false);
  const lastInitializedQuestionIdxRef = React.useRef<number | null>(null);
  const localQuestionStartRef = React.useRef<number | null>(null);

  const updateQuestions = (newQuestions: Question[]) => {
    questionsRef.current = newQuestions;
    setQuestions(newQuestions);
  };

  const updateIsLoading = (loading: boolean) => {
    isLoadingRef.current = loading;
    setIsLoading(loading);
  };

  const [playerUid, setPlayerUid] = useState<string>("");
  const [playerCountdown, setPlayerCountdown] = useState<number | string>(3);
  const [isKicked, setIsKicked] = useState(false);
  const [puzzleItems, setPuzzleItems] = useState<{ originalIndex: number; text: string }[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [sliderVal, setSliderVal] = useState<number>(3);

  const [allPlayersSorted, setAllPlayersSorted] = useState<{ id: string; nickname: string; score: number }[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [playerEndTab, setPlayerEndTab] = useState<"podium" | "ranking">("podium");
  const [playerRankingSearch, setPlayerRankingSearch] = useState<string>("");

  // Anti-cheat tracking states
  const [isCheatingBlocked, setIsCheatingBlocked] = useState(false);
  const [cheatStrikes, setCheatStrikes] = useState(0);

  const currentQuestionIdx = session?.currentQuestionIndex ?? 0;
  const activeQuestion = questions[currentQuestionIdx];

  // States & Ref for player lobby music
  const [selectedPlayerLobbyMusicUrl, setSelectedPlayerLobbyMusicUrl] = useState("https://www.image2url.com/r2/default/audio/1781202460294-d546fcf7-83a2-4b68-9824-82d64768dffb.mp3");
  const playerLobbyAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // States & Ref for start intro video (eenmalig bij aanvang van de quiz)
  const [hasWatchedIntro, setHasWatchedIntro] = useState(false);
  const [isIntroMuted, setIsIntroMuted] = useState(false);
  const introVideoRef = React.useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!sessionId || session?.status !== "lobby") return;

    const fetchLobbyMusic = async () => {
      try {
        const res = await fetch(`/api/session-music/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.musicUrl) {
            setSelectedPlayerLobbyMusicUrl((prev) => {
              if (data.musicUrl !== prev) {
                return data.musicUrl;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error("Fout bij ophalen speler lobbymuziek:", err);
      }
    };

    fetchLobbyMusic();
    const intv = setInterval(fetchLobbyMusic, 1500);

    return () => clearInterval(intv);
  }, [sessionId, session?.status]);

  useEffect(() => {
    const isLobbyActive = session?.status === "lobby";

    if (isLobbyActive && selectedPlayerLobbyMusicUrl) {
      if (!playerLobbyAudioRef.current) {
        const audio = new Audio(selectedPlayerLobbyMusicUrl);
        audio.loop = true;
        playerLobbyAudioRef.current = audio;
        audio.play().catch((e) => {
          console.warn("Player lobby audio autoplay blocked:", e);
        });
      } else {
        const currentSrc = playerLobbyAudioRef.current.src;
        if (!currentSrc.includes(selectedPlayerLobbyMusicUrl) && selectedPlayerLobbyMusicUrl) {
          playerLobbyAudioRef.current.src = selectedPlayerLobbyMusicUrl;
          playerLobbyAudioRef.current.load();
        }
        if (playerLobbyAudioRef.current.paused) {
          playerLobbyAudioRef.current.play().catch((e) => {
            console.warn("Player lobby audio failed to play:", e);
          });
        }
      }
    } else {
      if (playerLobbyAudioRef.current) {
        playerLobbyAudioRef.current.pause();
        playerLobbyAudioRef.current = null;
      }
    }
  }, [session?.status, selectedPlayerLobbyMusicUrl]);

  // Clean play on unmount completely
  useEffect(() => {
    return () => {
      if (playerLobbyAudioRef.current) {
        playerLobbyAudioRef.current.pause();
        playerLobbyAudioRef.current = null;
      }
    };
  }, []);

  // Audio elements for questions playing music
  const questionAudioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const isQuestionActive = session?.status === "question";
    const timeLimit = activeQuestion?.timeLimit;

    if (isQuestionActive) {
      const url = timeLimit === 10
        ? "https://www.image2url.com/r2/default/audio/1781202021800-73412b16-d558-4596-828e-b1fff5e7170a.mp3"
        : "https://www.image2url.com/r2/default/audio/1781202394272-3a6b2a52-a005-4588-9d46-de96327a7bcd.mp3";

      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
        questionAudioRef.current = null;
      }

      const audio = new Audio(url);
      audio.loop = true; // Loop the question track nicely so it continues through long question timers
      questionAudioRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Audio autoplay blocked or failed for player:", err);
        });
      }
    } else {
      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
        questionAudioRef.current = null;
      }
    }

    return () => {
      if (questionAudioRef.current) {
        questionAudioRef.current.pause();
        questionAudioRef.current = null;
      }
    };
  }, [session?.status, session?.currentQuestionIndex, activeQuestion?.timeLimit]);

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
  }, [session?.status, sessionId, playerUid, session?.currentQuestionIndex]);

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
    if (!sessionId || !playerUid || isFetchingSessionRef.current) return;
    try {
      isFetchingSessionRef.current = true;

      // 1. Fetch Session and Player info in parallel to avoid sequential network waterfall
      const [sessionPayload, playerPayload] = await Promise.all([
        supabase
          .from("sessions")
          .select("*")
          .eq("id", sessionId)
          .single(),
        supabase
          .from("players")
          .select("*")
          .eq("id", playerUid)
          .eq("session_id", sessionId)
          .maybeSingle()
      ]);

      const { data: sessionData, error: sErr } = sessionPayload;
      const { data: playerData, error: pErr } = playerPayload;

      if (sErr || !sessionData) {
        alert("Plaatsen mislukt: De host heeft deze quizsessie afgesloten of de sessie bestaat niet meer.");
        onExit();
        return;
      }

      setSession((prev) => {
        if (prev) {
          if (sessionData.status !== "lobby" && sessionData.current_question_index < prev.currentQuestionIndex) {
            return prev;
          }
        }
        return {
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
        };
      });

      // 2. Fetch Quiz questions if not cached yet
      if (questionsRef.current.length === 0 && sessionData.quiz_id && !isFetchingQuestionsRef.current) {
        isFetchingQuestionsRef.current = true;
        supabase
          .from("quizzes")
          .select("questions")
          .eq("id", sessionData.quiz_id)
          .single()
          .then((res) => {
            isFetchingQuestionsRef.current = false;
            if (!res.error && res.data) {
              updateQuestions(res.data.questions || []);
            } else if (res.error) {
              console.error("Fout bij ophalen quizvragen:", res.error);
            }
          });
      }

      if (pErr) {
        console.error("Fout tijdens ophalen spelerdata:", pErr);
      }

      if (!isLoadingRef.current && !playerData) {
        setIsKicked(true);
        updateIsLoading(false);
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
      updateIsLoading(false);
    } catch (err) {
      console.error("Fout tijdens ophalen spelerdata:", err);
    } finally {
      isFetchingSessionRef.current = false;
    }
  };

  // 1. Double layer realtime updates: Periodical Polling fallback + Realtime listener
  // Polling fallback interval is optimized to 1500ms (to prevent system throttle and minimize Supabase DQL usage)
  useEffect(() => {
    if (!sessionId || !playerUid) return;

    fetchSessionAndSelf();
    const interval = setInterval(fetchSessionAndSelf, 1500);

    const realtimeChannel = supabase
      .channel(`session-player-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new) {
            const sessionData = payload.new as any;
            setSession((prev) => {
              if (prev) {
                if (sessionData.status !== "lobby" && sessionData.current_question_index < prev.currentQuestionIndex) {
                  return prev;
                }
              }
              return {
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
              };
            });

            // Fetch questions if not cached
            if (questionsRef.current.length === 0 && sessionData.quiz_id && !isFetchingQuestionsRef.current) {
              isFetchingQuestionsRef.current = true;
              supabase
                .from("quizzes")
                .select("questions")
                .eq("id", sessionData.quiz_id)
                .single()
                .then((res) => {
                  isFetchingQuestionsRef.current = false;
                  if (!res.error && res.data) {
                    updateQuestions(res.data.questions || []);
                  }
                });
            }
          } else {
            fetchSessionAndSelf();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `id=eq.${playerUid}` },
        (payload) => {
          if (payload.new) {
            const playerData = payload.new as any;
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
            } else {
              setHasAnswered(false);
            }
          } else {
            fetchSessionAndSelf();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(realtimeChannel);
    };
  }, [sessionId, playerUid]);

  // Reset hasWatchedIntro if returning to lobby
  useEffect(() => {
    if (session?.status === "lobby") {
      setHasWatchedIntro(false);
    }
  }, [session?.status]);

  // Autoplay intro video for players on question 0
  useEffect(() => {
    if (session?.status === "countdown" && session?.currentQuestionIndex === 0 && !hasWatchedIntro) {
      if (introVideoRef.current) {
        introVideoRef.current.currentTime = 0;
        const playPromise = introVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Autoplay audio blocked on player device, muting:", err);
            if (introVideoRef.current) {
              introVideoRef.current.muted = true;
              setIsIntroMuted(true);
              introVideoRef.current.play().catch(() => {});
            }
          });
        }
      }
      // Safety fallback timer so players never get stuck if video fails to load
      const fallbackTimer = setTimeout(() => {
        setHasWatchedIntro(true);
      }, 6500);
      return () => clearTimeout(fallbackTimer);
    }
  }, [session?.status, session?.currentQuestionIndex, hasWatchedIntro]);

  const toggleIntroAudio = () => {
    if (introVideoRef.current) {
      const nextMuted = !introVideoRef.current.muted;
      introVideoRef.current.muted = nextMuted;
      setIsIntroMuted(nextMuted);
    }
  };

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

  // Subtle acoustic cue when seeing active results (correct or incorrect)
  useEffect(() => {
    if (!session || !self || !activeQuestion) return;

    if (session.status === "show_answer") {
      const isCorrect = checkIsCorrect(self.currentAnswerIndex, activeQuestion);
      if (isCorrect) {
        sfx.playCorrect();
      } else {
        sfx.playIncorrect();
      }
    }
  }, [session?.status, session?.currentQuestionIndex]);

  // Keep track of the last seen question index so we only reset answer state on real transitions
  const lastQuestionIdxRef = React.useRef<number | null>(null);

  // Reset answer states when the question index increments/changes
  useEffect(() => {
    if (session?.currentQuestionIndex !== undefined) {
      const isNewQuestion = lastQuestionIdxRef.current !== session.currentQuestionIndex;
      if (isNewQuestion) {
        lastQuestionIdxRef.current = session.currentQuestionIndex;
        setHasAnswered(false);
        setSelectedIndices([]);
        setIsCheatingBlocked(false);
      }

      const currentQ = questions[session.currentQuestionIndex];
      if (currentQ && currentQ.questionType === "slider") {
        if (isNewQuestion) {
          const isCustom = currentQ.sliderMin !== undefined || currentQ.sliderMax !== undefined;
          if (isCustom) {
            const min = currentQ.sliderMin ?? 1;
            const max = currentQ.sliderMax ?? 5;
            const mid = Math.round((min + max) / 2);
            setSliderVal(mid);
          } else {
            setSliderVal(Math.ceil((currentQ.options?.length || 5) / 2));
          }
        }
      } else if (isNewQuestion) {
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    const updated = [...puzzleItems];
    const draggedItem = updated[draggedIdx];
    updated.splice(draggedIdx, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIdx(index);
    setPuzzleItems(updated);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleTouchStart = (index: number) => {
    setDraggedIdx(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIdx === null) return;
    
    // Disable default body/document dragging scroll on touchmove
    if (e.cancelable) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    
    // Find the element currently being touched/dragged
    const draggedElement = document.querySelector(`[data-puzzle-idx="${draggedIdx}"]`) as HTMLElement;
    let originalPointerEvents = "";
    if (draggedElement) {
      originalPointerEvents = draggedElement.style.pointerEvents;
      draggedElement.style.pointerEvents = "none";
    }

    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (draggedElement) {
      draggedElement.style.pointerEvents = originalPointerEvents;
    }

    if (!element) return;

    const cardElement = element.closest("[data-puzzle-idx]");
    if (cardElement) {
      const targetIndex = parseInt(cardElement.getAttribute("data-puzzle-idx") || "", 10);
      if (!isNaN(targetIndex) && targetIndex !== draggedIdx) {
        const updated = [...puzzleItems];
        const draggedItem = updated[draggedIdx];
        updated.splice(draggedIdx, 1);
        updated.splice(targetIndex, 0, draggedItem);
        setDraggedIdx(targetIndex);
        setPuzzleItems(updated);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIdx(null);
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

    // Play subtle answer selection audio cue
    sfx.playSelectAnswer();

    try {
      const startTimeStamp = localQuestionStartRef.current ?? (session.questionStartTime ? new Date(session.questionStartTime).getTime() : Date.now());
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
  const [progressPct, setProgressPct] = useState(100);
  const isAnsweringOpen = session?.status === "question";

  // Anti-cheat: Track tab exits and window unfocus during active questions
  useEffect(() => {
    if (!session || session.status !== "question" || hasAnswered || isCheatingBlocked) {
      return;
    }

    const handleCheat = async () => {
      setCheatStrikes((prev) => prev + 1);
      setIsCheatingBlocked(true);
      setHasAnswered(true);

      // Snel een ongeldig antwoord index (-1) indienen om her-indienen te blokkeren en 0 punten te forceren
      try {
        await supabase
          .from("players")
          .update({
            current_answer_index: -1,
            current_answer_time: 0,
          })
          .eq("id", playerUid)
          .eq("session_id", sessionId);
      } catch (err) {
        console.error("Fout bij indienen anti-cheat straf:", err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCheat();
      }
    };

    const handleWindowBlur = () => {
      handleCheat();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [session?.status, hasAnswered, isCheatingBlocked, playerUid, sessionId]);

  useEffect(() => {
    if (session?.status === "question" && session?.questionStartTime) {
      const qIdx = session.currentQuestionIndex ?? 0;
      
      // If we haven't initialized the local start time for this question index yet:
      if (lastInitializedQuestionIdxRef.current !== qIdx) {
        lastInitializedQuestionIdxRef.current = qIdx;
        
        const dbStart = new Date(session.questionStartTime).getTime();
        const now = Date.now();
        const elapsedSinceDbStart = now - dbStart;
        
        // If we transitioned naturally from countdown, elapsedSinceDbStart is usually small (e.g. < 5000ms).
        // If they refreshed the page or joined late, we use the dbStart as fallback to keep sync.
        if (elapsedSinceDbStart > 0 && elapsedSinceDbStart < 5000) {
          localQuestionStartRef.current = now;
        } else {
          localQuestionStartRef.current = dbStart;
        }
      }

      const updateTimer = () => {
        const start = localQuestionStartRef.current ?? new Date(session.questionStartTime!).getTime();
        const now = Date.now();
        const elapsedMs = now - start;
        const duration = session.questionDuration ?? 20;
        const durationMs = duration * 1000;
        const remainingMs = Math.max(0, durationMs - elapsedMs);
        setSecondsLeft(Math.max(0, duration - Math.floor(elapsedMs / 1000)));
        setProgressPct(durationMs > 0 ? (remainingMs / durationMs) * 100 : 0);
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 100);
      return () => clearInterval(timerInterval);
    } else {
      localQuestionStartRef.current = null;
      lastInitializedQuestionIdxRef.current = null;
    }
  }, [session?.status, session?.questionStartTime, session?.questionDuration, session?.currentQuestionIndex]);

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
          <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6 relative z-10">
            <Ban className="w-8 h-8 text-red-500" />
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
              <div className="absolute top-[10%] left-[15%] text-indigo-200/40 animate-bounce"><Snowflake className="w-8 h-8" /></div>
              <div className="absolute top-[35%] left-[85%] text-indigo-200/40 animate-bounce"><Snowflake className="w-6 h-6" /></div>
              <div className="absolute top-[75%] left-[8%] text-indigo-200/40 animate-bounce"><Snowflake className="w-10 h-10" /></div>
              <div className="absolute top-[18%] left-[55%] text-indigo-200/40 animate-bounce"><Snowflake className="w-5 h-5" /></div>
              <div className="absolute top-[65%] left-[70%] text-indigo-200/40 animate-bounce"><Snowflake className="w-8 h-8" /></div>
            </>
          )}
          {activeTheme.name === "Zomer" && (
            <>
              <div className="absolute top-[8%] left-[22%] text-amber-300/40 animate-spin duration-10000"><Sun className="w-9 h-9" /></div>
              <div className="absolute top-[20%] left-[80%] text-emerald-400/40 animate-pulse"><Palmtree className="w-9 h-9" /></div>
              <div className="absolute bottom-[12%] left-[6%] text-amber-400/40"><Sun className="w-7 h-7" /></div>
              <div className="absolute bottom-[18%] right-[12%] text-emerald-300/40 animate-bounce"><Palmtree className="w-9 h-9" /></div>
            </>
          )}
          {activeTheme.name === "Halloween" && (
            <>
              <div className="absolute top-[12%] left-[12%] text-purple-300/40 animate-bounce"><Ghost className="w-9 h-9" /></div>
              <div className="absolute top-[45%] left-[82%] text-orange-400/40 animate-pulse"><Ghost className="w-9 h-9" /></div>
              <div className="absolute bottom-[18%] left-[40%] text-purple-300/40 animate-bounce"><Ghost className="w-9 h-9" /></div>
              <div className="absolute top-[28%] left-[68%] text-orange-400/30"><Ghost className="w-7 h-7" /></div>
            </>
          )}
          {activeTheme.name === "Kosmisch" && (
            <>
              <div className="absolute top-[12%] left-[22%] text-amber-200/40 animate-pulse"><Sparkles className="w-6 h-6" /></div>
              <div className="absolute top-[48%] left-[85%] text-indigo-300/40 animate-pulse"><Sparkles className="w-7 h-7" /></div>
              <div className="absolute bottom-[18%] left-[12%] text-indigo-400/40 animate-pulse"><Sparkles className="w-9 h-9" /></div>
              <div className="absolute top-[68%] left-[58%] text-amber-300/40 animate-pulse"><Sparkles className="w-6 h-6" /></div>
            </>
          )}
          {activeTheme.name === "Neon Retro" && (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_95%,rgba(244,63,94,0.15)_95%)] bg-[size:100%_40px] animate-pulse" />
              <div className="absolute top-[12%] left-[12%] text-pink-400/40 animate-pulse"><Zap className="w-8 h-8" /></div>
              <div className="absolute top-[58%] left-[85%] text-cyan-400/40 animate-pulse"><Gamepad2 className="w-8 h-8" /></div>
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-full uppercase tracking-wider">
                  Ingelogd als {displayName}
                  {isVerified && (
                    <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full w-3.5 h-3.5 text-[8px] font-black shrink-0 shadow-sm animate-pulse" title="Geverifieerde Speler">
                      ✓
                    </span>
                  )}
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

          {/* INTRO VIDEO AT QUIZ START (EENMALIG VOOR SPELERS) */}
          {(session?.status === "countdown" || (session?.status === "question" && !hasAnswered)) && currentQuestionIdx === 0 && !hasWatchedIntro ? (
            <motion.div
              key="intro_video"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-4 px-4 relative z-10 max-w-md mx-auto w-full"
            >
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs rounded-full uppercase tracking-wider animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Quiz Start!
                </span>
                <p className="text-slate-400 text-xs font-mono font-bold tracking-wider">
                  VRAAG 1 VAN DE {session.totalQuestions}
                </p>
              </div>

              <div className="w-full relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/40 shadow-2xl flex items-center justify-center">
                <video
                  ref={introVideoRef}
                  autoPlay
                  playsInline
                  onEnded={() => setHasWatchedIntro(true)}
                  className="w-full h-full object-contain"
                >
                  <source src="/uploads/intro_kahotie.mp4" type="video/mp4" />
                  <source src="/uploads/Intro%20kahotie.mp4" type="video/mp4" />
                  Jouw browser ondersteunt deze video niet.
                </video>
              </div>

              <div className="flex items-center justify-between w-full px-2 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={toggleIntroAudio}
                  className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-full border border-slate-700 cursor-pointer transition font-medium text-xs shadow-sm"
                >
                  {isIntroMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isIntroMuted ? "Geluid aan" : "Geluid dempen"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHasWatchedIntro(true)}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Overslaan →
                </button>
              </div>
            </motion.div>
          ) : session?.status === "countdown" ? (
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
                <h2 className="font-extrabold font-display text-2xl md:text-3xl text-white leading-tight flex flex-wrap items-center justify-center gap-2">
                  {currentQuestionIdx === 0 
                    ? (() => {
                        const { cleanTitle, isVerified: isQuizVerified } = parseQuizTitle(session?.quizTitle || "Inladen...");
                        return (
                          <>
                            <span>{cleanTitle}</span>
                            {isQuizVerified && (
                              <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full w-4 h-4 text-[9px] font-black shrink-0 shadow-sm" title="Geverifieerde Maker">
                                ✓
                              </span>
                            )}
                          </>
                        );
                      })()
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
          ) : null}

          {/* ACTIVE QUESTION OPTIONS INPUT PANEL */}
          {session?.status === "question" && activeQuestion && (hasWatchedIntro || currentQuestionIdx > 0) && (
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
                  <div className="flex items-center gap-2">
                    {self && (
                      <span className="text-[10px] font-mono font-extrabold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400 inline" /> {self.score} pt
                      </span>
                    )}
                    <div className="bg-white/10 border border-white/15 px-2 py-0.5 rounded-full text-white font-bold font-mono text-[10px] flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-indigo-300 animate-pulse" /> {secondsLeft}s
                    </div>
                  </div>
                </div>

                {/* Real-time Visual Progress Bar */}
                <div className="w-full bg-slate-950/40 border border-white/5 h-2.5 rounded-full overflow-hidden relative shadow-inner">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-100 ${
                      progressPct > 50 
                        ? "bg-emerald-500 shadow-md shadow-emerald-500/30" 
                        : progressPct > 20 
                          ? "bg-amber-500 shadow-md shadow-amber-500/30" 
                          : "bg-rose-500 shadow-md shadow-rose-500/50 animate-pulse"
                    }`}
                    style={{ width: `${progressPct}%` }}
                    initial={{ width: "100%" }}
                  />
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
                    <h3 className="text-xl font-extrabold font-display text-indigo-300 flex items-center justify-center gap-2">
                      <Dices className="w-6 h-6 text-indigo-300 inline" /> Maak je klaar!
                    </h3>
                    <p className="text-slate-400 text-xs">
                      Je mag zo meteen aan het Rad van Fortuin draaien...
                    </p>
                  </div>
                ) : activeQuestion.questionType === "wheel_spin" ? (
                  <div className={`flex-1 flex flex-col justify-center items-center py-4 px-2 space-y-4 ${activeTheme.cardBg} rounded-3xl p-6 relative z-10 shadow-lg border border-white/5`}>
                    <div className="text-center">
                      <span className="text-xs font-black tracking-widest text-amber-500 uppercase flex items-center justify-center gap-1.5">
                        <Dices className="w-4 h-4 text-amber-500 inline" /> Geluksronde - Waag een gokje
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
                      <p className="text-xs text-purple-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <ListOrdered className="w-4 h-4 text-purple-300 inline" /> Sleep de kaarten in de juiste volgorde!
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Bovenste is #1, of gebruik de pijltjes.</p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <AnimatePresence mode="popLayout">
                        {puzzleItems.map((item, idx) => {
                          const cardColor = getPuzzleCardColor(item.text, item.originalIndex);
                          const isBeingDragged = draggedIdx === idx;
                          return (
                            <motion.div
                              layout
                              key={item.originalIndex}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ 
                                opacity: isBeingDragged ? 0.75 : 1, 
                                scale: isBeingDragged ? 1.02 : 1,
                                y: 0 
                              }}
                              exit={{ opacity: 0 }}
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                              draggable
                              onDragStart={(e) => handleDragStart(e, idx)}
                              onDragOver={(e) => handleDragOver(e, idx)}
                              onDragEnd={handleDragEnd}
                              onDrop={(e) => handleDragOver(e, idx)}
                              onTouchStart={() => handleTouchStart(idx)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              data-puzzle-idx={idx}
                              className={`flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r ${cardColor} shadow-md border ${
                                isBeingDragged ? "border-purple-300 shadow-purple-500/30" : "border-white/10"
                              } cursor-grab active:cursor-grabbing touch-none transition-shadow hover:shadow-lg`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="text-white/40 hover:text-white transition-colors p-1 shrink-0 select-none">
                                  <GripVertical className="w-5 h-5" />
                                </span>
                                <span className="w-7 h-7 rounded-lg bg-black/25 flex items-center justify-center font-black font-mono text-xs text-white shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-extrabold text-white truncate text-base">
                                  {item.text}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
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
                      className="w-full mt-2 bg-purple-650 hover:bg-purple-550 text-white font-display font-black py-4 rounded-2xl border-b-6 border-purple-800 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-base cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Volgorde Bevestigen</span>
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : activeQuestion.questionType === "slider" ? (
                  <div className="flex-1 flex flex-col gap-6 py-4 px-2 space-y-4 select-none">
                    <div className="text-center">
                      <span className="text-sm font-black tracking-widest text-teal-400 uppercase flex items-center justify-center gap-1.5">
                        <Sliders className="w-4 h-4 text-teal-400 inline" /> Schuif of typ het juiste getal
                      </span>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                        Gebruik de schuifbalk om een waarde van {(activeQuestion.sliderMin ?? 1).toLocaleString("nl-NL")} tot {(activeQuestion.sliderMax ?? (activeQuestion.options?.length ?? 5)).toLocaleString("nl-NL")} te kiezen!
                      </p>
                    </div>

                    {/* Massive visual value display */}
                    <div className="relative flex justify-center items-center py-6">
                      <div className="absolute inset-0 bg-teal-500/5 blur-2xl rounded-full" />
                      <motion.div
                        key={sliderVal}
                        initial={{ scale: 0.75, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="px-6 h-24 min-w-[7rem] rounded-3xl bg-teal-500 text-white text-3xl md:text-3xl font-black font-display flex flex-col items-center justify-center shadow-lg shadow-teal-500/25 border-4 border-white relative"
                      >
                        <span>{parseFloat(Number(sliderVal).toFixed(4)).toLocaleString("nl-NL")}</span>
                        <div className="absolute -bottom-2 bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest leading-none border border-teal-500/30">
                          Gekozen
                        </div>
                      </motion.div>
                    </div>

                    {/* Highly tactile slider input */}
                    <div className="space-y-4 px-4">
                      {(() => {
                        const min = activeQuestion.sliderMin ?? 1;
                        const max = activeQuestion.sliderMax ?? (activeQuestion.options?.length ?? 5);
                        const step = activeQuestion.sliderStep ?? 1;
                        const mid = Math.round((min + max) / 2);
                        return (
                          <>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={sliderVal}
                              onChange={(e) => setSliderVal(Number(e.target.value))}
                              className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500 border border-slate-800"
                            />
                            <div className="flex justify-between text-xs font-mono text-slate-400 px-1 font-bold">
                              <span>Min ({min.toLocaleString("nl-NL")})</span>
                              <span>Midden ({mid.toLocaleString("nl-NL")})</span>
                              <span>Max ({max.toLocaleString("nl-NL")})</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Selector Dots or Input Textbox depending on custom scale */}
                    {(() => {
                      const isCustom = activeQuestion.sliderMin !== undefined || activeQuestion.sliderMax !== undefined;
                      const min = activeQuestion.sliderMin ?? 1;
                      const max = activeQuestion.sliderMax ?? (activeQuestion.options?.length ?? 5);
                      const step = activeQuestion.sliderStep ?? 1;
                      
                      if (isCustom) {
                        return (
                          <div className="flex items-center gap-3 justify-center pt-2 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                            <span className="text-xs font-semibold text-slate-400">Of typ je antwoord:</span>
                            <input
                              type="number"
                              min={min}
                              max={max}
                              step="any"
                              value={sliderVal}
                              onChange={(e) => {
                                let val = Number(e.target.value);
                                setSliderVal(val);
                              }}
                              className="w-36 px-3 py-1.5 border border-slate-700 bg-slate-950 text-center font-extrabold text-sm text-teal-400 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition shadow-inner"
                            />
                          </div>
                        );
                      } else {
                        return (
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
                        );
                      }
                    })()}

                    <button
                      onClick={async () => {
                        const isCustom = activeQuestion.sliderMin !== undefined || activeQuestion.sliderMax !== undefined;
                        await submitAnswerToSupabase(isCustom ? sliderVal : sliderVal - 1);
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-display font-black py-4 rounded-2xl border-b-6 border-teal-800 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-base cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Bevestig Getal ({parseFloat(Number(sliderVal).toFixed(4)).toLocaleString("nl-NL")})</span>
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-3 pb-4">
                    {/* Instructions banner */}
                    {activeQuestion.correctOptionIndices && activeQuestion.correctOptionIndices.length > 1 && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-200 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950/40 text-xs font-bold flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
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
                        className="w-full mt-2 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-display font-black py-4 rounded-2xl border-b-6 border-indigo-800 focus:scale-[0.99] hover:scale-[1.01] shadow-lg transition-all uppercase tracking-widest text-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        Antwoord Insturen ({selectedIndices.length})
                      </button>
                    )}
                  </div>
                )
              ) : isCheatingBlocked ? (
                /* ANTI-CHEAT BLOCKED STATE - CLEAN & SOBRE */
                <div className={`${activeTheme.cardBg} flex-1 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl p-8 shadow-md border border-white/5`}>
                  <div className="w-16 h-16 bg-white/10 text-white rounded-full border border-white/20 flex items-center justify-center text-2xl shadow-md">
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                  <h3 className={`text-2xl font-display ${textTitleClass}`}>
                    {lang === "nl" ? "Antwoord vergrendeld" : "Answer locked"}
                  </h3>
                  <p className={`text-sm max-w-xs ${textMutedClass}`}>
                    {lang === "nl" 
                      ? "Je verliet het scherm of wisselde van tabblad/venster. Je antwoord is voor deze ronde opgeschort." 
                      : "You left the screen or switched tabs/windows. Your answer has been suspended for this round."}
                  </p>
                  <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white/60 text-xs font-mono">
                    <span>{lang === "nl" ? "Waarschuwingen:" : "Warnings:"}</span>
                    <span className="font-bold text-white/90">{cheatStrikes}</span>
                  </div>
                </div>
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
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
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
                    <h2 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider flex items-center justify-center gap-2">
                      <Sparkles className="w-6 h-6 text-yellow-300 inline" /> Gok Resultaat!
                    </h2>
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
                    <p className="text-xs text-emerald-200">Punten & Streak update</p>
                    <h3 className="text-2xl font-mono font-bold text-white flex items-center gap-1 justify-center">
                      <Sparkles className="w-5 h-5 text-yellow-300 inline animate-spin-slow" /> +{getPointsEarnedForThisQuestion()} pt
                    </h3>
                  </div>

                  {self.streak > 1 && (
                    <div className="bg-orange-600/90 py-2 border border-orange-500 rounded-full inline-flex items-center gap-1.5 px-4 text-xs font-black uppercase text-white animate-pulse">
                      <Flame className="w-4 h-4 text-amber-200 inline" /> {self.streak} Vragen Streak!
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
                  <Trophy className="w-5 h-5 text-amber-400" />
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
                <Flame className="w-4 h-4 text-orange-400 inline" />
                <span>Huidige streak: {self.streak}</span>
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

            // 1. WHILE REVEAL IS IN PROGRESS (< 5): Keep all players in Live Reveal Arena so they can watch places 5, 4, 3, 2, 1 unfold!
            if (revealStage < 5) {
              return (
                <motion.div
                  key="ended-live-reveal-arena"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col space-y-4 max-w-md mx-auto py-4 px-3"
                >
                  <div className="text-center space-y-1.5">
                    <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/20 animate-pulse">
                      Live Finale Onthulling
                    </span>
                    <h1 className={`text-2xl font-display ${textTitleClass} leading-tight`}>
                      {isMyRankRevealed ? "Live Podium Ontknoping!" : "Op welke plaats sta jij?"}
                    </h1>
                    <p className={`text-xs ${textMutedClass}`}>
                      De host onthult nu live de plaatsen van 5 naar 1!
                    </p>
                  </div>

                  {/* Personal celebration callout if your rank has been revealed */}
                  {isMyRankRevealed && playerRank !== null && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 shadow-md ${
                        playerRank === 3
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                          : playerRank === 2
                          ? "bg-slate-300/15 border-slate-300/40 text-slate-200"
                          : playerRank === 1
                          ? "bg-amber-400/20 border-amber-400/50 text-amber-300"
                          : "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                      }`}
                    >
                      {playerRank === 1 ? (
                        <Trophy className="w-8 h-8 text-amber-400 shrink-0 animate-bounce" />
                      ) : playerRank === 2 ? (
                        <Medal className="w-8 h-8 text-slate-300 shrink-0" />
                      ) : playerRank === 3 ? (
                        <Medal className="w-8 h-8 text-amber-500 shrink-0" />
                      ) : (
                        <Award className="w-8 h-8 text-indigo-400 shrink-0" />
                      )}
                      <div className="text-left min-w-0">
                        <p className="font-extrabold text-white text-sm truncate">
                          {playerRank === 3
                            ? `Gefeliciteerd ${displayName}! Je staat op Brons!`
                            : playerRank === 2
                            ? `Geweldig ${displayName}! Je staat op Zilver!`
                            : playerRank === 1
                            ? `Fantastisch ${displayName}! Je bent de Winnaar!`
                            : `Goed gedaan ${displayName}! Je bent ${playerRank}e finalist!`}
                        </p>
                        <p className="text-[11px] opacity-90">
                          {playerRank === 3
                            ? "Kijk nu live mee naar wie er op plek 2 en 1 eindigen..."
                            : playerRank === 2
                            ? "Kijk nu live mee naar wie de 1e plaats pakt..."
                            : "Blijf kijken hoe de rest van het podium opengaat..."}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Real-time progression stats for the 5 spots */}
                  <div className="space-y-2.5 bg-slate-900/40 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200/10 shadow-lg backdrop-blur-xs">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">
                        Finale Standen
                      </p>
                      <span className="text-[10px] text-indigo-400 font-mono font-bold">
                        Stap {revealStage} van 5
                      </span>
                    </div>
                    
                    {[1, 2, 3, 4, 5].map((place) => {
                      let isPlaceRevealed = false;
                      if (place === 5 && revealStage >= 1) isPlaceRevealed = true;
                      if (place === 4 && revealStage >= 2) isPlaceRevealed = true;
                      if (place === 3 && revealStage >= 3) isPlaceRevealed = true;
                      if (place === 2 && revealStage >= 4) isPlaceRevealed = true;
                      if (place === 1 && revealStage >= 5) isPlaceRevealed = true;

                      const playerAtPlace = allPlayersSorted[place - 1];

                      if (isPlaceRevealed && playerAtPlace) {
                        const { displayName: pName, avatarUrl: pAvatar, isVerified: isPVerified } = parseNicknameAndAvatar(playerAtPlace.nickname || "");
                        const isYou = playerRank === place;
                        return (
                          <motion.div
                            key={`place-${place}`}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              isYou
                                ? "bg-indigo-600/30 border-indigo-500 shadow-md ring-2 ring-indigo-400/40"
                                : place === 1
                                ? "bg-amber-500/10 border-amber-500/30"
                                : place === 2
                                ? "bg-slate-300/10 border-slate-400/30"
                                : place === 3
                                ? "bg-amber-600/10 border-amber-600/30"
                                : "bg-slate-900/60 border-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <img src={pAvatar} alt="avatar" className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700" />
                                <span className={`absolute -top-1 -left-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border text-white ${
                                  place === 1 ? "bg-amber-500 border-amber-300" : place === 2 ? "bg-slate-400 border-slate-200 text-slate-900" : place === 3 ? "bg-amber-700 border-amber-500" : "bg-indigo-600 border-white"
                                }`}>
                                  {place}
                                </span>
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="font-bold text-slate-300 text-xs truncate flex items-center gap-1.5">
                                  <span className="text-white truncate">{pName.replace(/[:|~]/g, "")}</span>
                                  {isPVerified && (
                                    <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full w-3 h-3 text-[7px] font-black shrink-0 shadow-sm">
                                      ✓
                                    </span>
                                  )}
                                  {isYou && (
                                    <span className="bg-indigo-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm shrink-0">Jij!</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                  {place === 1 ? (
                                    <><Trophy className="w-3 h-3 text-amber-400 inline" /> Winnaar (Goud)</>
                                  ) : place === 2 ? (
                                    <><Medal className="w-3 h-3 text-slate-300 inline" /> 2e Plaats (Zilver)</>
                                  ) : place === 3 ? (
                                    <><Medal className="w-3 h-3 text-amber-500 inline" /> 3e Plaats (Brons)</>
                                  ) : (
                                    <><Award className="w-3 h-3 text-indigo-400 inline" /> Finalist</>
                                  )}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-extrabold text-indigo-400 shrink-0">
                              {playerAtPlace.score} pt
                            </span>
                          </motion.div>
                        );
                      } else {
                        return (
                          <div
                            key={`place-${place}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/20 border border-slate-800/40 opacity-60"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 text-xs shrink-0">
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-500">
                                  {place === 1 ? "1e Plaats (Goud)" : place === 2 ? "2e Plaats (Zilver)" : place === 3 ? "3e Plaats (Brons)" : `${place}e Plaats`}
                                </p>
                                <p className="text-[10px] text-slate-600">Wordt zo onthuld...</p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-700">??? pt</span>
                          </div>
                        );
                      }
                    })}
                  </div>

                  <div className="bg-slate-900/80 dark:bg-slate-950/80 text-slate-400 rounded-2xl p-3.5 flex items-center justify-center gap-3 border border-slate-800">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span className="font-bold text-xs uppercase tracking-widest font-mono text-white">
                      Host onthult live...
                    </span>
                  </div>
                </motion.div>
              );
            }

            // 2. GRAND FINALE: ALL REVEAL STAGES COMPLETE (revealStage >= 5)
            // Displays both the individual achievement card AND the complete Top 3 podium so everyone (including 3rd place) clearly sees 1st and 2nd place!
            const firstPlace = allPlayersSorted[0];
            const secondPlace = allPlayersSorted[1];
            const thirdPlace = allPlayersSorted[2];
            const fourthPlace = allPlayersSorted[3];
            const fifthPlace = allPlayersSorted[4];

            return (
              <motion.div
                key="ended-grand-finale"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col space-y-4 max-w-md mx-auto py-4 px-3"
              >
                {/* Personal Achievement Header Banner */}
                {playerRank === 1 && (
                  <div className="bg-linear-to-r from-amber-500/20 via-amber-500/10 to-amber-600/20 border-2 border-amber-400/60 rounded-2xl p-4 text-center space-y-2 shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                      <span className="text-amber-400 text-xs font-black uppercase tracking-widest font-mono">
                        EERSTE PLAATS - EINDWINNAAR!
                      </span>
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <h1 className={`text-2xl font-display ${textTitleClass} leading-tight`}>
                      Gefeliciteerd {displayName}!
                    </h1>
                    <p className={`text-xs ${textMutedClass}`}>
                      Je bent de absolute winnaar van de quiz met een topscore van <strong className="text-amber-400 font-mono">{self.score} pt</strong>!
                    </p>
                  </div>
                )}

                {playerRank === 2 && (
                  <div className="bg-linear-to-r from-slate-300/20 via-slate-400/10 to-slate-300/20 border-2 border-slate-300/60 rounded-2xl p-4 text-center space-y-2 shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Medal className="w-6 h-6 text-slate-300" />
                      <span className="text-slate-300 text-xs font-black uppercase tracking-widest font-mono">
                        TWEEDE PLAATS - ZILVER!
                      </span>
                    </div>
                    <h1 className={`text-2xl font-display ${textTitleClass} leading-tight`}>
                      Super gepresteerd {displayName}!
                    </h1>
                    <p className={`text-xs ${textMutedClass}`}>
                      Je pakt een fantastische 2e plaats op het podium met <strong className="text-slate-300 font-mono">{self.score} pt</strong>!
                    </p>
                  </div>
                )}

                {playerRank === 3 && (
                  <div className="bg-linear-to-r from-amber-600/20 via-amber-700/10 to-amber-600/20 border-2 border-amber-600/60 rounded-2xl p-4 text-center space-y-2 shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Medal className="w-6 h-6 text-amber-500" />
                      <span className="text-amber-400 text-xs font-black uppercase tracking-widest font-mono">
                        DERDE PLAATS - BRONS!
                      </span>
                    </div>
                    <h1 className={`text-2xl font-display ${textTitleClass} leading-tight`}>
                      Mooi gedaan {displayName}!
                    </h1>
                    <p className={`text-xs ${textMutedClass}`}>
                      Je eindigt op een eervolle 3e plaats en claimt brons met <strong className="text-amber-400 font-mono">{self.score} pt</strong>!
                    </p>
                  </div>
                )}

                {playerRank !== null && playerRank > 3 && (
                  <div className="bg-slate-900/60 dark:bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-4 text-center space-y-2 shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Award className="w-5 h-5 text-indigo-400" />
                      <span className="text-indigo-400 text-xs font-black uppercase tracking-widest font-mono">
                        {playerRank <= 5 ? "TOP FINALIST!" : "QUIZ VOLBRACHT!"}
                      </span>
                    </div>
                    <h1 className={`text-2xl font-display ${textTitleClass} leading-tight`}>
                      {playerRank}e Plaats
                    </h1>
                    <p className={`text-xs ${textMutedClass}`}>
                      Goed gespeeld {displayName}! Je behaalt de {playerRank}e plaats van de {allPlayersSorted.length} deelnemers met <strong className="text-indigo-400 font-mono">{self.score} pt</strong>.
                    </p>
                  </div>
                )}

                {/* Tab Navigation for Player */}
                <div className="flex justify-center gap-2 max-w-xs mx-auto w-full">
                  <button
                    onClick={() => setPlayerEndTab("podium")}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      playerEndTab === "podium"
                        ? "bg-indigo-600 text-white shadow-md border border-indigo-500"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent"
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Podium
                  </button>
                  <button
                    onClick={() => setPlayerEndTab("ranking")}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      playerEndTab === "ranking"
                        ? "bg-indigo-600 text-white shadow-md border border-indigo-500"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent"
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-indigo-400" /> Ranglijst ({allPlayersSorted.length})
                  </button>
                </div>

                {playerEndTab === "podium" ? (
                  <>
                    {/* THE COMPLETE PODIUM (TOP 3) - ALWAYS VISIBLE TO ALL PLAYERS */}
                <div className="bg-slate-900/50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200/10 shadow-lg backdrop-blur-xs">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" /> Het Officiële Podium
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">Top 3</span>
                  </div>

                  <div className="flex items-end justify-center gap-2 pt-2 pb-1">
                    {/* 2nd Place Column (Left) */}
                    <div className="flex-1 flex flex-col items-center">
                      {secondPlace ? (() => {
                        const { displayName: sName, avatarUrl: sAvatar, isVerified: sVer } = parseNicknameAndAvatar(secondPlace.nickname || "");
                        const isYou = playerRank === 2;
                        return (
                          <>
                            <div className="relative mb-2 flex flex-col items-center">
                              <img src={sAvatar} alt="2nd" className={`w-11 h-11 rounded-full bg-slate-800 border-2 ${isYou ? "border-indigo-400 ring-2 ring-indigo-400" : "border-slate-300"}`} />
                              <span className="absolute -top-1.5 -left-1.5 bg-slate-400 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
                                2
                              </span>
                              {isYou && (
                                <span className="mt-1 bg-indigo-500 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded-sm">Jij!</span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-slate-200 truncate w-20 text-center flex items-center justify-center gap-1">
                              <span className="truncate">{sName.replace(/[:|~]/g, "")}</span>
                              {sVer && <span className="text-blue-400 text-[8px]">✓</span>}
                            </p>
                            <span className="text-[10px] font-mono font-extrabold text-slate-300 mb-1.5">{secondPlace.score} pt</span>
                            <div className="w-full h-24 rounded-t-xl bg-linear-to-b from-slate-400 to-slate-600 border-t-2 border-slate-200 flex flex-col items-center justify-center text-slate-950 shadow-md">
                              <span className="font-mono text-2xl font-black">2</span>
                              <span className="text-[9px] font-black uppercase tracking-wider">Zilver</span>
                            </div>
                          </>
                        );
                      })() : (
                        <div className="w-full h-24 rounded-t-xl bg-slate-800/40 border-t-2 border-slate-700 flex items-center justify-center text-slate-600 text-xs">
                          -
                        </div>
                      )}
                    </div>

                    {/* 1st Place Column (Center, Taller) */}
                    <div className="flex-1 flex flex-col items-center">
                      {firstPlace ? (() => {
                        const { displayName: fName, avatarUrl: fAvatar, isVerified: fVer } = parseNicknameAndAvatar(firstPlace.nickname || "");
                        const isYou = playerRank === 1;
                        return (
                          <>
                            <Crown className="w-5 h-5 text-amber-400 mb-0.5 animate-bounce" />
                            <div className="relative mb-2 flex flex-col items-center">
                              <img src={fAvatar} alt="1st" className={`w-13 h-13 rounded-full bg-slate-800 border-2 ${isYou ? "border-indigo-400 ring-2 ring-indigo-400" : "border-amber-400"}`} />
                              <span className="absolute -top-1.5 -left-1.5 bg-amber-400 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
                                1
                              </span>
                              {isYou && (
                                <span className="mt-1 bg-indigo-500 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded-sm">Jij!</span>
                              )}
                            </div>
                            <p className="text-xs font-extrabold text-amber-300 truncate w-22 text-center flex items-center justify-center gap-1">
                              <span className="truncate">{fName.replace(/[:|~]/g, "")}</span>
                              {fVer && <span className="text-blue-400 text-[8px]">✓</span>}
                            </p>
                            <span className="text-[10px] font-mono font-extrabold text-amber-400 mb-1.5">{firstPlace.score} pt</span>
                            <div className="w-full h-32 rounded-t-xl bg-linear-to-b from-amber-400 to-amber-600 border-t-2 border-amber-200 flex flex-col items-center justify-center text-slate-950 shadow-lg">
                              <span className="font-mono text-3xl font-black">1</span>
                              <span className="text-[9px] font-black uppercase tracking-wider">Winnaar</span>
                            </div>
                          </>
                        );
                      })() : (
                        <div className="w-full h-32 rounded-t-xl bg-slate-800/40 border-t-2 border-slate-700 flex items-center justify-center text-slate-600 text-xs">
                          -
                        </div>
                      )}
                    </div>

                    {/* 3rd Place Column (Right) */}
                    <div className="flex-1 flex flex-col items-center">
                      {thirdPlace ? (() => {
                        const { displayName: tName, avatarUrl: tAvatar, isVerified: tVer } = parseNicknameAndAvatar(thirdPlace.nickname || "");
                        const isYou = playerRank === 3;
                        return (
                          <>
                            <div className="relative mb-2 flex flex-col items-center">
                              <img src={tAvatar} alt="3rd" className={`w-10 h-10 rounded-full bg-slate-800 border-2 ${isYou ? "border-indigo-400 ring-2 ring-indigo-400" : "border-amber-600"}`} />
                              <span className="absolute -top-1.5 -left-1.5 bg-amber-700 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
                                3
                              </span>
                              {isYou && (
                                <span className="mt-1 bg-indigo-500 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded-sm">Jij!</span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-slate-300 truncate w-20 text-center flex items-center justify-center gap-1">
                              <span className="truncate">{tName.replace(/[:|~]/g, "")}</span>
                              {tVer && <span className="text-blue-400 text-[8px]">✓</span>}
                            </p>
                            <span className="text-[10px] font-mono font-extrabold text-amber-500 mb-1.5">{thirdPlace.score} pt</span>
                            <div className="w-full h-20 rounded-t-xl bg-linear-to-b from-amber-600 to-amber-800 border-t-2 border-amber-400 flex flex-col items-center justify-center text-white shadow-md">
                              <span className="font-mono text-xl font-black">3</span>
                              <span className="text-[8px] font-black uppercase tracking-wider">Brons</span>
                            </div>
                          </>
                        );
                      })() : (
                        <div className="w-full h-20 rounded-t-xl bg-slate-800/40 border-t-2 border-slate-700 flex items-center justify-center text-slate-600 text-xs">
                          -
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Finalists Row (4th & 5th) */}
                {(fourthPlace || fifthPlace) && (
                  <div className="grid grid-cols-2 gap-2">
                    {fourthPlace && (() => {
                      const { displayName: foName, avatarUrl: foAvatar } = parseNicknameAndAvatar(fourthPlace.nickname || "");
                      const isYou = playerRank === 4;
                      return (
                        <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                          isYou ? "bg-indigo-600/30 border-indigo-500" : "bg-slate-900/50 border-slate-800"
                        }`}>
                          <img src={foAvatar} alt="4th" className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700" />
                          <div className="min-w-0 text-left">
                            <p className="text-[11px] font-bold text-slate-300 truncate">
                              4. {foName.replace(/[:|~]/g, "")} {isYou && <span className="text-indigo-400">(Jij)</span>}
                            </p>
                            <p className="text-[9px] font-mono text-indigo-400 font-bold">{fourthPlace.score} pt</p>
                          </div>
                        </div>
                      );
                    })()}

                    {fifthPlace && (() => {
                      const { displayName: fiName, avatarUrl: fiAvatar } = parseNicknameAndAvatar(fifthPlace.nickname || "");
                      const isYou = playerRank === 5;
                      return (
                        <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                          isYou ? "bg-indigo-600/30 border-indigo-500" : "bg-slate-900/50 border-slate-800"
                        }`}>
                          <img src={fiAvatar} alt="5th" className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700" />
                          <div className="min-w-0 text-left">
                            <p className="text-[11px] font-bold text-slate-300 truncate">
                              5. {fiName.replace(/[:|~]/g, "")} {isYou && <span className="text-indigo-400">(Jij)</span>}
                            </p>
                            <p className="text-[9px] font-mono text-indigo-400 font-bold">{fifthPlace.score} pt</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Bedankt voor het meespelen Slotvideo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-slate-900/70 dark:bg-slate-950/70 p-4 rounded-2xl border border-indigo-500/30 shadow-xl overflow-hidden space-y-2.5"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Bedankt voor het meespelen!
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Slotboodschap</span>
                  </div>
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800 flex items-center justify-center shadow-inner">
                    <video
                      src="/uploads/IMG_6220.MP4"
                      controls
                      playsInline
                      autoPlay
                      className="w-full h-full object-contain"
                    >
                      <source src="/uploads/IMG_6220.MP4" type="video/mp4" />
                      <source src="/uploads/IMG_6220.mp4" type="video/mp4" />
                      Jouw browser ondersteunt deze video niet.
                    </video>
                  </div>
                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    Bedankt voor het spelen van de quiz!
                  </p>
                </motion.div>
              </>
            ) : (
              /* FULL RANKING OVERVIEW FOR PLAYER */
              <div className="bg-slate-900/70 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-indigo-400" /> Alle Deelnemers
                    </h3>
                    <p className="text-[10px] text-slate-400">Overzicht van de volledige eindstand</p>
                  </div>
                  <span className="text-[10px] font-mono bg-indigo-950/60 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-800 font-bold">
                    {allPlayersSorted.length} Spelers
                  </span>
                </div>

                {/* Search box if there are more than 5 players */}
                {allPlayersSorted.length > 5 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Zoek een speler..."
                      value={playerRankingSearch}
                      onChange={(e) => setPlayerRankingSearch(e.target.value)}
                      className="w-full bg-slate-800/80 text-white text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-700/60 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Scrollable list of all players */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {allPlayersSorted
                    .filter((p) => {
                      if (!playerRankingSearch.trim()) return true;
                      const { displayName: pName } = parseNicknameAndAvatar(p.nickname || "");
                      return pName.toLowerCase().includes(playerRankingSearch.toLowerCase().trim());
                    })
                    .map((p) => {
                      const rank = allPlayersSorted.findIndex(item => item.id === p.id) + 1;
                      const { displayName: pName, avatarUrl: pAvatar, isVerified: pVer } = parseNicknameAndAvatar(p.nickname || "");
                      const isSelf = p.id === playerUid || pName === displayName;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                            isSelf
                              ? "bg-indigo-600/25 border-indigo-500 shadow-xs"
                              : rank === 1
                              ? "bg-amber-500/10 border-amber-500/30"
                              : rank === 2
                              ? "bg-slate-300/10 border-slate-400/30"
                              : rank === 3
                              ? "bg-amber-700/10 border-amber-700/30"
                              : "bg-slate-800/50 border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-6 h-6 rounded-full font-mono font-black text-[10px] flex items-center justify-center shrink-0 ${
                              rank === 1
                                ? "bg-amber-500 text-slate-950 font-black"
                                : rank === 2
                                ? "bg-slate-300 text-slate-950 font-black"
                                : rank === 3
                                ? "bg-amber-700 text-white font-black"
                                : "bg-slate-800 text-slate-400"
                            }`}>
                              {rank}
                            </div>
                            <img src={pAvatar} alt="avatar" className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className={`text-xs font-bold truncate ${isSelf ? "text-indigo-300 font-extrabold" : "text-slate-200"}`}>
                                  {pName.replace(/[:|~]/g, "")}
                                </p>
                                {isSelf && (
                                  <span className="bg-indigo-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0">
                                    Jij
                                  </span>
                                )}
                                {pVer && (
                                  <span className="text-blue-400 text-[10px] shrink-0">✓</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className={`font-mono font-bold text-xs ${
                              rank === 1 ? "text-amber-400" : isSelf ? "text-indigo-300" : "text-slate-300"
                            }`}>
                              {p.score} pt
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Action button */}
                <button
                  onClick={onExit}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold tracking-wide transition cursor-pointer shadow-md text-sm uppercase flex items-center justify-center gap-2 mt-2"
                >
                  <span>Klaar en Sluiten</span>
                </button>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      )}
    </div>
  );
}
