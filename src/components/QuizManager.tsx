import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Quiz, Question } from "../types";
import { Plus, Trash2, Play, ArrowLeft, HelpCircle, Loader2 } from "lucide-react";

interface QuizManagerProps {
  onHostGame: (quiz: Quiz) => void;
  onBack: () => void;
}

export default function QuizManager({ onHostGame, onBack }: QuizManagerProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  // Manual Creation State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [questions, setQuestions] = useState<Omit<Question, "id">[]>([
    {
      questionText: "",
      imageUrl: "",
      timeLimit: 20,
      points: 1000,
      options: ["", "", "", ""],
      correctOptionIndex: 0,
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
  const fetchQuizzes = async () => {
    setIsLoading(true);
    try {
      const uId = await getUserId();
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("created_by", uId);

      if (error) throw new Error(error.message);

      const list: Quiz[] = (data || []).map((q: any) => ({
        id: q.id,
        title: q.title || "Naamloze Quiz",
        description: q.description || "",
        imageUrl: q.image_url || "",
        creatorId: q.created_by,
        createdAt: q.created_at,
        questions: q.questions || [],
      }));

      // Sort newest first
      setQuizzes(list.sort((a, b) => b.id.localeCompare(a.id)));
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
    fetchQuizzes();
  }, [currentUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        setCurrentUser(data.user);
        setShowAuthForm(false);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
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
    } else if (field === "correctOptionIndex") {
      updated[idx].correctOptionIndex = Number(value);
    }
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  // Save manual quiz
  const handleSaveManualQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("Vul een titel in.");

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return alert(`Vraag ${i + 1} heeft geen tekst.`);
      for (let o = 0; o < 4; o++) {
        if (!q.options[o].trim()) return alert(`Vraag ${i + 1}, optie ${o + 1} is leeg.`);
      }
    }

    try {
      const uId = await getUserId();
      const randomQuizId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
      const parsedQuestions = questions.map((q, idx) => ({
        ...q,
        id: `q_${idx}_${Date.now()}`,
      }));

      const { error } = await supabase
        .from("quizzes")
        .insert({
          id: randomQuizId,
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl.trim() || null,
          created_by: uId,
          created_at: new Date().toISOString(),
          questions: parsedQuestions,
        });

      if (error) throw new Error(error.message);

      // Clear state and reload
      setTitle("");
      setDescription("");
      setImageUrl("");
      setQuestions([
        {
          questionText: "",
          imageUrl: "",
          timeLimit: 20,
          points: 1000,
          options: ["", "", "", ""],
          correctOptionIndex: 0,
        },
      ]);
      setActiveTab("list");
      fetchQuizzes();
    } catch (err: any) {
      console.error(err);
      alert("Fout bij opslaan van de quiz: " + err.message);
    }
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Weet je zeker dat je deze quiz wilt verwijderen?")) return;
    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (error) throw new Error(error.message);
      fetchQuizzes();
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
          className="flex items-center gap-2 text-gray-650 hover:text-gray-900 font-medium transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" /> Terug naar start
        </button>
        <h1 className="text-3xl font-bold font-display tracking-tight text-slate-800">
          Quiz Beheerder
        </h1>
      </div>

      {!currentUser ? (
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 mt-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold font-display text-slate-800">
              {authMode === "login" ? "Inloggen" : "Account aanmaken"}
            </h2>
            <p className="text-sm text-gray-500">
              Je moet ingelogd zijn om quizzen aan te maken, te beheren of te hosten.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-mailadres</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="bijv. je-naam@live.nl"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Wachtwoord</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder={authMode === "login" ? "Wachtwoord" : "Minimaal 6 karakters"}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-500 font-semibold bg-red-50 border border-red-150 p-3 rounded-xl">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              {authSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {authSubmitting ? "Bezig met laden..." : authMode === "login" ? "Inloggen" : "Account Registreren"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setAuthError("");
                }}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                {authMode === "login" ? "Nog geen account? Registreer hier" : "Heb je al een account? Log in"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6 flex justify-between items-center">
            <div className="text-sm text-emerald-800 font-medium">
              Je bent ingelogd als <span className="font-bold underline">{currentUser.email}</span>. Je quizzen worden veilig in de cloud bewaard!
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-950 underline cursor-pointer"
            >
              Uitloggen
            </button>
          </div>

      {/* Tabs */}
      <div className="flex border border-gray-100 mb-8 bg-white p-1 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-3 text-center font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "list"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          Mijn Quizzen ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-3 text-center font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "create"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          <Plus className="w-4 h-4" /> Handmatig Maken
        </button>
      </div>

      {/* Tab Contents: List */}
      {activeTab === "list" && (
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-500">Laden van jouw quizzen...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-700 mb-2">Nog geen quizzen gevonden</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                Creëer direct jouw eerste interactieve quiz en host hem live voor je vrienden of collega's!
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setActiveTab("create")}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Handmatig Aanmaken
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
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
                    <h3 className="text-xl font-bold text-slate-800 font-display mb-2">
                      {quiz.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                      {quiz.description || "Geen beschrijving."}
                    </p>
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-4">
                      {quiz.questions.length} {quiz.questions.length === 1 ? "vraag" : "vragen"}
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-gray-100 pt-4 mt-2">
                    <button
                      onClick={() => onHostGame(quiz)}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" /> Host Quiz
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-red-500 hover:text-white hover:bg-red-550 p-2.5 border border-red-100 hover:border-red-500 rounded-xl transition cursor-pointer"
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
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800">Quiz Gegevens</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quiz Titel *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bijv. De Grote Vakantie Quiz of Geschiedenis Quiz"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Omschrijving</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Geef een korte omschrijving van je quiz"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quiz Afbeelding URL (Optioneel)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://voorbeeld.nl/plaatje.jpg"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800">Vragen ({questions.length})</h2>
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 relative">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="font-bold text-slate-700">Vraag {qIdx + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition cursor-pointer font-semibold"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" /> Vraag Verwijderen
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-650 mb-1">Vraagstelling *</label>
                  <input
                    type="text"
                    required
                    value={q.questionText}
                    onChange={(e) => handleQuestionChange(qIdx, "questionText", e.target.value)}
                    placeholder="Type hier je vraag..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-650 mb-1">Vraag Afbeelding URL (Optioneel)</label>
                  <input
                    type="url"
                    value={q.imageUrl || ""}
                    onChange={(e) => handleQuestionChange(qIdx, "imageUrl", e.target.value)}
                    placeholder="https://voorbeeld.nl/plaatje.jpg"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>

                {/* Sub configuration line */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-650 mb-1">Tijdslimiet (seconde)</label>
                    <select
                      value={q.timeLimit}
                      onChange={(e) => handleQuestionChange(qIdx, "timeLimit", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value={10}>10 seconden</option>
                      <option value={20}>20 seconden</option>
                      <option value={30}>30 seconden</option>
                      <option value={60}>60 seconden</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-650 mb-1">Puntenwaarde</label>
                    <select
                      value={q.points}
                      onChange={(e) => handleQuestionChange(qIdx, "points", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value={500}>500 punten (Makkelijk)</option>
                      <option value={1000}>1000 punten (Standaard)</option>
                      <option value={2000}>2000 punten (Dubbele Punten!)</option>
                    </select>
                  </div>
                </div>

                {/* Options inputs */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Antwoordopties *</label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Option 0 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctOptionIndex === 0}
                        onChange={() => handleQuestionChange(qIdx, "correctOptionIndex", 0)}
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        required
                        value={q.options[0]}
                        onChange={(e) => handleOptionChange(qIdx, 0, e.target.value)}
                        placeholder="Antwoordoptie A (Rood)"
                        className="flex-1 px-3 py-2 border border-red-200 bg-red-50/20 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                    {/* Option 1 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctOptionIndex === 1}
                        onChange={() => handleQuestionChange(qIdx, "correctOptionIndex", 1)}
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        required
                        value={q.options[1]}
                        onChange={(e) => handleOptionChange(qIdx, 1, e.target.value)}
                        placeholder="Antwoordoptie B (Blauw)"
                        className="flex-1 px-3 py-2 border border-blue-200 bg-blue-50/20 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                    {/* Option 2 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctOptionIndex === 2}
                        onChange={() => handleQuestionChange(qIdx, "correctOptionIndex", 2)}
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        required
                        value={q.options[2]}
                        onChange={(e) => handleOptionChange(qIdx, 2, e.target.value)}
                        placeholder="Antwoordoptie C (Geel)"
                        className="flex-1 px-3 py-2 border border-yellow-200 bg-yellow-50/20 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                    {/* Option 3 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctOptionIndex === 3}
                        onChange={() => handleQuestionChange(qIdx, "correctOptionIndex", 3)}
                        className="w-4 h-4 text-indigo-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        required
                        value={q.options[3]}
                        onChange={(e) => handleOptionChange(qIdx, 3, e.target.value)}
                        placeholder="Antwoordoptie D (Groen)"
                        className="flex-1 px-3 py-2 border border-green-200 bg-green-50/20 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Selecteer het bolletje voor het juiste antwoord.</p>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-850 py-3 rounded-xl font-bold transition cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Extra Vraag Toevoegen
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-md transition cursor-pointer"
          >
            Sla Quiz Op
          </button>
        </form>
      )}
    </>
  )}
</div>
  );
}
