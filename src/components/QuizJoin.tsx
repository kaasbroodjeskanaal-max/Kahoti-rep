import React, { useState } from "react";
import { supabase } from "../supabase";
import { ArrowLeft, Loader2, Play } from "lucide-react";

interface QuizJoinProps {
  onJoined: (sessionId: string, nickname: string) => void;
  onBack: () => void;
}

export default function QuizJoin({ onJoined, onBack }: QuizJoinProps) {
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState<"code" | "nickname">("code");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState("");

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = code.trim().replace(/\s+/g, "");
    if (formattedCode.length !== 6) {
      return setError("De code moet exact 6 cijfers zijn.");
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("sessions")
        .select("*")
        .eq("code", formattedCode);

      if (queryError) {
        throw new Error(queryError.message);
      }

      if (!data || data.length === 0) {
        setError("Lobby niet gevonden. Controleer de code en probeer het opnieuw.");
        setIsLoading(false);
        return;
      }

      // Found the session
      const sessionData = data[0];

      if (sessionData.status === "ended") {
        setError("Deze quizsessie is al afgelopen.");
        setIsLoading(false);
        return;
      }

      setTargetSessionId(sessionData.id);
      setStep("nickname");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Er is een fout opgetreden bij het zoeken naar de lobby.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setError("Vul een nickname in.");
    if (nickname.length > 25) return setError("Je nickname mag maximaal 25 tekens zijn.");

    setIsLoading(true);
    setError("");

    try {
      // Get Player UID dynamically from session, falling back to local ID if needed
      let playerUid = "";
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.user?.id) {
        playerUid = authSession.user.id;
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
        playerUid = localId;
      }

      // Create/Upsert player record in players table
      const { error: insertError } = await supabase
        .from("players")
        .upsert({
          id: playerUid,
          session_id: targetSessionId,
          nickname: nickname.trim(),
          score: 0,
          streak: 0,
          current_answer_index: null,
          current_answer_time: null,
          is_host: false,
          joined_at: new Date().toISOString()
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      onJoined(targetSessionId, nickname.trim());
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Er is een fout opgetreden bij het betreden van de lobby.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[75vh]">
      {/* Decorative Brand */}
      <h1 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight text-center mb-8 bg-linear-to-r from-indigo-600 via-pink-650 to-amber-500 bg-clip-text text-transparent drop-shadow-xs">
        Realtime Quiz!
      </h1>

      <div className="w-full bg-white rounded-3xl p-8 shadow-md border border-slate-50 relative overflow-hidden">
        {/* Subtle decorative strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-red-500 via-blue-500 via-yellow-450 to-green-500" />

        {step === "code" ? (
          /* STEP 1: ENTER CODE */
          <form onSubmit={handleValidateCode} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold font-display text-slate-800 mb-2">Meedoen aan een quiz?</h2>
              <p className="text-gray-500 text-sm">Typ de 6-cijferige spelcode in om de lobby te betreden.</p>
            </div>

            <div>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000 000"
                className="w-full text-center tracking-[0.5em] font-mono text-3xl font-extrabold px-4 py-4 border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 outline-none transition bg-slate-50 focus:bg-white"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 rounded-xl text-center text-sm transition">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                className="w-1/3 flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 py-4 rounded-xl font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Terug
              </button>
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-2/3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Volgende"
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: CHOOSE NICKNAME */
          <form onSubmit={handleJoinLobby} className="space-y-6">
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-sm rounded-full mb-3">
                Lobby gevonden!
              </span>
              <h2 className="text-2xl font-bold font-display text-slate-800 mb-2">Kies een Nickname</h2>
              <p className="text-gray-500 text-sm">Met welke naam wil je op het leaderboard verschijnen?</p>
            </div>

            <div>
              <input
                type="text"
                required
                maxLength={25}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Bijv. QuizKoning"
                className="w-full text-center text-lg font-bold px-4 py-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none transition bg-slate-50 focus:bg-white"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-center text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("code")}
                className="w-1/3 flex items-center justify-center border border-gray-200 hover:bg-gray-50 text-gray-700 py-4 rounded-xl font-semibold transition cursor-pointer"
                disabled={isLoading}
              >
                Terug
              </button>
              <button
                type="submit"
                disabled={isLoading || !nickname.trim()}
                className="w-2/3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Spelen!
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
