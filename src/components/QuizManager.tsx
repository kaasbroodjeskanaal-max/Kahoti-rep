import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { Quiz, Question } from "../types";
import { parseQuizTitle } from "../avatarUtils";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Loader2,
  Settings,
  Copy,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Sliders,
  Music,
  Clock,
  Award,
  X,
  Check,
  Search,
  Sparkles,
  LogOut,
  User,
  Gamepad2,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  Film,
  Layers,
  Calendar,
  Moon,
  Sun,
  Snowflake,
  Ghost,
  Orbit,
  Zap,
  Scale,
  CircleDot,
  Puzzle,
  SlidersHorizontal,
  FileText,
  Lock,
  Trophy,
  Timer,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
} from "lucide-react";
import { translations } from "../translations";
import { ImageUploader } from "./ImageUploader";

interface QuizManagerProps {
  lang?: "nl" | "en";
  onHostGame: (quiz: Quiz) => void;
  onBack: () => void;
}

const THEME_OPTIONS = [
  { id: "default", label: "Standaard Donker", icon: Moon, desc: "Klassiek donkerblauw" },
  { id: "summer", label: "Zomer Strand", icon: Sun, desc: "Zonnige zand & zee sfeer" },
  { id: "winter", label: "Winter Frost", icon: Snowflake, desc: "Frisse sneeuw & ijskristallen" },
  { id: "halloween", label: "Halloween", icon: Ghost, desc: "Spooky pompoenen & paars" },
  { id: "space", label: "Kosmisch Heelal", icon: Orbit, desc: "Sterrennevels & planeten" },
  { id: "neon", label: "Neon Synthwave", icon: Zap, desc: "Retro jaren 80 neon glow" },
] as const;

const MUSIC_OPTIONS = [
  {
    url: "https://www.image2url.com/r2/default/audio/1781202460294-d546fcf7-83a2-4b68-9824-82d64768dffb.mp3",
    label: "Soundtrack 1: Mellow Grooves",
    badge: "Standaard",
  },
  {
    url: "https://www.image2url.com/r2/default/audio/1781202726000-2c24a69f-3877-4838-a150-058ac0110f43.mp3",
    label: "Soundtrack 2: 8-Bit Arcade",
    badge: "Retro",
  },
  {
    url: "https://www.image2url.com/r2/default/audio/1781202806102-a59be124-834b-4f52-af69-f27e4cd90e3e.mp3",
    label: "Soundtrack 3: Upbeat Energie",
    badge: "Dynamisch",
  },
];

export default function QuizManager({ lang = "nl", onHostGame, onBack }: QuizManagerProps) {
  const t = translations[lang];

  // Quizzes list state
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
    try {
      const cached = localStorage.getItem("cached_quizzes");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_quizzes");
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [searchQuery, setSearchQuery] = useState("");

  // Quiz Editor State
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [theme, setTheme] = useState<"default" | "summer" | "winter" | "halloween" | "space" | "neon">("default");
  const [lobbyTheme, setLobbyTheme] = useState<"default" | "summer" | "winter" | "halloween" | "space" | "neon">("default");
  const [lobbyMusicUrl, setLobbyMusicUrl] = useState("https://www.image2url.com/r2/default/audio/1781202460294-d546fcf7-83a2-4b68-9824-82d64768dffb.mp3");
  const [isSaving, setIsSaving] = useState(false);

  // Audio Preview state
  const [playingMusicUrl, setPlayingMusicUrl] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [questions, setQuestions] = useState<Omit<Question, "id">[]>([
    {
      questionText: "",
      imageUrl: "",
      timeLimit: 20,
      points: 1000,
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      correctOptionIndices: [0],
      questionType: "multiple_choice",
      theme: "default",
    },
  ]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(-1);

  // Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const getQuestionTypeMeta = (type?: string) => {
    switch (type) {
      case "true_false":
        return {
          label: "Waar / Niet waar",
          color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
          icon: Scale,
        };
      case "wheel_spin":
        return {
          label: "Geluksrad",
          color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
          icon: CircleDot,
        };
      case "puzzle":
        return {
          label: "Puzzel",
          color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
          icon: Puzzle,
        };
      case "slider":
        return {
          label: "Schuifbalk",
          color: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
          icon: SlidersHorizontal,
        };
      default:
        return {
          label: "Meerkeuze",
          color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60",
          icon: FileText,
        };
    }
  };

  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
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
    return localId;
  };

  const fetchQuizzes = async (silent = false) => {
    if (!silent && quizzes.length === 0) {
      setIsLoading(true);
    }
    try {
      const uId = await getUserId();
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("created_by", uId);

      if (error) throw new Error(error.message);

      const list: Quiz[] = (data || []).map((q: any) => {
        const qList = q.questions || [];
        const firstQ = qList[0];
        const quizTheme = q.theme || firstQ?.theme || "default";
        const quizLobbyTheme = q.lobby_theme || q.lobbyTheme || firstQ?.lobbyTheme || "default";
        const quizLobbyMusicUrl = q.lobby_music_url || q.lobbyMusicUrl || firstQ?.lobbyMusicUrl || "https://www.image2url.com/r2/default/audio/1781202460294-d546fcf7-83a2-4b68-9824-82d64768dffb.mp3";
        return {
          id: q.id,
          title: q.title || "Naamloze Quiz",
          description: q.description || "",
          imageUrl: q.image_url || "",
          creatorId: q.created_by,
          createdAt: q.created_at,
          questions: qList,
          theme: quizTheme,
          lobbyTheme: quizLobbyTheme,
          lobbyMusicUrl: quizLobbyMusicUrl,
        };
      });

      const sorted = list.sort((a, b) => b.id.localeCompare(a.id));
      setQuizzes(sorted);
      try {
        localStorage.setItem("cached_quizzes", JSON.stringify(sorted));
      } catch (e) {
        console.error(e);
      }
    } catch (err: any) {
      console.error("Fout bij ophalen quizzen:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    const silent = quizzes.length > 0;
    fetchQuizzes(silent);
  }, [currentUser]);

  const handleToggleMusicPreview = (url: string) => {
    if (playingMusicUrl === url) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPlayingMusicUrl(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch((err) => console.warn("Audio afspelen mislukt:", err));
      audio.onended = () => setPlayingMusicUrl(null);
      audioPreviewRef.current = audio;
      setPlayingMusicUrl(url);
    }
  };

  const handleSignOut = async () => {
    const lastAuth = localStorage.getItem("last_auth_action_timestamp");
    const now = Date.now();
    if (lastAuth && now - Number(lastAuth) < 5000) {
      alert("In- en uitloggen gebeurt te snel! Wacht even.");
      return;
    }
    localStorage.setItem("last_auth_action_timestamp", String(now));
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const now = Date.now();
    const lastAuth = localStorage.getItem("last_auth_action_timestamp");
    if (lastAuth && now - Number(lastAuth) < 5000) {
      setAuthError("Wacht 5 seconden voor je volgende authenticatie poging.");
      return;
    }

    if (authMode === "register") {
      const lastSignUp = localStorage.getItem("last_signup_timestamp");
      if (lastSignUp && now - Number(lastSignUp) < 30000) {
        setAuthError("Om spam te voorkomen kun je maximaal één account per 30 seconden registreren.");
        return;
      }
    }

    setAuthSubmitting(true);
    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        localStorage.setItem("last_auth_action_timestamp", String(now));
        setCurrentUser(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        localStorage.setItem("last_auth_action_timestamp", String(now));
        localStorage.setItem("last_signup_timestamp", String(now));
        setCurrentUser(data.user);
      }
    } catch (err: any) {
      setAuthError(err.message || "Er is een fout opgetreden bij authenticatie.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Question Management
  const handleAddQuestion = () => {
    const newIdx = questions.length;
    setQuestions([
      ...questions,
      {
        questionText: "",
        imageUrl: "",
        timeLimit: 20,
        points: 1000,
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        correctOptionIndices: [0],
        questionType: "multiple_choice",
        theme: "default",
      },
    ]);
    setActiveQuestionIdx(newIdx);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length === 1) return;
    const nextList = questions.filter((_, i) => i !== idx);
    setQuestions(nextList);
    setActiveQuestionIdx((prev) => {
      if (prev === idx) {
        return Math.max(0, idx - 1);
      } else if (prev > idx) {
        return prev - 1;
      }
      return prev;
    });
  };

  const handleDuplicateQuestion = (idx: number) => {
    const updated = [...questions];
    const original = updated[idx];
    const duplicated = {
      ...original,
      options: [...original.options],
      correctOptionIndices: original.correctOptionIndices ? [...original.correctOptionIndices] : [original.correctOptionIndex ?? 0],
    };
    updated.splice(idx + 1, 0, duplicated);
    setQuestions(updated);
    setActiveQuestionIdx(idx + 1);
  };

  const handleMoveQuestion = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === questions.length - 1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...questions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
    setActiveQuestionIdx(targetIdx);
  };

  const handleQuestionChange = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === "questionText") {
      updated[idx].questionText = value;
    } else if (field === "imageUrl") {
      updated[idx].imageUrl = value;
    } else if (field === "timeLimit") {
      updated[idx].timeLimit = Number(value);
    } else if (field === "points") {
      updated[idx].points = Number(value);
    } else if (field === "theme") {
      updated[idx].theme = value;
    } else if (field === "correctOptionIndex") {
      updated[idx].correctOptionIndex = Number(value);
      updated[idx].correctOptionIndices = [Number(value)];
    } else if (field === "correctOptionIndices") {
      updated[idx].correctOptionIndices = value;
      if (value && value.length > 0) {
        updated[idx].correctOptionIndex = value[0];
      }
    } else if (field === "questionType") {
      updated[idx].questionType = value;
      if (value === "true_false") {
        updated[idx].options = ["Waar", "Niet waar"];
        updated[idx].correctOptionIndices = [0];
        updated[idx].correctOptionIndex = 0;
      } else if (value === "wheel_spin") {
        updated[idx].options = ["Bankroet", "Min 500", "Gelijkspel", "Plus 250", "Plus 500", "Plus 1000"];
        updated[idx].correctOptionIndices = [];
        updated[idx].correctOptionIndex = -1;
      } else if (value === "puzzle") {
        updated[idx].options = ["Rood", "Blauw", "Geel", "Groen"];
        updated[idx].correctOptionIndices = [0, 1, 2, 3];
        updated[idx].correctOptionIndex = 123;
      } else if (value === "slider") {
        updated[idx].options = ["1", "2", "3", "4", "5"];
        updated[idx].correctOptionIndices = [2];
        updated[idx].correctOptionIndex = 2;
      } else {
        updated[idx].options = ["", "", "", ""];
        updated[idx].correctOptionIndices = [0];
        updated[idx].correctOptionIndex = 0;
      }
    }
    setQuestions(updated);
  };

  const handleAddOptionToQuestion = (qIdx: number) => {
    const updated = [...questions];
    if (updated[qIdx].options.length >= 6) return;
    updated[qIdx].options.push("");
    setQuestions(updated);
  };

  const handleRemoveOptionFromQuestion = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    if (updated[qIdx].options.length <= 2) return;

    updated[qIdx].options = updated[qIdx].options.filter((_, idx) => idx !== oIdx);

    const correctIndices = updated[qIdx].correctOptionIndices || [updated[qIdx].correctOptionIndex ?? 0];
    const newCorrect = correctIndices
      .filter((idx) => idx !== oIdx)
      .map((idx) => (idx > oIdx ? idx - 1 : idx));

    updated[qIdx].correctOptionIndices = newCorrect.length > 0 ? newCorrect : [0];
    updated[qIdx].correctOptionIndex = updated[qIdx].correctOptionIndices[0];
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setTitle(parseQuizTitle(quiz.title).cleanTitle);
    setDescription(quiz.description);
    setImageUrl(quiz.imageUrl || "");
    const firstQ = quiz.questions[0];
    const quizTheme = quiz.theme || firstQ?.theme || "default";
    const quizLobbyTheme = quiz.lobbyTheme || firstQ?.lobbyTheme || "default";
    const quizLobbyMusicUrl = quiz.lobbyMusicUrl || firstQ?.lobbyMusicUrl || "https://www.image2url.com/r2/default/audio/1781202460294-d546fcf7-83a2-4b68-9824-82d64768dffb.mp3";
    setTheme(quizTheme);
    setLobbyTheme(quizLobbyTheme);
    setLobbyMusicUrl(quizLobbyMusicUrl);

    setQuestions(quiz.questions.map(q => ({
      questionText: q.questionText,
      imageUrl: q.imageUrl || "",
      timeLimit: q.timeLimit,
      points: q.points,
      options: [...q.options],
      correctOptionIndex: q.correctOptionIndex ?? 0,
      correctOptionIndices: q.correctOptionIndices ?? [q.correctOptionIndex ?? 0],
      questionType: q.questionType ?? "multiple_choice",
      theme: quizTheme,
      lobbyMusicUrl: quizLobbyMusicUrl,
      sliderMin: q.sliderMin,
      sliderMax: q.sliderMax,
      sliderStep: q.sliderStep,
    })));
    setActiveQuestionIdx(-1);
    setActiveTab("create");
  };

  const handleResetForm = () => {
    setEditingQuizId(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setTheme("default");
    setLobbyTheme("default");
    setLobbyMusicUrl("https://www.image2url.com/r2/default/audio/1781202460294-d546fcf7-83a2-4b68-9824-82d64768dffb.mp3");
    setQuestions([
      {
        questionText: "",
        imageUrl: "",
        timeLimit: 20,
        points: 1000,
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        correctOptionIndices: [0],
        questionType: "multiple_choice",
        theme: "default",
      },
    ]);
    setActiveQuestionIdx(-1);
  };

  const handleSaveManualQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert("Geef de quiz een titel.");
      setActiveQuestionIdx(-1);
      return;
    }

    if (!editingQuizId) {
      const lastCreationStr = localStorage.getItem("last_quiz_creation_time");
      if (lastCreationStr) {
        const lastCreation = new Date(lastCreationStr);
        const now = new Date();
        const diffMs = now.getTime() - lastCreation.getTime();
        const minutesLeft = 10 - diffMs / (60 * 1000);
        if (minutesLeft > 0) {
          alert(`Je kunt maar 1 quiz per 10 minuten aanmaken. Wacht nog ${Math.ceil(minutesLeft)} minuten.`);
          return;
        }
      }
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        alert(`Vraag #${i + 1} heeft nog geen vraagtekst.`);
        setActiveQuestionIdx(i);
        return;
      }
      for (let o = 0; o < q.options.length; o++) {
        if (!q.options[o].trim()) {
          alert(`Vraag #${i + 1}, optie #${o + 1} is nog leeg.`);
          setActiveQuestionIdx(i);
          return;
        }
      }
      if (q.questionType !== "wheel_spin") {
        const corIndices = q.correctOptionIndices || [q.correctOptionIndex ?? 0];
        if (corIndices.length === 0) {
          alert(`Vraag #${i + 1} moet ten minste één correct antwoord hebben.`);
          setActiveQuestionIdx(i);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const uId = await getUserId();
      const saveQuizId = editingQuizId || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }));

      const parsedQuestions = questions.map((q, idx) => ({
        ...q,
        correctOptionIndex: q.correctOptionIndices && q.correctOptionIndices.length > 0 ? q.correctOptionIndices[0] : (q.correctOptionIndex ?? 0),
        correctOptionIndices: q.correctOptionIndices || [q.correctOptionIndex ?? 0],
        questionType: q.questionType || "multiple_choice",
        theme: theme,
        lobbyTheme: lobbyTheme,
        lobbyMusicUrl: lobbyMusicUrl,
        id: `q_${idx}_${Date.now()}`,
      }));

      const userEmail = currentUser?.email?.toLowerCase() || "";
      const isMarko = userEmail === "markohoksen@gmail.com";
      const cleanTitleVal = title.trim().replace("__verified__", "");
      const finalTitleValue = isMarko ? `${cleanTitleVal}__verified__` : cleanTitleVal;

      const payload = {
        id: saveQuizId,
        title: finalTitleValue,
        description: description.trim(),
        image_url: imageUrl.trim() || null,
        created_by: uId,
        created_at: new Date().toISOString(),
        questions: parsedQuestions,
        lobby_music_url: lobbyMusicUrl,
      };

      if (editingQuizId) {
        const { data: existingQuiz } = await supabase
          .from("quizzes")
          .select("created_by")
          .eq("id", editingQuizId)
          .single();

        if (existingQuiz && existingQuiz.created_by !== uId) {
          throw new Error("Je bent niet geautoriseerd om deze quiz aan te passen.");
        }
      }

      const { error } = await supabase.from("quizzes").upsert(payload);
      if (error) throw new Error(error.message);

      if (!editingQuizId) {
        localStorage.setItem("last_quiz_creation_time", new Date().toISOString());
      }

      handleResetForm();
      setActiveTab("list");
      fetchQuizzes(true);
    } catch (err: any) {
      console.error(err);
      alert("Fout bij opslaan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Weet je zeker dat je deze quiz wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    try {
      const uId = await getUserId();
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId)
        .eq("created_by", uId);

      if (error) throw new Error(error.message);
      fetchQuizzes(true);
    } catch (error: any) {
      console.error(error);
      alert("Fout bij verwijderen quiz: " + error.message);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const clean = parseQuizTitle(q.title || "").cleanTitle.toLowerCase();
    const desc = (q.description || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return clean.includes(query) || desc.includes(query);
  });

  const currentQuestion = activeQuestionIdx >= 0 ? questions[activeQuestionIdx] : null;

  return (
    <div id="quiz-manager-root" className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-slate-100">
      {/* Top Application Bar */}
      <header id="quiz-manager-header" className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              id="btn-nav-back"
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === "nl" ? "Startscherm" : "Home"}</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:border-slate-800" />
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Kahoti Studio
                </h1>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                  {activeTab === "create"
                    ? editingQuizId
                      ? "Quiz bewerken"
                      : "Nieuwe quiz maken"
                    : "Mijn quiz bibliotheek"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Status / Auth Chip */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div id="user-profile-chip" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px] sm:max-w-[200px]">
                  {currentUser.email}
                </span>
                <button
                  id="btn-signout"
                  onClick={handleSignOut}
                  className="text-slate-400 hover:text-red-500 transition p-1 cursor-pointer"
                  title="Uitloggen"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}

            {activeTab === "create" && (
              <button
                id="btn-top-save-quiz"
                type="button"
                onClick={() => handleSaveManualQuiz()}
                disabled={isSaving}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs shadow-sm shadow-purple-600/20 disabled:opacity-50 transition cursor-pointer min-h-[44px]"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{editingQuizId ? "Wijzigingen Opslaan" : "Quiz Opslaan"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {!currentUser ? (
          /* Authentication Card */
          <div id="auth-panel" className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto text-xl font-bold">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {authMode === "login" ? "Inloggen bij Kahoti" : "Account Registreren"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Log in om je quizzen op al je apparaten te bewaren en live te hosten.
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  E-mailadres
                </label>
                <input
                  id="auth-input-email"
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="jouw-email@voorbeeld.nl"
                  className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Wachtwoord
                </label>
                <input
                  id="auth-input-password"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder={authMode === "login" ? "Wachtwoord" : "Minimaal 6 karakters"}
                  className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                />
              </div>

              {authError && (
                <div className="flex items-center gap-2 p-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                id="btn-auth-submit"
                type="submit"
                disabled={authSubmitting}
                className="w-full min-h-[44px] bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                {authSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Laden...</span>
                  </>
                ) : (
                  <span>{authMode === "login" ? "Inloggen" : "Account Aanmaken"}</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  id="btn-toggle-auth-mode"
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setAuthError("");
                  }}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  {authMode === "login"
                    ? "Nog geen account? Registreer gratis"
                    : "Heb je al een account? Log in"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* View Mode Segmented Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <button
                  id="tab-quiz-list"
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer min-h-[44px] ${
                    activeTab === "list"
                      ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Mijn Quizzen</span>
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {quizzes.length}
                  </span>
                </button>

                <button
                  id="tab-quiz-create"
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    setActiveTab("create");
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer min-h-[44px] ${
                    activeTab === "create"
                      ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingQuizId ? "Quiz Bewerken" : "Nieuwe Quiz"}</span>
                </button>
              </div>

              {activeTab === "list" && quizzes.length > 0 && (
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-quiz-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Zoek een quiz..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TAB: LIST */}
            {activeTab === "list" && (
              <div id="quiz-list-view">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Jouw quizzen ophalen...</p>
                  </div>
                ) : filteredQuizzes.length === 0 ? (
                  <div
                    id="empty-quizzes-card"
                    className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 max-w-lg mx-auto my-8"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                      {searchQuery ? "Geen quizzen gevonden" : "Nog geen quizzen aangemaakt"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      {searchQuery
                        ? "Probeer een andere zoekterm om jouw quiz te vinden."
                        : "Bouw je eerste interactieve quiz met afbeeldingen, geluksrad of puzzels en start een live sessie!"}
                    </p>
                    <button
                      id="btn-create-first-quiz"
                      type="button"
                      onClick={() => {
                        handleResetForm();
                        setActiveTab("create");
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition cursor-pointer min-h-[44px]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{searchQuery ? "Nieuwe Quiz Maken" : "Eerste Quiz Aanmaken"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredQuizzes.map((quiz) => {
                      const { cleanTitle, isVerified } = parseQuizTitle(quiz.title || "");
                      const quizThemeMeta = THEME_OPTIONS.find((t) => t.id === quiz.theme) || THEME_OPTIONS[0];

                      return (
                        <div
                          key={quiz.id}
                          id={`quiz-card-${quiz.id}`}
                          className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900/60 transition-all flex flex-col justify-between overflow-hidden"
                        >
                          <div>
                            {/* Card Header Media */}
                            {quiz.imageUrl ? (
                              <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                                <img
                                  src={quiz.imageUrl}
                                  alt={cleanTitle}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm">
                                    {quiz.questions?.length || 0} vragen
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-24 w-full bg-slate-100 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs">
                                    <quizThemeMeta.icon className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {quizThemeMeta.label}
                                  </span>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                                  {quiz.questions?.length || 0} vragen
                                </span>
                              </div>
                            )}

                            {/* Card Content */}
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-1 flex items-center gap-1.5">
                                  <span>{cleanTitle}</span>
                                  {isVerified && (
                                    <span
                                      className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full w-4 h-4 text-[9px] font-bold shrink-0 shadow-xs"
                                      title="Geverifieerde Quiz"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </h3>
                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px] mb-4">
                                {quiz.description || "Geen beschrijving opgegeven."}
                              </p>

                              {/* Badges / Metadata */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium">
                                  <quizThemeMeta.icon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                  <span>{quizThemeMeta.label}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="p-4 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                            <button
                              id={`btn-host-quiz-${quiz.id}`}
                              type="button"
                              onClick={() => onHostGame(quiz)}
                              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Host Quiz</span>
                            </button>

                            <button
                              id={`btn-edit-quiz-${quiz.id}`}
                              type="button"
                              onClick={() => handleEditQuiz(quiz)}
                              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:border-purple-300 dark:hover:border-purple-800 font-bold text-xs transition cursor-pointer"
                              title="Quiz Bewerken"
                            >
                              Bewerken
                            </button>

                            <button
                              id={`btn-delete-quiz-${quiz.id}`}
                              type="button"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="min-h-[44px] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/60 transition cursor-pointer flex items-center justify-center"
                              title="Verwijderen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: CREATE / EDIT */}
            {activeTab === "create" && (
              <div id="quiz-builder-studio" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-12">
                {/* LEFT SIDEBAR: Slide Navigator */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-3 lg:sticky lg:top-24">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          Dia Navigator
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                        {questions.length + 1} dia's
                      </span>
                    </div>

                    {/* Master Settings Slide (-1) */}
                    <button
                      id="slide-tab-settings"
                      type="button"
                      onClick={() => setActiveQuestionIdx(-1)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        activeQuestionIdx === -1
                          ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 ring-2 ring-purple-500/20"
                          : "bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                          <Settings className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {title.trim() || "Quiz Algemeen"}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                            Titel, cover & muziek
                          </span>
                        </div>
                      </div>
                      {activeQuestionIdx === -1 && (
                        <div className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                      )}
                    </button>

                    {/* Questions Slides List */}
                    <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                      {questions.map((q, idx) => {
                        const isActive = activeQuestionIdx === idx;
                        const typeMeta = getQuestionTypeMeta(q.questionType);

                        return (
                          <div
                            key={idx}
                            id={`slide-item-${idx}`}
                            onClick={() => setActiveQuestionIdx(idx)}
                            className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isActive
                                ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 ring-2 ring-purple-500/20"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${typeMeta.color}`}>
                                    <typeMeta.icon className="w-2.5 h-2.5" />
                                    <span>{typeMeta.label}</span>
                                  </span>
                                  {q.imageUrl && (
                                    <span className="text-[10px] text-slate-400" title="Bevat afbeelding">
                                      <ImageIcon className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                  {q.questionText.trim() || "Lege vraag..."}
                                </span>
                              </div>
                            </div>

                            {/* Hover / Action bar */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveQuestion(idx, "up");
                                }}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                                title="Omhoog verplaatsen"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveQuestion(idx, "down");
                                }}
                                disabled={idx === questions.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                                title="Omlaag verplaatsen"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateQuestion(idx);
                                }}
                                className="p-1 text-slate-400 hover:text-purple-600 cursor-pointer"
                                title="Dupliceren"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {questions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveQuestion(idx);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                  title="Verwijderen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Question Button */}
                    <button
                      id="btn-add-question"
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Vraag Toevoegen</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT MAIN PANEL: Active Slide Editor */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                  {activeQuestionIdx === -1 ? (
                    /* MASTER SETTINGS PANEL */
                    <div id="panel-quiz-settings" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
                            Algemene Instellingen
                          </span>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Quiz Details & Sfeer
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveQuestionIdx(0)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          <span>Ga naar vraag #1</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-5">
                        {/* Title Input */}
                        <div>
                          <label htmlFor="quiz-title-input" className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Quiz Titel *
                          </label>
                          <input
                            id="quiz-title-input"
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Bijv. De Grote Vrienden Quiz of Film Trivia"
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-base font-bold transition"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <label htmlFor="quiz-desc-input" className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Korte Omschrijving
                          </label>
                          <textarea
                            id="quiz-desc-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Waar gaat deze quiz over? Wie kan er meedoen?"
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium transition h-20 resize-none"
                          />
                        </div>

                        {/* Cover Image Uploader (ImgBB) */}
                        <div className="pt-2">
                          <ImageUploader
                            id="quiz-cover-uploader"
                            label="Quiz Cover Afbeelding (Optioneel)"
                            imageUrl={imageUrl}
                            onImageChange={setImageUrl}
                            placeholder="https://i.ibb.co/... of upload een coverfoto via de knop"
                          />
                        </div>

                        {/* Themes Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Achtergrond Vragen
                            </label>
                            <select
                              id="select-quiz-theme"
                              value={theme}
                              onChange={(e) => setTheme(e.target.value as any)}
                              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-bold text-sm cursor-pointer"
                            >
                              {THEME_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Achtergrond Lobby
                            </label>
                            <select
                              id="select-lobby-theme"
                              value={lobbyTheme}
                              onChange={(e) => setLobbyTheme(e.target.value as any)}
                              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-bold text-sm cursor-pointer"
                            >
                              {THEME_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Lobby Music Selector with Audio Preview */}
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Lobby Achtergrondmuziek
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <select
                              id="select-lobby-music"
                              value={lobbyMusicUrl}
                              onChange={(e) => setLobbyMusicUrl(e.target.value)}
                              className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-bold text-sm cursor-pointer"
                            >
                              {MUSIC_OPTIONS.map((m, idx) => (
                                <option key={idx} value={m.url}>
                                  {m.label} ({m.badge})
                                </option>
                              ))}
                            </select>

                            <button
                              id="btn-preview-music"
                              type="button"
                              onClick={() => handleToggleMusicPreview(lobbyMusicUrl)}
                              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition cursor-pointer shrink-0"
                            >
                              {playingMusicUrl === lobbyMusicUrl ? (
                                <>
                                  <Pause className="w-4 h-4 fill-current" />
                                  <span>Stop Muziek</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 fill-current" />
                                  <span>Luister Preview</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : currentQuestion ? (
                    /* QUESTION EDITOR PANEL */
                    <div id={`panel-question-editor-${activeQuestionIdx}`} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                      {/* Question Header & Quick Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                            #{activeQuestionIdx + 1}
                          </span>
                          <div>
                            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">
                              Vraag Editor
                            </span>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                              Vraag #{activeQuestionIdx + 1} Bewerken
                            </h2>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id={`btn-duplicate-question-${activeQuestionIdx}`}
                            type="button"
                            onClick={() => handleDuplicateQuestion(activeQuestionIdx)}
                            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Dupliceren</span>
                          </button>
                          {questions.length > 1 && (
                            <button
                              id={`btn-delete-question-${activeQuestionIdx}`}
                              type="button"
                              onClick={() => handleRemoveQuestion(activeQuestionIdx)}
                              className="min-h-[44px] px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-50 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Verwijderen</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Text Field */}
                      <div>
                        <label htmlFor={`question-text-input-${activeQuestionIdx}`} className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Vraagtekst *
                        </label>
                        <input
                          id={`question-text-input-${activeQuestionIdx}`}
                          type="text"
                          required
                          value={currentQuestion.questionText}
                          onChange={(e) => handleQuestionChange(activeQuestionIdx, "questionText", e.target.value)}
                          placeholder="Bijv. Wat is de hoofdstad van Frankrijk?"
                          className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-base font-bold transition placeholder-slate-400"
                        />
                      </div>

                      {/* Question Image Upload (ImgBB) */}
                      <div>
                        <ImageUploader
                          id={`question-image-uploader-${activeQuestionIdx}`}
                          label="Vraag Afbeelding (Optioneel)"
                          imageUrl={currentQuestion.imageUrl || ""}
                          onImageChange={(url) => handleQuestionChange(activeQuestionIdx, "imageUrl", url)}
                          placeholder="https://i.ibb.co/... of klik op Foto Uploaden (ImgBB)"
                        />
                      </div>

                      {/* Parameters Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            <Timer className="w-3.5 h-3.5 text-slate-400" />
                            <span>Antwoordtijd</span>
                          </label>
                          <select
                            id={`select-timelimit-${activeQuestionIdx}`}
                            value={currentQuestion.timeLimit}
                            onChange={(e) => handleQuestionChange(activeQuestionIdx, "timeLimit", e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value={10}>10 seconden (Snel)</option>
                            <option value={20}>20 seconden (Standaard)</option>
                            <option value={30}>30 seconden (Rustig)</option>
                            <option value={60}>60 seconden (Denktijd)</option>
                          </select>
                        </div>

                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            <Trophy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Puntenwaarde</span>
                          </label>
                          <select
                            id={`select-points-${activeQuestionIdx}`}
                            value={currentQuestion.points}
                            onChange={(e) => handleQuestionChange(activeQuestionIdx, "points", e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value={500}>500 pt (Basis)</option>
                            <option value={1000}>1000 pt (Standaard)</option>
                            <option value={2000}>2000 pt (Dubbele Bonus!)</option>
                          </select>
                        </div>

                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            <Gamepad2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Type Vraag</span>
                          </label>
                          <select
                            id={`select-type-${activeQuestionIdx}`}
                            value={currentQuestion.questionType || "multiple_choice"}
                            onChange={(e) => handleQuestionChange(activeQuestionIdx, "questionType", e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value="multiple_choice">Meerkeuze (2-6 opties)</option>
                            <option value="true_false">Waar of Niet Waar</option>
                            <option value="wheel_spin">Geluksrad gokronde</option>
                            <option value="puzzle">Sorteer puzzel volgorde</option>
                            <option value="slider">Schuifbalk getallenschaal</option>
                          </select>
                        </div>
                      </div>

                      {/* Answers / Options Module */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            {currentQuestion.questionType === "wheel_spin"
                              ? "Rad Sectoren"
                              : currentQuestion.questionType === "puzzle"
                              ? "Puzzel Volgorde (Van boven naar beneden)"
                              : currentQuestion.questionType === "slider"
                              ? "Schaal & Doelwaarde"
                              : "Antwoordopties (Vink het juiste antwoord aan)"}
                          </label>

                          {currentQuestion.questionType !== "true_false" &&
                            currentQuestion.questionType !== "slider" &&
                            currentQuestion.options.length < 6 && (
                              <button
                                id={`btn-add-option-${activeQuestionIdx}`}
                                type="button"
                                onClick={() => handleAddOptionToQuestion(activeQuestionIdx)}
                                className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Optie toevoegen ({currentQuestion.options.length}/6)</span>
                              </button>
                            )}
                        </div>

                        {/* SLIDER MODULE */}
                        {currentQuestion.questionType === "slider" ? (
                          <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Minimale Waarde
                                </label>
                                <input
                                  id="slider-min-input"
                                  type="number"
                                  step="any"
                                  value={currentQuestion.sliderMin ?? 1}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const updated = [...questions];
                                    updated[activeQuestionIdx].sliderMin = val;
                                    setQuestions(updated);
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Maximale Waarde
                                </label>
                                <input
                                  id="slider-max-input"
                                  type="number"
                                  step="any"
                                  value={currentQuestion.sliderMax ?? 10}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const updated = [...questions];
                                    updated[activeQuestionIdx].sliderMax = val;
                                    setQuestions(updated);
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Stapgrootte
                                </label>
                                <input
                                  id="slider-step-input"
                                  type="number"
                                  step="any"
                                  min="0.1"
                                  value={currentQuestion.sliderStep ?? 1}
                                  onChange={(e) => {
                                    const val = Math.max(0.1, Number(e.target.value));
                                    const updated = [...questions];
                                    updated[activeQuestionIdx].sliderStep = val;
                                    setQuestions(updated);
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold"
                                />
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                <span>Correct antwoord op de schuifbalk:</span>
                                <span className="text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                                  {currentQuestion.correctOptionIndex ?? 5}
                                </span>
                              </div>
                              <input
                                id="slider-range-preview"
                                type="range"
                                min={currentQuestion.sliderMin ?? 1}
                                max={currentQuestion.sliderMax ?? 10}
                                step={currentQuestion.sliderStep ?? 1}
                                value={currentQuestion.correctOptionIndex ?? 5}
                                onChange={(e) => handleQuestionChange(activeQuestionIdx, "correctOptionIndex", Number(e.target.value))}
                                className="w-full accent-purple-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        ) : currentQuestion.questionType === "true_false" ? (
                          /* TRUE / FALSE MODULE */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {currentQuestion.options.map((opt, oIdx) => {
                              const isCorrect = (currentQuestion.correctOptionIndices || [currentQuestion.correctOptionIndex ?? 0]).includes(oIdx);
                              const isTrue = oIdx === 0;

                              return (
                                <button
                                  key={oIdx}
                                  id={`btn-tf-option-${oIdx}`}
                                  type="button"
                                  onClick={() => {
                                    handleQuestionChange(activeQuestionIdx, "correctOptionIndices", [oIdx]);
                                    handleQuestionChange(activeQuestionIdx, "correctOptionIndex", oIdx);
                                  }}
                                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-center justify-between min-h-[72px] ${
                                    isCorrect
                                      ? isTrue
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-sm"
                                        : "bg-red-50 dark:bg-red-950/40 border-red-500 text-red-900 dark:text-red-100 shadow-sm"
                                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                      {isTrue ? (
                                        <ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <ThumbsDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-base font-black block">{opt}</span>
                                      <span className="text-xs font-semibold opacity-70 flex items-center gap-1">
                                        {isCorrect ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Correct antwoord</span>
                                          </>
                                        ) : (
                                          <span>Klik om als correct in te stellen</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  {isCorrect && (
                                    <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold ${isTrue ? "bg-emerald-500" : "bg-red-500"}`}>
                                      <Check className="w-4 h-4" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : currentQuestion.questionType === "puzzle" ? (
                          /* PUZZLE MODULE */
                          <div className="space-y-2.5">
                            <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800/60 font-semibold flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                              <span>Typ de items hieronder in de <strong>juiste volgorde</strong>. Spelers moeten ze live op hun telefoon in deze exacte volgorde slepen!</span>
                            </p>
                            <div className="space-y-2">
                              {currentQuestion.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                  <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-xs shrink-0">
                                    #{oIdx + 1}
                                  </span>
                                  <input
                                    id={`puzzle-opt-${oIdx}`}
                                    type="text"
                                    required
                                    value={opt}
                                    onChange={(e) => handleOptionChange(activeQuestionIdx, oIdx, e.target.value)}
                                    placeholder={`Stap #${oIdx + 1}`}
                                    className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  {currentQuestion.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOptionFromQuestion(activeQuestionIdx, oIdx)}
                                      className="text-slate-400 hover:text-red-500 p-1.5 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* MULTIPLE CHOICE & WHEEL MODULE */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {currentQuestion.options.map((opt, oIdx) => {
                              const badgeLetters = ["A", "B", "C", "D", "E", "F"];
                              const colors = [
                                "border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20 text-red-600",
                                "border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20 text-blue-600",
                                "border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 text-amber-600",
                                "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-600",
                                "border-purple-200 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/20 text-purple-600",
                                "border-orange-200 dark:border-orange-900/60 bg-orange-50/20 dark:bg-orange-950/20 text-orange-600",
                              ];
                              const colorStyle = colors[oIdx % colors.length];

                              const currentCorrects = currentQuestion.correctOptionIndices || [currentQuestion.correctOptionIndex ?? 0];
                              const isCorrect = currentCorrects.includes(oIdx);

                              const toggleOptionCorrect = () => {
                                let newCorrects = [...currentCorrects];
                                if (isCorrect) {
                                  newCorrects = newCorrects.filter((v) => v !== oIdx);
                                } else {
                                  newCorrects.push(oIdx);
                                }
                                handleQuestionChange(activeQuestionIdx, "correctOptionIndices", newCorrects);
                              };

                              return (
                                <div
                                  key={oIdx}
                                  id={`option-card-${oIdx}`}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                    isCorrect
                                      ? "ring-2 ring-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-400"
                                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                  }`}
                                >
                                  {currentQuestion.questionType !== "wheel_spin" && (
                                    <button
                                      id={`btn-correct-toggle-${oIdx}`}
                                      type="button"
                                      onClick={toggleOptionCorrect}
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition cursor-pointer shrink-0 ${
                                        isCorrect
                                          ? "bg-emerald-500 text-white shadow-xs"
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
                                      }`}
                                      title={isCorrect ? "Correct antwoord" : "Markeer als correct"}
                                    >
                                      {isCorrect ? <Check className="w-5 h-5" /> : badgeLetters[oIdx]}
                                    </button>
                                  )}

                                  <input
                                    id={`input-opt-${oIdx}`}
                                    type="text"
                                    required
                                    value={opt}
                                    onChange={(e) => handleOptionChange(activeQuestionIdx, oIdx, e.target.value)}
                                    placeholder={
                                      currentQuestion.questionType === "wheel_spin"
                                        ? `Sector ${oIdx + 1} tekst`
                                        : `Antwoord ${badgeLetters[oIdx]}`
                                    }
                                    className="flex-1 bg-transparent px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                                  />

                                  {currentQuestion.options.length > 2 && (
                                    <button
                                      id={`btn-remove-opt-${oIdx}`}
                                      type="button"
                                      onClick={() => handleRemoveOptionFromQuestion(activeQuestionIdx, oIdx)}
                                      className="text-slate-300 hover:text-red-500 p-1.5 transition cursor-pointer"
                                      title="Optie verwijderen"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Question Navigation Bar */}
                      <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <button
                          id="btn-prev-question"
                          type="button"
                          onClick={() => setActiveQuestionIdx(activeQuestionIdx - 1)}
                          className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>{activeQuestionIdx === 0 ? "Quiz Details" : "Vorige Vraag"}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {activeQuestionIdx < questions.length - 1 ? (
                            <button
                              id="btn-next-question"
                              type="button"
                              onClick={() => setActiveQuestionIdx(activeQuestionIdx + 1)}
                              className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                            >
                              <span>Volgende Vraag</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              id="btn-add-extra-question"
                              type="button"
                              onClick={handleAddQuestion}
                              className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Extra Vraag Toevoegen</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Primary Save Action Button */}
                  <div className="pt-2">
                    <button
                      id="btn-save-quiz-bottom"
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveManualQuiz()}
                      className="w-full min-h-[52px] bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider py-4 px-6 rounded-2xl shadow-md shadow-purple-600/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Quiz wordt opgeslagen...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{editingQuizId ? "Wijzigingen Aan Quiz Opslaan" : "Quiz Voltooien & Opslaan"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
