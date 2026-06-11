import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Quiz, Question } from "../types";
import { parseQuizTitle } from "../avatarUtils";
import { Plus, Trash2, Play, ArrowLeft, HelpCircle, Loader2 } from "lucide-react";
import { translations } from "../translations";

interface QuizManagerProps {
  lang?: "nl" | "en";
  onHostGame: (quiz: Quiz) => void;
  onBack: () => void;
}

export default function QuizManager({ lang = "nl", onHostGame, onBack }: QuizManagerProps) {
  const t = translations[lang];
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

  // Manual Creation State
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [theme, setTheme] = useState<"default" | "summer" | "winter" | "halloween" | "space" | "neon">("default");
  const [lobbyTheme, setLobbyTheme] = useState<"default" | "summer" | "winter" | "halloween" | "space" | "neon">("default");
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

  // Optional Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

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

  // Retrieve existing quizzes
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
        };
      });

      // Sort newest first
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
    };
  }, []);

  useEffect(() => {
    // If we have cached quizzes, fetch silently to refresh in the background
    const silent = quizzes.length > 0;
    fetchQuizzes(silent);
  }, [currentUser]);

  const handleSignOut = async () => {
    const lastAuth = localStorage.getItem("last_auth_action_timestamp");
    const now = Date.now();
    if (lastAuth && now - Number(lastAuth) < 5000) {
      alert("In- en uitloggen gebeurt te snel! Wacht 5 seconden.");
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
      setAuthError("Je voert authenticatie-acties te snel achter elkaar uit! Wacht een paar seconden.");
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
        setShowAuthForm(false);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        localStorage.setItem("last_auth_action_timestamp", String(now));
        localStorage.setItem("last_signup_timestamp", String(now));
        alert("Account succesvol geregistreerd!");
        setCurrentUser(data.user);
        setShowAuthForm(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Er is een fout opgetreden bij authenticatie.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Manual Questions Handlers
  const handleAddQuestion = () => {
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
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
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
      // sync legacy index as first item
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
        updated[idx].options = ["Bankroet ❌", "Min 500 📉", "Gelijkspel 🤝", "Plus 250 💰", "Plus 500 ⭐", "Plus 1000 👑"];
        updated[idx].correctOptionIndices = [];
        updated[idx].correctOptionIndex = -1;
      } else if (value === "puzzle") {
        updated[idx].options = ["🔴 Rood", "🔵 Blauw", "🟡 Geel", "🟢 Groen"];
        updated[idx].correctOptionIndices = [0, 1, 2, 3];
        updated[idx].correctOptionIndex = 123; // represents sequence 0,1,2,3
      } else if (value === "slider") {
        updated[idx].options = ["1", "2", "3", "4", "5"];
        updated[idx].correctOptionIndices = [2];
        updated[idx].correctOptionIndex = 2; // default is slider value 3 (which is index 2)
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

  // Start editing a quiz
  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setTitle(parseQuizTitle(quiz.title).cleanTitle);
    setDescription(quiz.description);
    setImageUrl(quiz.imageUrl || "");
    const firstQ = quiz.questions[0];
    const quizTheme = quiz.theme || firstQ?.theme || "default";
    const quizLobbyTheme = quiz.lobbyTheme || firstQ?.lobbyTheme || "default";
    setTheme(quizTheme);
    setLobbyTheme(quizLobbyTheme);

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
    })));
    setActiveTab("create");
  };

  // Save manual quiz
  const handleSaveManualQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("Vul een titel in.");

    // Cooldown check: 1 quiz per 10 minutes for new quiz creations only (exclude edits)
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

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return alert(`Vraag ${i + 1} heeft geen tekst.`);
      for (let o = 0; o < q.options.length; o++) {
        if (!q.options[o].trim()) return alert(`Vraag ${i + 1}, optie ${o + 1} is leeg.`);
      }
      if (q.questionType !== "wheel_spin") {
        const corIndices = q.correctOptionIndices || [q.correctOptionIndex ?? 0];
        if (corIndices.length === 0) {
          return alert(`Vraag ${i + 1} moet ten minste één correct antwoord hebben.`);
        }
      }
    }

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
      };

      if (editingQuizId) {
        // Ownership safety check: confirm the quiz belongs to the user
        const { data: existingQuiz } = await supabase
          .from("quizzes")
          .select("created_by")
          .eq("id", editingQuizId)
          .single();

        if (existingQuiz && existingQuiz.created_by !== uId) {
          throw new Error("Je bent niet geautoriseerd om de quiz van een andere gebruiker te bewerken.");
        }
      }

      const { error } = await supabase
        .from("quizzes")
        .upsert(payload);

      if (error) throw new Error(error.message);

      // Record successful creation time for cooldown
      if (!editingQuizId) {
        localStorage.setItem("last_quiz_creation_time", new Date().toISOString());
      }

      // Clear state and reload
      setEditingQuizId(null);
      setTitle("");
      setDescription("");
      setImageUrl("");
      setTheme("default");
      setLobbyTheme("default");
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
        },
      ]);
      setActiveTab("list");
      fetchQuizzes(true);
    } catch (err: any) {
      console.error(err);
      alert("Fout bij opslaan van de quiz: " + err.message);
    }
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Weet je zeker dat je deze quiz wilt verwijderen?")) return;
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" /> {lang === "nl" ? "Terug naar start" : "Back to start"}
        </button>
        <h1 className="text-3xl font-bold font-display tracking-tight text-slate-800 dark:text-white">
          {lang === "nl" ? "Quiz Beheerder" : "Quiz Creator"}
        </h1>
      </div>

      {!currentUser ? (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-md space-y-6 mt-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold font-display text-slate-800 dark:text-white">
              {authMode === "login" 
                ? (lang === "nl" ? "Inloggen" : "Log In") 
                : (lang === "nl" ? "Account aanmaken" : "Sign Up")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {lang === "nl" 
                ? "Je moet ingelogd zijn om quizzen aan te maken, te beheren of te hosten." 
                : "Register or log in to keep your custom quizzes stored securely."}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {lang === "nl" ? "E-mailadres" : "Email Address"}
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="bijv. je-naam@live.nl"
                className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {lang === "nl" ? "Wachtwoord" : "Password"}
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder={authMode === "login" ? (lang === "nl" ? "Wachtwoord" : "Password") : (lang === "nl" ? "Minimaal 6 karakters" : "At least 6 characters")}
                className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-500 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/30 border border-red-150 dark:border-red-900 p-3 rounded-xl">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              {authSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {authSubmitting 
                ? (lang === "nl" ? "Bezig met laden..." : "Loading...") 
                : authMode === "login" 
                  ? (lang === "nl" ? "Inloggen" : "Log In") 
                  : (lang === "nl" ? "Account Registreren" : "Register Account")}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setAuthError("");
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {authMode === "login" 
                  ? (lang === "nl" ? "Nog geen account? Registreer hier" : "No account yet? Register here") 
                  : (lang === "nl" ? "Heb je al een account? Log in" : "Already have an account? Log in")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 mb-6 flex justify-between items-center">
            <div className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
              {lang === "nl" ? "Je bent ingelogd als " : "You are logged in as "}
              <span className="font-bold underline">{currentUser.email}</span>
              {lang === "nl" ? ". Je quizzen worden veilig in de cloud bewaard!" : ". Your quizzes are securely saved in the cloud!"}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200 underline cursor-pointer"
            >
              {lang === "nl" ? "Uitloggen" : "Sign Out"}
            </button>
          </div>

      {/* Tabs */}
      <div className="flex border border-gray-100 dark:border-slate-800 mb-8 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-3 text-center font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "list"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
          }`}
        >
          {lang === "nl" ? "Mijn Quizzen" : "My Quizzes"} ({quizzes.length})
        </button>
        <button
          onClick={() => {
            setEditingQuizId(null);
            setTitle("");
            setDescription("");
            setImageUrl("");
            setQuestions([{ questionText: "", imageUrl: "", timeLimit: 20, points: 1000, options: ["", "", "", ""], correctOptionIndex: 0, correctOptionIndices: [0], questionType: "multiple_choice" }]);
            setActiveTab("create");
          }}
          className={`flex-1 py-3 text-center font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "create"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
          }`}
        >
          <Plus className="w-4 h-4" /> {lang === "nl" ? "Handmatig Maken" : "Create Manually"}
        </button>
      </div>

      {/* Tab Contents: List */}
      {activeTab === "list" && (
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-slate-400">{lang === "nl" ? "Laden van jouw quizzen..." : "Loading your quizzes..."}</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-800">
              <HelpCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                {lang === "nl" ? "Nog geen quizzen gevonden" : "No quizzes found yet"}
              </h2>
              <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                {lang === "nl" 
                  ? "Creëer direct jouw eerste interactieve quiz en host hem live voor je vrienden of collega's!"
                  : "Create your very first live quiz right away to start playing with others!"}
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setEditingQuizId(null);
                    setTitle("");
                    setDescription("");
                    setImageUrl("");
                    setQuestions([{ questionText: "", imageUrl: "", timeLimit: 20, points: 1000, options: ["", "", "", ""], correctOptionIndex: 0, correctOptionIndices: [0], questionType: "multiple_choice" }]);
                    setActiveTab("create");
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> {lang === "nl" ? "Handmatig Aanmaken" : "Create Manually"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {quiz.imageUrl && (
                      <div className="mb-4 -mx-6 -mt-6">
                        <img 
                          src={quiz.imageUrl} 
                          alt="Quiz afbeelding" 
                          referrerPolicy="no-referrer"
                          className="w-full h-40 object-cover" 
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white font-display mb-2 flex items-center gap-1.5">
                      <span>{parseQuizTitle(quiz.title || "").cleanTitle}</span>
                      {parseQuizTitle(quiz.title || "").isVerified && (
                        <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full w-4 h-4 text-[10px] font-bold shrink-0 shadow-sm" title="Geverifieerde Quiz">
                          ✓
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm line-clamp-2 mb-4">
                      {quiz.description || "Geen beschrijving."}
                    </p>
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 mb-4">
                      {quiz.questions.length} {quiz.questions.length === 1 ? "vraag" : "vragen"}
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-gray-100 dark:border-slate-800 pt-4 mt-2">
                    <button
                      onClick={() => onHostGame(quiz)}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" /> Host Quiz
                    </button>
                    <button
                      onClick={() => handleEditQuiz(quiz)}
                      className="text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 p-2.5 border border-gray-105 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl transition cursor-pointer font-bold"
                      title="Bewerken"
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-red-500 hover:text-white hover:bg-red-650 p-2.5 border border-red-100 dark:border-red-900/50 hover:border-red-500 rounded-xl transition cursor-pointer"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Manual creation form */}
      {activeTab === "create" && (
        <form onSubmit={handleSaveManualQuiz} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">Quiz Gegevens</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-400 mb-2">Quiz Titel *</label>              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bijv. De Grote Vakantie Quiz of Geschiedenis Quiz"
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-400 mb-2">Omschrijving</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Geef een korte omschrijving van je quiz"
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:border-transparent outline-none transition h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-400 mb-2">Quiz Afbeelding URL (Optioneel)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://voorbeeld.nl/plaatje.jpg"
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:border-transparent outline-none transition"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-400 mb-2">🛸 Achtergrond Thema Vragen</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:border-transparent outline-none transition font-medium"
                >
                  <option value="default">🌌 Standaard (Donker)</option>
                  <option value="summer">🌞 Zomer (Strand vibes)</option>
                  <option value="winter">❄️ Winter (Sneeuw & Frost)</option>
                  <option value="halloween">🎃 Halloween (Spooky)</option>
                  <option value="space">🪐 Kosmisch (Sterren)</option>
                  <option value="neon">⚡ Neon Retro (Synthwave)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-400 mb-2">🎈 Achtergrond Thema Lobby</label>
                <select
                  value={lobbyTheme}
                  onChange={(e) => setLobbyTheme(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:border-transparent outline-none transition font-medium"
                >
                  <option value="default">🌌 Standaard (Donker)</option>
                  <option value="summer">🌞 Zomer (Strand vibes)</option>
                  <option value="winter">❄️ Winter (Sneeuw & Frost)</option>
                  <option value="halloween">🎃 Halloween (Spooky)</option>
                  <option value="space">🪐 Kosmisch (Sterren)</option>
                  <option value="neon">⚡ Neon Retro (Synthwave)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white">Vragen ({questions.length})</h2>
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-805 shadow-sm space-y-4 relative">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Vraag {qIdx + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-lg transition cursor-pointer font-semibold"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" /> Vraag Verwijderen
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-650 dark:text-slate-300 mb-1">Vraagstelling *</label>
                  <input
                    type="text"
                    required
                    value={q.questionText}
                    onChange={(e) => handleQuestionChange(qIdx, "questionText", e.target.value)}
                    placeholder="Type hier je vraag..."
                    className="w-full px-4 py-2 border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-655 dark:text-slate-300 mb-1">Vraag Afbeelding URL (Optioneel)</label>
                  <input
                    type="url"
                    value={q.imageUrl || ""}
                    onChange={(e) => handleQuestionChange(qIdx, "imageUrl", e.target.value)}
                    placeholder="https://voorbeeld.nl/plaatje.jpg"
                    className="w-full px-4 py-2 border border-gray-255 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition"
                  />
                </div>

                {/* Sub configuration line */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-650 dark:text-slate-300 mb-1">Tijdslimiet (seconde)</label>
                    <select
                      value={q.timeLimit}
                      onChange={(e) => handleQuestionChange(qIdx, "timeLimit", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value={10}>10 seconden</option>
                      <option value={20}>20 seconden</option>
                      <option value={30}>30 seconden</option>
                      <option value={60}>60 seconden</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-650 dark:text-slate-300 mb-1">Puntenwaarde</label>
                    <select
                      value={q.points}
                      onChange={(e) => handleQuestionChange(qIdx, "points", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value={500}>500 punten (Makkelijk)</option>
                      <option value={1000}>1000 punten (Standaard)</option>
                      <option value={2000}>2000 punten (Dubbele Punten!)</option>
                    </select>
                  </div>
                </div>
                  {/* Question Type and Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-650 dark:text-slate-300 mb-1">Vraagtype</label>
                    <select
                      value={q.questionType || "multiple_choice"}
                      onChange={(e) => handleQuestionChange(qIdx, "questionType", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="multiple_choice">Meerkeuze (2-6 opties)</option>
                      <option value="true_false">Waar of Niet Waar</option>
                      <option value="wheel_spin">🎡 Waag een gokje (Sectorenrad)</option>
                      <option value="puzzle">🧩 Puzzel (Kleuren/Opties op volgorde slepen)</option>
                      <option value="slider">🎚️ Schuifbalk / Schaal (1 - 5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-650 dark:text-slate-300 mb-1">Status</label>
                    <div className="px-3 py-2 border border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 rounded-lg text-xs flex items-center justify-between text-slate-600 dark:text-slate-400 h-[42px]">
                      {q.questionType === "wheel_spin" ? (
                        <>
                          <span>Kans-gokronde 🎰</span>
                          <span className="font-bold text-amber-500 px-1.5 py-0.5 rounded-md bg-amber-50/40 dark:bg-amber-950/20 uppercase tracking-widest text-[9px]">
                            GELUKSRAD
                          </span>
                        </>
                      ) : q.questionType === "puzzle" ? (
                        <>
                          <span>Sorteeroefening 🧩</span>
                          <span className="font-bold text-purple-500 px-1.5 py-0.5 rounded-md bg-purple-50/40 dark:bg-purple-950/20 uppercase tracking-widest text-[9px]">
                            PUZZEL
                          </span>
                        </>
                      ) : q.questionType === "slider" ? (
                        <>
                          <span>Schaal kiezer 🎚️</span>
                          <span className="font-bold text-teal-500 px-1.5 py-0.5 rounded-md bg-teal-50/40 dark:bg-teal-950/20 uppercase tracking-widest text-[9px]">
                            SLIDER
                          </span>
                        </>
                      ) : (
                        <>
                          <span>{((q.correctOptionIndices || [q.correctOptionIndex ?? 0]).length > 1) ? "Multi-select" : "Single-select"}</span>
                          <span className="font-bold text-indigo-500 px-1.5 py-0.5 rounded-md bg-indigo-50/40 dark:bg-indigo-950/20 uppercase tracking-widest text-[9px]">
                            {((q.correctOptionIndices || [q.correctOptionIndex ?? 0]).length > 1) ? "MULTI" : "SINGLE"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                 {/* Options inputs */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-gray-650 dark:text-slate-300">
                      {q.questionType === "wheel_spin" ? (
                        <span>Wielen op het gokrad * <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Geef hier de mogelijke uitkomsten van het rad op)</span></span>
                      ) : q.questionType === "puzzle" ? (
                        <span>Puzzel Sorteerkaarten * <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Zorg dat ze in de CORRECTE volgorde staan)</span></span>
                      ) : q.questionType === "slider" ? (
                        <span>Correct getal op schaal * <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Bepaal de juiste waarde van 1 t/m 5)</span></span>
                      ) : (
                        <span>Antwoordopties * <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Vink de correcte antwoorden aan)</span></span>
                      )}
                    </label>
                    {q.questionType !== "true_false" && q.questionType !== "slider" && q.options.length < 6 && (
                      <button
                        type="button"
                        onClick={() => handleAddOptionToQuestion(qIdx)}
                        className="text-xs text-indigo-500 hover:text-indigo-650 font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Optie Toevoegen ({q.options.length}/6)
                      </button>
                    )}
                  </div>

                  {q.questionType === "slider" ? (
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      {/* Scale size configuration */}
                      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <span className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                          ⚙️ Pas Schaalbereik Aan (2 t/m 10):
                        </span>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                            const isCurrentMax = q.options.length === val;
                            return (
                              <button
                                type="button"
                                key={val}
                                onClick={() => {
                                  const newOptions = Array.from({ length: val }, (_, i) => String(i + 1));
                                  const updated = [...questions];
                                  updated[qIdx].options = newOptions;
                                  // clamp correct option index if it's out of bounds
                                  if ((updated[qIdx].correctOptionIndex ?? 2) >= val) {
                                    updated[qIdx].correctOptionIndex = val - 1;
                                    updated[qIdx].correctOptionIndices = [val - 1];
                                  }
                                  setQuestions(updated);
                                }}
                                className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                                  isCurrentMax
                                    ? "bg-indigo-650 text-white border-indigo-800 shadow-md scale-105"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                              >
                                1 t/m {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
                        Kies het correcte getal op de schaal van 1 tot {q.options.length} door er op te klikken:
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3 max-w-lg mx-auto py-1">
                        {q.options.map((_, idx) => {
                          const num = idx + 1;
                          const isSelected = (q.correctOptionIndex ?? 2) === idx;
                          return (
                            <button
                              type="button"
                              key={num}
                              onClick={() => {
                                handleQuestionChange(qIdx, "correctOptionIndex", idx);
                              }}
                              className={`w-11 h-11 rounded-full font-bold flex items-center justify-center border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-650 border-indigo-800 text-white shadow-lg scale-110"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-indigo-500 text-center font-bold">
                        Geselecteerde juiste waarde: {(q.correctOptionIndex ?? 2) + 1}
                      </p>
                    </div>
                  ) : q.questionType === "puzzle" ? (
                    <div className="space-y-3">
                      <p className="text-xs text-indigo-500 font-bold mb-2 p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                        ⚡ Schrijf de antwoorden in de CORRECTE volgorde van boven naar beneden. Tijdens de quiz worden deze kaarten voor spelers door elkaar geschud. Zij moeten ze vervolgens op de juiste volgorde slepen.
                      </p>
                      <div className="grid md:grid-cols-2 gap-3">
                        {q.options.map((opt, oIdx) => {
                          const optStyles = [
                            { border: "border-red-200 dark:border-red-900/50 bg-red-50/15 dark:bg-red-950/20", label: "Rood" },
                            { border: "border-blue-200 dark:border-blue-900/50 bg-blue-50/15 dark:bg-blue-950/20", label: "Blauw" },
                            { border: "border-yellow-200 dark:border-yellow-905/40 bg-yellow-50/15 dark:bg-yellow-950/20", label: "Geel" },
                            { border: "border-green-200 dark:border-green-900/50 bg-green-50/15 dark:bg-green-950/20", label: "Groen" },
                            { border: "border-purple-200 dark:border-purple-900/50 bg-purple-50/15 dark:bg-purple-950/20", label: "Paars" },
                            { border: "border-orange-200 dark:border-orange-900/50 bg-orange-50/15 dark:bg-orange-950/20", label: "Oranje" },
                          ];
                          const styleInfo = optStyles[oIdx % optStyles.length];
                          
                          return (
                            <div key={oIdx} className="flex items-center gap-2.5 bg-slate-50/55 dark:bg-slate-900/30 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 relative group">
                              <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold font-mono text-xs flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shrink-0 select-none">
                                #{oIdx + 1}
                              </span>
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                                placeholder={`Element of kleur ${oIdx + 1}`}
                                className={`flex-1 px-3 py-2 border ${styleInfo.border} text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm`}
                              />
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionFromQuestion(qIdx, oIdx)}
                                  className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition shrink-0 cursor-pointer"
                                  title="Item verwijderen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {q.options.map((opt, oIdx) => {
                        const optStyles = [
                          { border: "border-red-200 dark:border-red-900/50 bg-red-50/15 dark:bg-red-950/20", label: "A (Rood)" },
                          { border: "border-blue-200 dark:border-blue-900/50 bg-blue-50/15 dark:bg-blue-950/20", label: "B (Blauw)" },
                          { border: "border-yellow-200 dark:border-yellow-905/40 bg-yellow-50/15 dark:bg-yellow-950/20", label: "C (Geel)" },
                          { border: "border-green-200 dark:border-green-900/50 bg-green-50/15 dark:bg-green-950/20", label: "D (Groen)" },
                          { border: "border-purple-200 dark:border-purple-900/50 bg-purple-50/15 dark:bg-purple-950/20", label: "E (Paars)" },
                          { border: "border-orange-200 dark:border-orange-900/50 bg-orange-50/15 dark:bg-orange-950/20", label: "F (Oranje)" },
                        ];
                        const styleInfo = optStyles[oIdx % optStyles.length];
                        const currentCorrects = q.correctOptionIndices || [q.correctOptionIndex ?? 0];
                        const isCorrect = currentCorrects.includes(oIdx);

                        const handleCheckboxToggle = () => {
                          let newCorrects = [...currentCorrects];
                          if (isCorrect) {
                            newCorrects = newCorrects.filter((val) => val !== oIdx);
                          } else {
                            newCorrects.push(oIdx);
                          }
                          handleQuestionChange(qIdx, "correctOptionIndices", newCorrects);
                        };

                        return (
                          <div key={oIdx} className="flex items-center gap-2 group">
                            {q.questionType !== "wheel_spin" && (
                              <input
                                type="checkbox"
                                checked={isCorrect}
                                onChange={handleCheckboxToggle}
                                className="w-5 h-5 rounded border-gray-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 accent-indigo-500"
                              />
                            )}
                            <div className="flex-1 flex gap-2 relative items-center">
                              <input
                                type="text"
                                required
                                disabled={q.questionType === "true_false"}
                                value={opt}
                                onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                                placeholder={q.questionType === "wheel_spin" ? `Sector ${oIdx + 1} tekst of punten` : `Antwoordoptie ${styleInfo.label}`}
                                className={`flex-1 px-3 py-2.5 border ${styleInfo.border} text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:opacity-85 disabled:cursor-not-allowed`}
                              />
                              {q.questionType !== "true_false" && q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionFromQuestion(qIdx, oIdx)}
                                  className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition shrink-0 cursor-pointer"
                                  title="Optie verwijderen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.questionType === "wheel_spin" ? (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 font-medium bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/40">
                      🎰 Spelers draaien aan dit rad voor punten tijdens deze ronde! Tip: Gebruik getallen (bijv. "+500", "-100", "0") of tekst (bijv. "Bankroet", "Verdubbelen"). De logica herkent automatisch getallen of geeft vaste bonuspunten!
                    </p>
                  ) : q.questionType === "puzzle" ? (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-lg border border-purple-200/40">
                      🧩 Sorteervragen (puzzels) zijn ontzettend dynamisch en leuk! De gekleurde kaarten worden door spelers gesleept en de score hangt af van de exacte juiste volgorde!
                    </p>
                  ) : q.questionType === "slider" ? (
                    <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 font-medium bg-teal-50/50 dark:bg-teal-950/20 p-2.5 rounded-lg border border-teal-200/40">
                      🎚️ Schuifbalkvragen dagen spelers uit om een getal op een schaal te schuiven. De dichtstbijzijnde of exacte waarde levert de score op!
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Vink de correcte antwoorden hierboven aan. Selecteer meerdere juiste opties om deze vraag automatisch te veranderen in een MULTI-keuze vraag!
                    </p>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-5 h-5" /> Extra Vraag Toevoegen
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-md transition cursor-pointer"
          >
            {editingQuizId ? "Wijzigingen Opslaan" : "Sla Quiz Op"}
          </button>
        </form>
      )}
    </>
  )}
</div>
  );
}
