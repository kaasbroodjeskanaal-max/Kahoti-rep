import React, { useState } from "react";
import { supabase } from "../supabase";
import { ArrowLeft, Loader2, Play, RefreshCw } from "lucide-react";
import { AVATAR_BASES, AVATAR_HATS, AVATAR_ACCESSORIES, AVATAR_GRADIENTS, parseNicknameAndAvatar, getAvatarUrl } from "../avatarUtils";

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

  // Avatar states
  const [baseIdx, setBaseIdx] = useState(0);
  const [hatIdx, setHatIdx] = useState(0);
  const [accIdx, setAccIdx] = useState(0);
  const [gradIdx, setGradIdx] = useState(0);
  const [avatarTab, setAvatarTab] = useState<"base" | "hat" | "acc" | "bg">("base");

  const randomizeAvatar = () => {
    setBaseIdx(Math.floor(Math.random() * AVATAR_BASES.length));
    setHatIdx(Math.floor(Math.random() * AVATAR_HATS.length));
    setAccIdx(Math.floor(Math.random() * AVATAR_ACCESSORIES.length));
    setGradIdx(Math.floor(Math.random() * AVATAR_GRADIENTS.length));
  };

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
      const combinedNickname = `${nickname.trim()}:::${baseIdx}|${hatIdx}|${accIdx}|${gradIdx}`;
      const { error: insertError } = await supabase
        .from("players")
        .upsert({
          id: playerUid,
          session_id: targetSessionId,
          nickname: combinedNickname,
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

      onJoined(targetSessionId, combinedNickname);
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
          /* STEP 2: CHOOSE NICKNAME & AVATAR */
          <form onSubmit={handleJoinLobby} className="space-y-6">
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-sm rounded-full mb-3">
                Lobby gevonden!
              </span>
              <h2 className="text-2xl font-bold font-display text-slate-800 mb-1">Poppetje & Nickname</h2>
              <p className="text-gray-500 text-xs">Ontwerp je poppetje en voer je spelersnaam in!</p>
            </div>

            {/* Avatar Builder */}
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 w-full">
                <div className="relative shrink-0">
                  <img 
                    src={getAvatarUrl(nickname, baseIdx, hatIdx, accIdx, gradIdx)} 
                    alt="Jouw avatar" 
                    className="w-20 h-20 rounded-full border-4 border-slate-50 shadow-sm bg-white" 
                  />
                  <button
                    type="button"
                    onClick={randomizeAvatar}
                    className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full shadow-md hover:scale-110 active:scale-95 transition cursor-pointer"
                    title="Verras me!"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Live Ontwerp</label>
                  <p className="font-extrabold text-slate-700 truncate text-base">
                    {nickname || "Kies een naam..."}
                  </p>
                  <p className="text-[11px] text-gray-500 flex flex-wrap gap-1 mt-1 font-semibold">
                    <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">{AVATAR_BASES[baseIdx]?.name}</span>
                    {hatIdx > 0 && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">{AVATAR_HATS[hatIdx]?.name}</span>}
                    {accIdx > 0 && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md">{AVATAR_ACCESSORIES[accIdx]?.name}</span>}
                  </p>
                </div>
              </div>

              {/* Category Tab buttons */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setAvatarTab("base")}
                  className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
                    avatarTab === "base"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  🌏 Basis
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("hat")}
                  className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
                    avatarTab === "hat"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  👑 Hoed
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("acc")}
                  className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
                    avatarTab === "acc"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  🕶️ Bril/Extra
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("bg")}
                  className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
                    avatarTab === "bg"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  🎨 Kleur
                </button>
              </div>

              {/* Selector Menu Grid */}
              <div className="max-h-[140px] overflow-y-auto bg-white/50 p-2 rounded-2xl border border-slate-100">
                {avatarTab === "base" && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {AVATAR_BASES.map((b, idx) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBaseIdx(idx)}
                        className={`aspect-square flex flex-col items-center justify-center text-2xl rounded-xl transition cursor-pointer hover:bg-slate-100 ${
                          baseIdx === idx 
                            ? "bg-indigo-50 border-2 border-indigo-600 shadow-xs" 
                            : b.emoji === "" 
                              ? "bg-slate-100 text-slate-400 text-xs border border-dashed border-slate-300"
                              : "bg-white border border-slate-100"
                        }`}
                        title={b.name}
                      >
                        {b.emoji}
                      </button>
                    ))}
                  </div>
                )}

                {avatarTab === "hat" && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {AVATAR_HATS.map((h, idx) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setHatIdx(idx)}
                        className={`py-2 flex flex-col items-center justify-center rounded-xl transition cursor-pointer hover:bg-slate-100 gap-1 ${
                          hatIdx === idx 
                            ? "bg-indigo-50 border-2 border-indigo-600 shadow-xs" 
                            : "bg-white border border-slate-100"
                        }`}
                        title={h.name}
                      >
                        <span className="text-xl">{h.emoji || "✖️"}</span>
                        <span className="text-[9px] text-slate-500 font-bold truncate max-w-full px-1">{idx === 0 ? "Geen" : h.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                )}

                {avatarTab === "acc" && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {AVATAR_ACCESSORIES.map((a, idx) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAccIdx(idx)}
                        className={`py-2 flex flex-col items-center justify-center rounded-xl transition cursor-pointer hover:bg-slate-100 gap-1 ${
                          accIdx === idx 
                            ? "bg-indigo-50 border-2 border-indigo-600 shadow-xs" 
                            : "bg-white border border-slate-100"
                        }`}
                        title={a.name}
                      >
                        <span className="text-xl">{a.emoji || "✖️"}</span>
                        <span className="text-[9px] text-slate-500 font-bold truncate max-w-full px-1">{idx === 0 ? "Geen" : a.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                )}

                {avatarTab === "bg" && (
                  <div className="grid grid-cols-3 gap-2">
                    {AVATAR_GRADIENTS.map((g, idx) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGradIdx(idx)}
                        style={{ background: `linear-gradient(135deg, ${g.stops[0]}, ${g.stops[1]})` }}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black text-white text-shadow shadow-xs transition hover:scale-105 cursor-pointer text-center relative ${
                          gradIdx === idx 
                            ? "ring-4 ring-indigo-500 outline-none scale-102" 
                            : "opacity-85 border border-white"
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <input
                type="text"
                required
                maxLength={15}
                value={nickname}
                onChange={(e) => setNickname(e.target.value.replace(/[:|~]/g, ""))}
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
