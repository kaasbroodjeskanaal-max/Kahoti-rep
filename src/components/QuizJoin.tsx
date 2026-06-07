import React, { useState } from "react";
import { supabase } from "../supabase";
import { ArrowLeft, Loader2, Play, RefreshCw, Sparkles, Sliders, Palette } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { AVATAR_BASES, AVATAR_HATS, AVATAR_ACCESSORIES, AVATAR_GRADIENTS, parseNicknameAndAvatar, getAvatarUrl, parseQuizTitle } from "../avatarUtils";

// Fun Dutch character personality tags to make customization incredibly delightful!
export const BASE_DESCRIPTIONS: Record<string, string> = {
  earth: "De Wereldreiziger: Heeft overal fans! 🗺️",
  robot: "De AI Professor: Weet alles sneller! 🤖",
  ghost: "De Spookachtige Schitteraar: Zweeft door de vragen! 👻",
  alien: "De Ruimtevaarder: Kennis uit andere dimensies! 👽",
  cat: "De Chille Huiskat: Altijd scherp, nooit gestrest! 🐱",
  lion: "De Dappere Koning: Brult bij elk goed antwoord! 🦁",
  unicorn: "De Magische Eenhoorn: Gelooft in wonderen! 🦄",
  star: "De Quiz Ster: Schijnt feller dan de rest! ⭐",
  heart: "De Gulle Gever: Verspreidt geluk in de lobby! 💖",
  dino: "De Oeroude Wijze: Heeft miljoenen jaren ervaring! 🦖",
  dragon: "De Vurige Strijder: Blaast de competitie weg! 🐲",
  panda: "De Grote Knuffel: Zachtaardig maar oersterk! 🐼",
  poop: "De Grappige Geluksbrenger: Altijd gieren en brullen! 💩",
  monkey: "De Snelle Slingeraar: Plukt alle punten direct weg! 🐵",
  penguin: "De Chille Pinguïn: Houdt het hoofd altijd ijskoud! 🐧",
  pizza: "De Smaakvolle Denker: Puntje voor puntje het slimst! 🍕",
  donut: "De Cirkel van Wijsheid: Geen gaten in de kennis! 🍩",
  cookie: "De Slimme Koper: Brokkelt nooit onder druk! 🍪",
  avocado: "De Gezonde Rivaal: Boordevol superfood energie! 🥑",
  soccer: "De Teamspeler: Scoort altijd in de 90e minuut! ⚽",
  moneybag: "De Jackpot Winnaar: Speelt puur voor de buit! 💰",
  lightning: "De Flitsende Denker: Reageert sneller dan het licht! ⚡",
  hamburger: "De Snack-Kampioen: Eet quizvragen als ontbijt! 🍔",
  rose: "De Elegante Bloesem: Prachtige stijl, vlijmscherpe geest! 🌹",
  turtle: "De Rustige Strategist: Langzaam maar zeker naar de top! 🐢",
};

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

  // Avatar customization states
  const [baseIdx, setBaseIdx] = useState(0);
  const [hatIdx, setHatIdx] = useState(0);
  const [accIdx, setAccIdx] = useState(0);
  const [gradIdx, setGradIdx] = useState(0);
  const [avatarTab, setAvatarTab] = useState<"base" | "hat" | "acc" | "bg" | "style">("base");

  // Advanced nudge/position adjustments
  const [customHatX, setCustomHatX] = useState(0);
  const [customHatY, setCustomHatY] = useState(0);
  const [customHatSize, setCustomHatSize] = useState(0);
  const [customAccX, setCustomAccX] = useState(0);
  const [customAccY, setCustomAccY] = useState(0);
  const [customAccSize, setCustomAccSize] = useState(0);

  // Reaction triggering states
  const [reactKey, setReactKey] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const triggerReaction = () => {
    setReactKey((prev) => prev + 1);
  };

  const startMysterySpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    let duration = 0;
    const intervalTime = 60;
    const maxSteps = 12;
    let stepCount = 0;

    const interval = setInterval(() => {
      setBaseIdx(Math.floor(Math.random() * AVATAR_BASES.length));
      setHatIdx(Math.floor(Math.random() * AVATAR_HATS.length));
      setAccIdx(Math.floor(Math.random() * AVATAR_ACCESSORIES.length));
      setGradIdx(Math.floor(Math.random() * AVATAR_GRADIENTS.length));
      
      // Keep offsets clean during spin
      setCustomHatX(0);
      setCustomHatY(0);
      setCustomHatSize(0);
      setCustomAccX(0);
      setCustomAccY(0);
      setCustomAccSize(0);

      triggerReaction();
      stepCount++;

      if (stepCount >= maxSteps) {
        clearInterval(interval);
        setIsSpinning(false);
        // Play final sparkling burst on success
        confetti({
          particleCount: 22,
          spread: 35,
          origin: { y: 0.55 },
          colors: ["#6366f1", "#f43f5e", "#10b981", "#fbbf24"],
          disableForReducedMotion: true,
        });
      }
    }, intervalTime);
  };

  const randomizeAvatar = () => {
    setBaseIdx(Math.floor(Math.random() * AVATAR_BASES.length));
    setHatIdx(Math.floor(Math.random() * AVATAR_HATS.length));
    setAccIdx(Math.floor(Math.random() * AVATAR_ACCESSORIES.length));
    setGradIdx(Math.floor(Math.random() * AVATAR_GRADIENTS.length));
    
    // Clear offsets on quick random
    setCustomHatX(0);
    setCustomHatY(0);
    setCustomHatSize(0);
    setCustomAccX(0);
    setCustomAccY(0);
    setCustomAccSize(0);

    triggerReaction();
  };

  const [playerUid, setPlayerUid] = useState<string>("");
  const [isMarko, setIsMarko] = useState(false);

  // Load player ID and check if they are markohoksen@gmail.com on mount
  React.useEffect(() => {
    async function initUser() {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const userEmail = authSession?.user?.email?.toLowerCase() || "";
      if (userEmail === "markohoksen@gmail.com") {
        setIsMarko(true);
      }
      
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
    initUser();
  }, []);

  // Synchronise player choices in real-time with the host's screen while they are designing
  React.useEffect(() => {
    if (step !== "nickname" || !targetSessionId || !playerUid) return;

    const currentName = nickname.trim() || "Kiezen...";
    const nameWithTag = isMarko ? `${currentName}__verified__` : currentName;
    const combinedNickname = `${nameWithTag}:::${baseIdx}|${hatIdx}|${accIdx}|${gradIdx}|${customHatX}|${customHatY}|${customHatSize}|${customAccX}|${customAccY}|${customAccSize}`;

    const timer = setTimeout(async () => {
      try {
        await supabase
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
      } catch (err) {
        console.error("Draft sync failed:", err);
      }
    }, 400); // 400ms debounce to prevent spamming database on rapid typing/clicking

    return () => clearTimeout(timer);
  }, [step, targetSessionId, nickname, baseIdx, hatIdx, accIdx, gradIdx, playerUid, isMarko]);

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = code.trim().replace(/\s+/g, "");
    if (formattedCode.length !== 6) {
      return setError("De code moet exact 6 cijfers zijn.");
    }

    setIsLoading(true);
    setError("");

    try {
      let data: any[] | null = null;
      let queryError: any = null;

      const firstAttempt = await supabase
        .from("sessions")
        .select("*")
        .eq("code", formattedCode);

      data = firstAttempt.data;
      queryError = firstAttempt.error;

      if ((!data || data.length === 0) && !queryError && /^\d+$/.test(formattedCode)) {
        const numericCode = parseInt(formattedCode, 10);
        const secondAttempt = await supabase
          .from("sessions")
          .select("*")
          .eq("code", numericCode);

        if (!secondAttempt.error && secondAttempt.data && secondAttempt.data.length > 0) {
          data = secondAttempt.data;
        }
      }

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

      const { isLocked } = parseQuizTitle(sessionData.quiz_title || "");
      if (isLocked) {
        setError("De host heeft deze lobby gesloten/vergrendeld. Nieuwe spelers kunnen niet meer meedoen.");
        setIsLoading(false);
        return;
      }

      // Limit check to prevent bot flooding (max 60 players per lobby)
      const { data: currentPlayers, error: countErr } = await supabase
        .from("players")
        .select("id")
        .eq("session_id", sessionData.id);

      if (!countErr && currentPlayers && currentPlayers.length >= 60) {
        setError("Deze lobby is vol! Er zijn al 60 spelers aangemeld. Om geautomatiseerde bots en databaseoverbelasting te voorkomen, is de capaciteit gelimiteerd.");
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
      if (!playerUid) {
        throw new Error("Spelers-ID wordt nog geladen. Probeer het over een seconde opnieuw.");
      }

      // Rate limit joins per device: maximum 1 join action per 5 seconds
      const now = Date.now();
      const lastJoin = localStorage.getItem("last_quiz_join_time");
      if (lastJoin && now - Number(lastJoin) < 5050) {
        const secondsLeft = Math.ceil((5050 - (now - Number(lastJoin))) / 1000);
        throw new Error(`Niet zo snel! Je kunt maximaal één keer per 5 seconden een lobby betreden. Wacht nog ${secondsLeft} seconden.`);
      }

      // Create/Upsert player record in players table
      const currentName = nickname.trim();
      const nameWithTag = isMarko ? `${currentName}__verified__` : currentName;
      const combinedNickname = `${nameWithTag}:::${baseIdx}|${hatIdx}|${accIdx}|${gradIdx}|${customHatX}|${customHatY}|${customHatSize}|${customAccX}|${customAccY}|${customAccSize}`;

      // Clean up previous double entries with the same name in this session to prevent doubles
      const { data: existingSameNamePlayers } = await supabase
        .from("players")
        .select("id, nickname")
        .eq("session_id", targetSessionId);

      // Verify overall capacity in case someone bypassed code check
      if (existingSameNamePlayers && existingSameNamePlayers.length >= 60) {
        throw new Error("Lobby is vol! Maximaal 60 spelers per sessie toegestaan.");
      }

      if (existingSameNamePlayers && existingSameNamePlayers.length > 0) {
        const toDeleteIds: string[] = [];
        for (const p of existingSameNamePlayers) {
          const parts = (p.nickname || "").split(":::");
          const namePart = parts[0] ? parts[0].replace("__verified__", "") : "";
          if (namePart.toLowerCase() === currentName.toLowerCase() && p.id !== playerUid) {
            toDeleteIds.push(p.id);
          }
        }
        if (toDeleteIds.length > 0) {
          await supabase
            .from("players")
            .delete()
            .in("id", toDeleteIds);
        }
      }

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

      localStorage.setItem("last_quiz_join_time", String(Date.now()));
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
      {/* Decorative Brand with Logo */}
      <div className="relative mb-4 flex justify-center">
        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-110" />
        <img 
          src="https://cdn.imageurlgenerator.com/uploads/9df1cd72-ee23-4abc-8f99-c7bf3a38bebc.jpeg"
          alt="Kahoti Logo"
          className="relative w-24 h-24 object-cover rounded-2xl border-4 border-white dark:border-slate-800 shadow-lg"
          referrerPolicy="no-referrer"
        />
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight text-center mb-8 bg-linear-to-r from-indigo-600 via-pink-650 to-amber-500 bg-clip-text text-transparent drop-shadow-xs">
        Kahoti!
      </h1>

      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-md border border-slate-50 dark:border-slate-800 relative overflow-hidden">
        {/* Subtle decorative strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-red-500 via-blue-500 via-yellow-450 to-green-500" />

        {step === "code" ? (
          /* STEP 1: ENTER CODE */
          <form onSubmit={handleValidateCode} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold font-display text-slate-800 dark:text-white mb-2">Meedoen aan een quiz?</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Typ de 6-cijferige spelcode in om de lobby te betreden.</p>
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
                className="w-full text-center tracking-[0.5em] font-mono text-3xl font-extrabold px-4 py-4 border-2 border-indigo-100 dark:border-indigo-950 rounded-2xl focus:border-indigo-500 outline-none transition bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 text-slate-900 dark:text-white"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl text-center text-sm transition">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                className="w-1/3 flex items-center justify-center gap-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-400 py-4 rounded-xl font-semibold transition cursor-pointer"
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
              <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-mono font-bold text-sm rounded-full mb-3">
                Lobby gevonden!
              </span>
              <h2 className="text-2xl font-bold font-display text-slate-800 dark:text-white mb-1">Poppetje & Nickname</h2>
              <p className="text-gray-500 dark:text-slate-400 text-xs">Ontwerp je poppetje en voer je spelersnaam in!</p>
            </div>

            {/* Avatar Builder */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850 flex flex-col gap-4 animate-fade-in relative">
              
              {/* Immersive Pod Showcase Zone */}
              <div className="flex flex-col items-center p-5 bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 rounded-2xl border border-slate-850 w-full relative overflow-hidden shadow-inner">
                {/* Spotlight background radiation */}
                <div className="absolute inset-0 bg-radial-to-t from-transparent via-transparent to-indigo-500/10 opacity-60 pointer-events-none" />
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-45 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center">
                  {/* Floating/Reactive Showcased Avatar */}
                  <motion.div
                    key={reactKey}
                    animate={{
                      y: [0, -6, 0],
                      scale: [1, 1.15, 0.96, 1],
                      rotate: [0, -3, 3, 0],
                    }}
                    transition={{
                      y: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      scale: {
                        duration: 0.35,
                        ease: "easeOut"
                      },
                      rotate: {
                        duration: 0.35,
                        ease: "easeOut"
                      }
                    }}
                    className="relative"
                  >
                    <img 
                      src={getAvatarUrl(
                        nickname, 
                        baseIdx, 
                        hatIdx, 
                        accIdx, 
                        gradIdx,
                        customHatX,
                        customHatY,
                        customHatSize,
                        customAccX,
                        customAccY,
                        customAccSize
                      )} 
                      alt="Jouw avatar" 
                      className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-xl bg-slate-950" 
                    />
                    
                    {/* Active sparkle overlay */}
                    {isSpinning && (
                      <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping pointer-events-none" />
                    )}
                  </motion.div>

                  {/* Fun character details display */}
                  <div className="mt-3 text-center space-y-1">
                    <p className="font-black text-white text-base truncate max-w-[200px]">
                      {nickname || "Kies een naam..."}
                    </p>
                    <span className="inline-flex px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 font-mono text-[9px] uppercase tracking-wider font-extrabold rounded-full border border-indigo-500/20">
                      {AVATAR_BASES[baseIdx]?.name.split(" ")[0]} ✦ {AVATAR_GRADIENTS[gradIdx]?.name}
                    </span>
                    <p className="text-[10px] text-slate-400 italic max-w-[260px] leading-relaxed select-none">
                      {BASE_DESCRIPTIONS[AVATAR_BASES[baseIdx]?.id] || "Ontwerper van grappen en grollen!"}
                    </p>
                  </div>
                </div>

                {/* Slot-machine randomize trigger */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    type="button"
                    onClick={startMysterySpin}
                    disabled={isSpinning}
                    className="bg-indigo-650 hover:bg-indigo-500 text-white p-2 rounded-xl shadow-lg border border-indigo-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs font-bold"
                    title="Mystery Spin"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isSpinning ? "animate-spin" : ""}`} />
                    <span>Loot Spin</span>
                  </motion.button>
                </div>
              </div>

              {/* Category Tab buttons */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none gap-2 pb-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setAvatarTab("base")}
                  className={`px-3 pb-2 text-xs font-bold text-center border-b-2 transition shrink-0 cursor-pointer ${
                    avatarTab === "base"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-655 dark:hover:text-slate-300"
                  }`}
                >
                  🌏 Basis
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("hat")}
                  className={`px-3 pb-2 text-xs font-bold text-center border-b-2 transition shrink-0 cursor-pointer ${
                    avatarTab === "hat"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-655 dark:hover:text-slate-300"
                  }`}
                >
                  👑 Muts
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("acc")}
                  className={`px-3 pb-2 text-xs font-bold text-center border-b-2 transition shrink-0 cursor-pointer ${
                    avatarTab === "acc"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-655 dark:hover:text-slate-300"
                  }`}
                >
                  🕶️ Extra
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("bg")}
                  className={`px-3 pb-2 text-xs font-bold text-center border-b-2 transition shrink-0 cursor-pointer ${
                    avatarTab === "bg"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-655 dark:hover:text-slate-300"
                  }`}
                >
                  🎨 Kleur
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("style")}
                  className={`px-3 pb-2 text-xs font-bold text-center border-b-2 transition shrink-0 cursor-pointer flex items-center gap-1 ${
                    avatarTab === "style"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-655 dark:hover:text-slate-300"
                  }`}
                >
                  🛠️ Kneden
                </button>
              </div>

              {/* Selector Menu Grid */}
              <div className="max-h-[160px] overflow-y-auto bg-white/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                {avatarTab === "base" && (
                  <div className="grid grid-cols-5 gap-1.5 animate-fade-in">
                    {AVATAR_BASES.map((b, idx) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setBaseIdx(idx); triggerReaction(); }}
                        className={`aspect-square flex flex-col items-center justify-center text-2xl rounded-xl transition cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          baseIdx === idx 
                            ? "bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-600 shadow-xs" 
                            : b.emoji === "" 
                              ? "bg-slate-100 dark:bg-slate-950 text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-850"
                              : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-white"
                        }`}
                        title={b.name}
                      >
                        {b.emoji}
                      </button>
                    ))}
                  </div>
                )}

                {avatarTab === "hat" && (
                  <div className="grid grid-cols-4 gap-1.5 animate-fade-in">
                    {AVATAR_HATS.map((h, idx) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => { setHatIdx(idx); setCustomHatX(0); setCustomHatY(0); setCustomHatSize(0); triggerReaction(); }}
                        className={`py-2 flex flex-col items-center justify-center rounded-xl transition cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 gap-1 ${
                          hatIdx === idx 
                            ? "bg-indigo-50 dark:bg-indigo-950/45 border-2 border-indigo-600 shadow-xs" 
                            : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-white"
                        }`}
                        title={h.name}
                      >
                        <span className="text-xl">{h.emoji || "✖️"}</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-full px-1">{idx === 0 ? "Geen" : h.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                )}

                {avatarTab === "acc" && (
                  <div className="grid grid-cols-4 gap-1.5 animate-fade-in">
                    {AVATAR_ACCESSORIES.map((a, idx) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setAccIdx(idx); setCustomAccX(0); setCustomAccY(0); setCustomAccSize(0); triggerReaction(); }}
                        className={`py-2 flex flex-col items-center justify-center rounded-xl transition cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 gap-1 ${
                          accIdx === idx 
                            ? "bg-indigo-100/30 dark:bg-indigo-950/45 border-2 border-indigo-600 shadow-xs" 
                            : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-white"
                        }`}
                        title={a.name}
                      >
                        <span className="text-xl">{a.emoji || "✖️"}</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-full px-1">{idx === 0 ? "Geen" : a.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                )}

                {avatarTab === "bg" && (
                  <div className="grid grid-cols-3 gap-2 animate-fade-in">
                    {AVATAR_GRADIENTS.map((g, idx) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => { setGradIdx(idx); triggerReaction(); }}
                        style={{ background: `linear-gradient(135deg, ${g.stops[0]}, ${g.stops[1]})` }}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black text-white text-shadow shadow-xs transition hover:scale-105 cursor-pointer text-center relative ${
                          gradIdx === idx 
                            ? "ring-4 ring-indigo-500 outline-none scale-102" 
                            : "opacity-85 border border-white dark:border-slate-900"
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}

                {avatarTab === "style" && (
                  <div className="space-y-4 p-2 animate-fade-in text-left">
                    {/* Hat Nudging */}
                    <div className="bg-slate-100/30 dark:bg-slate-950/30 p-3 rounded-xl space-y-3 border border-slate-200/40 dark:border-slate-900">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">👑 Positie Hoofddeksel</p>
                      {hatIdx === 0 ? (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">Kies overmorgen eerst een hoed om deze te kneden!</p>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                              <span>Grootte:</span>
                              <span className="font-bold">{customHatSize > 0 ? `+${customHatSize}` : customHatSize}</span>
                            </div>
                            <input
                              type="range"
                              min="-15"
                              max="25"
                              value={customHatSize}
                              onChange={(e) => { setCustomHatSize(Number(e.target.value)); triggerReaction(); }}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                              <span>Hoogte:</span>
                              <span className="font-bold">{customHatY > 0 ? `+${customHatY}` : customHatY}</span>
                            </div>
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              value={customHatY}
                              onChange={(e) => { setCustomHatY(Number(e.target.value)); triggerReaction(); }}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                              <span>Horizontaal:</span>
                              <span className="font-bold">{customHatX > 0 ? `+${customHatX}` : customHatX}</span>
                            </div>
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              value={customHatX}
                              onChange={(e) => { setCustomHatX(Number(e.target.value)); triggerReaction(); }}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lens/Acc Nudging */}
                    <div className="bg-slate-100/30 dark:bg-slate-950/30 p-3 rounded-xl space-y-3 border border-slate-200/40 dark:border-slate-900">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">🕶️ Positie Extra/Bril</p>
                      {accIdx === 0 ? (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">Kies eerst een bril of extra item om deze te kneden!</p>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                              <span>Grootte:</span>
                              <span className="font-bold">{customAccSize > 0 ? `+${customAccSize}` : customAccSize}</span>
                            </div>
                            <input
                              type="range"
                              min="-15"
                              max="25"
                              value={customAccSize}
                              onChange={(e) => { setCustomAccSize(Number(e.target.value)); triggerReaction(); }}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                              <span>Hoogte:</span>
                              <span className="font-bold">{customAccY > 0 ? `+${customAccY}` : customAccY}</span>
                            </div>
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              value={customAccY}
                              onChange={(e) => { setCustomAccY(Number(e.target.value)); triggerReaction(); }}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                              <span>Horizontaal:</span>
                              <span className="font-bold">{customAccX > 0 ? `+${customAccX}` : customAccX}</span>
                            </div>
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              value={customAccX}
                              onChange={(e) => { setCustomAccX(Number(e.target.value)); triggerReaction(); }}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>
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
                className="w-full text-center text-lg font-bold px-4 py-3 border-2 border-indigo-100 dark:border-indigo-950 rounded-xl focus:border-indigo-500 outline-none transition bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 text-slate-900 dark:text-white"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl text-center text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("code")}
                className="w-1/3 flex items-center justify-center border border-gray-200 dark:border-slate-805 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 py-4 rounded-xl font-semibold transition cursor-pointer"
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
