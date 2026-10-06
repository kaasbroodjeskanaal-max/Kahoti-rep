import React, { useState } from "react";
import { supabase } from "../supabase";
import { ArrowLeft, Loader2, Play, RefreshCw, Sparkles, Sliders, Palette, Dices, ClipboardPaste, Settings2, Shuffle, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import SnowEffect from "./SnowEffect";
import {
  AVATAR_BASES,
  AVATAR_HATS,
  AVATAR_ACCESSORIES,
  AVATAR_GRADIENTS,
  AVATAR_PRESETS,
  AvatarPreset,
  getRandomFunNickname,
  parseNicknameAndAvatar,
  getAvatarUrl,
  parseQuizTitle,
  DICEBEAR_STYLES,
  DICEBEAR_BACKGROUNDS,
  DICEBEAR_POPULAR_SEEDS,
  getDiceBearAvatarUrl,
  getRandomDiceBearConfig
} from "../avatarUtils";
import { translations } from "../translations";
import { sfx } from "../soundManager";


// Fun Dutch character personality tags to make customization incredibly delightful!
export const BASE_DESCRIPTIONS: Record<string, string> = {
  earth: "De Wereldreiziger: Heeft overal fans! 🗺️",
  robot: "De Robot Professor: Weet alles sneller! 🤖",
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
  cheese: "De Ware Kaasbaas: Goudgeel en altijd de slimste! 🧀",
  fox: "De Slimme Vos: Vlijmscherp en altijd de concurrentie te slim af! 🦊",
  bear: "De Knuffelbeer: Zacht van buiten, oersterk in scores! 🐻",
  bunny: "De Turbo Haas: Sneller op de knop dan wie dan ook! 🐰",
  tiger: "De Quiz Tijger: Klauwt zich direct naar plek 1! 🐯",
  dog: "De Trouwe Vriend: Laat nooit een vraag onbeantwoord! 🐶",
  wolf: "De Alfa Wolf: Leidt de roedel met scherpe intelligentie! 🐺",
  koala: "De Relaxte Koala: Rustig, vriendelijk en super slim! 🐨",
  frog: "De Wonder Kikker: Springt vrolijk over elke hindernis! 🐸",
  octopus: "Het Meesterbrein: Acht tentakels om tegelijk te antwoorden! 🐙",
  dolphin: "De Speelse Dolfijn: Zwemt moeiteloos door alle quizzen! 🐬",
  shark: "De Vlijmscherpe Haai: Ruikt direct de juiste antwoorden! 🦈",
  owl: "De Wijze Uil: Ziet alles en weet altijd raad! 🦉",
  butterfly: "De Fladderende Schoonheid: Brengt vrolijkheid in de game! 🦋",
  bee: "De Bezige Bij: Altijd hard aan het werk voor punten! 🐝",
  flamingo: "De Elegante Flamingo: Staat stevig op één poot aan de top! 🦩",
  hedgehog: "De Slimme Egel: Scherp van geest en altijd beschermd! 🦔",
  giraffe: "De Hoge Uitkijk: Ziet de overwinning al van ver aankomen! 🦒",
  duck: "De Snelle Woerd: Altijd in zijn element op het water! 🦆",
  crab: "De Zijwaartse Strateeg: Pakt alle punten razendsnel mee! 🦀",
  peacock: "De Trotse Pauw: Schittert met een prachtige score! 🦚",
  fries: "De Knapperige Snack: Altijd goudbruin en onweerstaanbaar! 🍟",
  taco: "De Pittige Taco: Gevuld met knapperige kennis! 🌮",
  popcorn: "De Popcorn Koning: Popt direct naar de nummer 1 positie! 🍿",
  icecream: "Het Koele IJsje: Smelt nooit onder spanning! 🍦",
  watermelon: "De Frisse Schijf: Vol verfrissende ideeën! 🍉",
  strawberry: "De Zoete Aardbei: Altijd een feestje in de lobby! 🍓",
  chocolate: "De Pure Genieter: Geeft instant hersenenergie! 🍫",
  pancake: "De Gestreken Flens: Stapelt de punten torenhoog op! 🥞",
  sushi: "De Rol Meester: Perfect gerold en vlijmscherp van smaak! 🍣",
  pretzel: "De Gouden Knoop: Geen enkele vraag brengt hem in de knoop! 🥨",
  cupcake: "Het Zoete Gebakje: Versierd met gouden sterren! 🧁",
  hotdog: "De Snelle Snack: Gaat erin als koek! 🌭",
  pineapple: "De Tropische Koning: Draagt altijd een gouden kroontje! 🍍",
  croissant: "De Franse Meester: Flinterdunne laagjes vol wijsheid! 🥐",
  gamepad: "De Hardcore Gamer: Kent alle cheatcodes van het leven! 🎮",
  joystick: "De Retro Legende: Maximale controle over elke ronde! 🕹️",
  basketball: "De Dunk Koning: Raakt elk antwoord loepzuiver! 🏀",
  tennis: "De Acespecialist: Slaat elke moeilijke vraag terug! 🎾",
  skateboard: "De Coole Skater: Doet een kickflip naar plek 1! 🛹",
  racecar: "De Flitsende Coureur: Raast met topsnelheid over de finish! 🏎️",
  rocket: "De Kosmische Astronaut: Schiet naar ongekende hoogtes! 🚀",
  trophy_base: "De Geboren Kampioen: Schittert met puur goud! 🏆",
  boxing: "De Knock-out Specialist: Slaat de concurrentie knock-out! 🥊",
  target: "De Scherpschutter: Schiet altijd pal in de roos! 🎯",
  dice_base: "Het Gelukskind: Gooit altijd een dubbele zes! 🎲",
  guitar: "De Rockster: Speelt de sterren van de hemel! 🎸",
  ufo: "Het Buitenaardse Wonder: Kennis uit verre melkwegstelsels! 🛸",
  fire_base: "Het Vuurvlammetje: Brandt van verlangen om te winnen! 🔥",
  diamond_base: "Het Fonkelende Juweel: Keihard en onverwoestbaar slim! 💎",
  crystal_ball: "De Waarzegger: Weet de antwoorden al voor ze gesteld zijn! 🔮",
  rainbow: "De Kleurenpracht: Brengt zonneschijn na elke regenronde! 🌈",
  clover: "Het Klavertje Vier: Heeft altijd het geluk aan zijn zijde! 🍀",
  crown_base: "De Hoogheid: Regeert met wijsheid over het scorebord! 👑",
  boom: "De Dynamiet Knal: Explodeert van pure quizkennis! 💥",
  sun: "Het Zonnetje: Verlicht de hele spelerslijst! ☀️",
  moon: "De Nachtbraker: Ziet alles in het donker! 🌙",
  palette: "De Kunstenaar: Kleurt het spelveld met prachtige scores! 🎨",
  wand_base: "De Tovenaar: Tovert het ene na het andere goede antwoord tevoorschijn! 🪄",
  pumpkin: "Het Griezel Genie: Laat de tegenstanders bibberen! 🎃",
  skull: "De Onverschrokkene: nergens bang voor in de arena! 💀",
  pixel_monster: "Het 8-Bit Mysterie: Speelt het hele spel uit! 👾",
};

interface QuizJoinProps {
  lang?: "nl" | "en";
  onJoined: (sessionId: string, nickname: string) => void;
  onBack: () => void;
}

export default function QuizJoin({ lang = "nl", onJoined, onBack }: QuizJoinProps) {
  const t = translations[lang];
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState<"code" | "nickname">("code");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState("");

  // Avatar mode: "dicebear" (recommended, easy & beautiful!) or "emoji"
  const [avatarMode, setAvatarMode] = useState<"dicebear" | "emoji">("dicebear");

  // DiceBear customization states
  const [dbStyle, setDbStyle] = useState<string>("bottts");
  const [dbSeed, setDbSeed] = useState<string>("Sparky");
  const [dbBg, setDbBg] = useState<string>("b6e3f4");
  const [customSeeds, setCustomSeeds] = useState<{ seed: string; name: string }[]>(
    DICEBEAR_POPULAR_SEEDS["bottts"] || []
  );

  // Avatar customization states (Emoji)
  const [baseIdx, setBaseIdx] = useState(5);
  const [hatIdx, setHatIdx] = useState(1);
  const [accIdx, setAccIdx] = useState(0);
  const [gradIdx, setGradIdx] = useState(8);
  const [avatarTab, setAvatarTab] = useState<"characters" | "customize">("characters");
  const [activeCategory, setActiveCategory] = useState<"all" | "christmas" | "animals" | "scifi" | "food" | "heroes">("christmas");
  const [activePresetId, setActivePresetId] = useState<string | null>("king_lion");
  const [customBaseCategory, setCustomBaseCategory] = useState<"all" | "animals" | "food" | "gaming" | "magic">("all");

  // Keep compatibility for nickname encoding
  const [customHatX, setCustomHatX] = useState(0);
  const [customHatY, setCustomHatY] = useState(0);
  const [customHatSize, setCustomHatSize] = useState(0);
  const [customAccX, setCustomAccX] = useState(0);
  const [customAccY, setCustomAccY] = useState(0);
  const [customAccSize, setCustomAccSize] = useState(0);

  // Reaction triggering states
  const [reactKey, setReactKey] = useState(0);

  const triggerReaction = () => {
    setReactKey((prev) => prev + 1);
  };

  const handleSelectDiceBearStyle = (styleId: string) => {
    setDbStyle(styleId);
    const styleObj = DICEBEAR_STYLES.find((s) => s.id === styleId);
    if (styleObj?.defaultBg) {
      setDbBg(styleObj.defaultBg);
    }
    const seeds = DICEBEAR_POPULAR_SEEDS[styleId] || [];
    setCustomSeeds(seeds);
    if (seeds.length > 0) {
      setDbSeed(seeds[0].seed);
      if (!nickname.trim() || nickname.startsWith("Speler") || nickname.startsWith("Player")) {
        setNickname(seeds[0].name + Math.floor(Math.random() * 89 + 10));
      }
    }
    sfx.playSelectAnswer();
    triggerReaction();
  };

  const shuffleStyleSeeds = () => {
    const prefixes = ["Spark", "Nova", "Leo", "Max", "Zoe", "Sam", "Kai", "Luna", "Ace", "Pixel", "Rex", "Bolt", "Blitz", "Glow", "Fox", "Echo"];
    const newBatch = Array.from({ length: 12 }, () => {
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(Math.random() * 900 + 100);
      return { seed: `${p}_${num}`, name: `${p}${num}` };
    });
    setCustomSeeds(newBatch);
    sfx.playSelectAnswer();
    triggerReaction();
  };

  const applyPreset = (p: AvatarPreset) => {
    setAvatarMode("emoji");
    setActivePresetId(p.id);
    setBaseIdx(p.baseIdx);
    setHatIdx(p.hatIdx);
    setAccIdx(p.accIdx);
    setGradIdx(p.gradIdx);
    setCustomHatX(0);
    setCustomHatY(0);
    setCustomHatSize(0);
    setCustomAccX(0);
    setCustomAccY(0);
    setCustomAccSize(0);
    if (!nickname.trim() || nickname.startsWith("Speler") || nickname.startsWith("Player") || AVATAR_PRESETS.some(prev => nickname.startsWith(prev.suggestedName))) {
      setNickname(p.suggestedName);
    }
    sfx.playSelectAnswer();
    triggerReaction();
  };

  const handleRandomNickname = () => {
    const funName = getRandomFunNickname();
    setNickname(funName);
    sfx.playSelectAnswer();
    triggerReaction();
  };

  const handlePasteCode = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      const cleanDigits = clipText.replace(/\D/g, "").slice(0, 6);
      if (cleanDigits) {
        setCode(cleanDigits);
        sfx.playSelectAnswer();
      }
    } catch {
      // Ignore if clipboard access is denied
    }
  };

  const randomizeAvatar = () => {
    if (avatarMode === "dicebear") {
      const conf = getRandomDiceBearConfig();
      setDbStyle(conf.style);
      setDbSeed(conf.seed);
      setDbBg(conf.bg);
      setCustomSeeds(DICEBEAR_POPULAR_SEEDS[conf.style] || []);
      setNickname(conf.suggestedName);
    } else {
      const xmasPresets = AVATAR_PRESETS.filter(p => p.category === "christmas");
      const pool = xmasPresets.length > 0 && Math.random() > 0.35 ? xmasPresets : AVATAR_PRESETS;
      const randomPreset = pool[Math.floor(Math.random() * pool.length)];
      applyPreset(randomPreset);
      setNickname(randomPreset.suggestedName + Math.floor(Math.random() * 89 + 10));
    }
    confetti({
      particleCount: 35,
      spread: 65,
      origin: { y: 0.45 },
      colors: ["#dc2626", "#16a34a", "#fbbf24", "#ffffff", "#38bdf8"],
      disableForReducedMotion: true,
    });
    sfx.playSelectAnswer();
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
    const combinedNickname = avatarMode === "dicebear"
      ? `${nameWithTag}:::db:${dbStyle}:${dbSeed}:${dbBg}`
      : `${nameWithTag}:::${baseIdx}|${hatIdx}|${accIdx}|${gradIdx}|${customHatX}|${customHatY}|${customHatSize}|${customAccX}|${customAccY}|${customAccSize}`;

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
  }, [step, targetSessionId, nickname, avatarMode, dbStyle, dbSeed, dbBg, baseIdx, hatIdx, accIdx, gradIdx, playerUid, isMarko]);

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
      if (!nickname.trim()) {
        const conf = getRandomDiceBearConfig();
        setDbStyle(conf.style);
        setDbSeed(conf.seed);
        setDbBg(conf.bg);
        setCustomSeeds(DICEBEAR_POPULAR_SEEDS[conf.style] || []);
        setNickname(conf.suggestedName);
      }
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
      const combinedNickname = avatarMode === "dicebear"
        ? `${nameWithTag}:::db:${dbStyle}:${dbSeed}:${dbBg}`
        : `${nameWithTag}:::${baseIdx}|${hatIdx}|${accIdx}|${gradIdx}|${customHatX}|${customHatY}|${customHatSize}|${customAccX}|${customAccY}|${customAccSize}`;

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
        for (const p of existingSameNamePlayers) {
          const parts = (p.nickname || "").split(":::");
          const namePart = parts[0] ? parts[0].replace("__verified__", "") : "";
          if (namePart.toLowerCase() === currentName.toLowerCase() && p.id !== playerUid) {
            throw new Error("Deze nickname is al in gebruik in deze lobby! Kies s.v.p. een andere naam.");
          }
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
      sfx.playJoinRoom();
      onJoined(targetSessionId, combinedNickname);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Er is een fout opgetreden bij het betreden van de lobby.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 py-10 flex flex-col items-center justify-center min-h-[75vh] relative z-10 w-full animate-fade-in">
      {/* Festive Falling Snow Effect */}
      <SnowEffect count={25} />

      {/* Christmas Event Pill Badge */}
      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-800/60 text-amber-300 font-bold text-xs uppercase tracking-wider mb-4 shadow-sm backdrop-blur-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> 🎄 Kerstmis Event 2026 ❄️
      </div>

      {/* Decorative Brand with Festive Logo */}
      <div className="relative mb-6 flex justify-center">
        <div className="absolute inset-0 bg-red-600/25 blur-3xl rounded-full scale-125 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="relative w-28 h-28 bg-gradient-to-tr from-red-600 via-rose-600 to-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-red-600/30 border-4 border-white/20 transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 text-5xl">
          🎅
        </div>
      </div>

      <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight text-center mb-6 text-white drop-shadow-sm flex items-center justify-center gap-2">
        Kahoti-Rep <span className="text-red-400">Kerst Play</span> 🎄
      </h1>

      <div className="w-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl shadow-red-950/20 border border-red-900/30 relative overflow-hidden">
        {/* Festive Christmas indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600" />

        {step === "code" ? (
          /* STEP 1: ENTER CODE */
          <form onSubmit={handleValidateCode} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white mb-2 tracking-tight">{t.enterCode}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                {lang === "nl" ? "Typ de 6-cijferige spelcode in om de lobby te betreden." : "Type the 6-digit game code to enter the lobby."}
              </p>
            </div>

            <div className="relative py-4">
              {/* Invisible input overlay that covers the entire visual keyboard target area */}
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val !== code) {
                    sfx.playSelectAnswer();
                  }
                  setCode(val);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 text-[16px]"
                disabled={isLoading}
                autoFocus
                aria-label={lang === "nl" ? "Voer de 6-cijferige pincode in" : "Enter 6-digit PIN"}
              />

              {/* Segmented Display Cards */}
              <div className="flex justify-between items-center gap-2 md:gap-3 relative z-10">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = code[index];
                  const isFilled = digit !== undefined;
                  const isActive = index === code.length && !isLoading;
                  
                  return (
                    <div
                      key={index}
                      className={`
                        w-12 h-16 md:w-14 md:h-20 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 relative overflow-hidden select-none
                        ${isFilled 
                          ? "border-purple-500 bg-purple-50/10 dark:bg-purple-950/20 text-purple-600 dark:text-purple-300 shadow-md shadow-purple-500/5 transform scale-100" 
                          : isActive 
                            ? "border-fuchsia-500 bg-white dark:bg-slate-900 ring-4 ring-fuchsia-500/10 dark:ring-fuchsia-500/25 scale-105 shadow-lg" 
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-300 dark:text-slate-500"
                        }
                      `}
                    >
                      {/* Animated Active Blinking Cursor */}
                      {isActive && (
                        <div className="absolute w-0.5 h-6 bg-fuchsia-500 animate-[pulse_1s_infinite] rounded-full" />
                      )}

                      {/* Digit display */}
                      <span className={`text-2xl md:text-3xl font-black font-display leading-none transition-all duration-200 ${
                        isFilled ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      }`}>
                        {digit}
                      </span>

                      {/* Dot placeholder for empty slots */}
                      {!isFilled && !isActive && (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 transition-all duration-300" />
                      )}

                      {/* Subtle elegant glass glare effect inside slots */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
                    </div>
                  );
                })}
              </div>

              {/* Indicator underneath and quick paste button */}
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500/70 tracking-widest uppercase pointer-events-none">
                  {lang === "nl" ? "Klik hierboven om te typen" : "Tap above to start typing"}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handlePasteCode}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer transition py-0.5 px-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  title="Plak code van klembord"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>{t.pasteCode || "Plak code"}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 hover:bg-red-100/70 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 rounded-2xl text-center text-sm transition font-semibold">
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="w-1/3 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-400 py-4 rounded-2xl font-bold transition cursor-pointer text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> {t.back}
              </button>
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-2/3 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 via-rose-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none uppercase tracking-widest text-xs"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  lang === "nl" ? "Volgende 🎄" : "Next 🎄"
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: CHOOSE NICKNAME & AVATAR */
          <form onSubmit={handleJoinLobby} className="space-y-4">
            {/* Header */}
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs rounded-full mb-2 uppercase tracking-widest border border-emerald-200/60 dark:border-emerald-800/60">
                ✓ {lang === "nl" ? "🎄 Kerstlobby gevonden! 🎅" : "🎄 Christmas Lobby Found! 🎅"}
              </span>
              <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                {t.chooseAvatar || "Kies je Karakter"} 🎭
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                {lang === "nl" ? "Kies een feestelijk kerstkarakter of stel je eigen stijl samen!" : "Pick a festive Christmas character or customize your own look!"}
              </p>
            </div>

            {/* Hero Card: Avatar Spotlight & Nickname */}
            <div className="p-4 rounded-3xl bg-linear-to-b from-purple-500/10 via-slate-50 to-white dark:from-purple-950/40 dark:via-slate-900/90 dark:to-slate-900 border-2 border-purple-200/80 dark:border-purple-900/60 shadow-sm flex flex-col gap-3 relative overflow-hidden">
              
              {/* Avatar Preview & Surprise Me button */}
              <div className="flex items-center gap-3 w-full">
                <motion.div
                  key={reactKey}
                  animate={{
                    scale: [1, 1.15, 0.95, 1],
                    rotate: [0, -4, 4, 0],
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative cursor-pointer group shrink-0"
                  onClick={randomizeAvatar}
                  title={lang === "nl" ? "Klik voor een verrassing!" : "Click for surprise!"}
                >
                  <img
                    src={
                      avatarMode === "dicebear"
                        ? getDiceBearAvatarUrl(dbStyle, dbSeed, dbBg)
                        : getAvatarUrl(nickname, baseIdx, hatIdx, accIdx, gradIdx, customHatX, customHatY, customHatSize, customAccX, customAccY, customAccSize)
                    }
                    alt="Avatar"
                    className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-white dark:border-slate-800 shadow-xl bg-slate-900 transition-transform duration-200 group-hover:scale-105 object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-purple-600 text-white rounded-full shadow-md border-2 border-white dark:border-slate-900">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </motion.div>

                {/* Quick Surprise CTA & Fun Tagline */}
                <div className="flex flex-col items-start gap-1.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={randomizeAvatar}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-md shadow-purple-600/20 active:scale-95 transition cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                    <span>{t.surpriseMe || "Verras Me! 🎲"}</span>
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 italic leading-tight select-none">
                    {avatarMode === "dicebear"
                      ? `${DICEBEAR_STYLES.find((s) => s.id === dbStyle)?.emoji || "✨"} ${DICEBEAR_STYLES.find((s) => s.id === dbStyle)?.name || "Karakter"}: ${DICEBEAR_STYLES.find((s) => s.id === dbStyle)?.description || "Klaar voor de overwinning!"}`
                      : (BASE_DESCRIPTIONS[AVATAR_BASES[baseIdx]?.id] || "Klaar voor de overwinning!")}
                  </p>
                </div>
              </div>

              {/* Nickname Input & Name Randomizer */}
              <div className="w-full space-y-1 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-0.5">
                  {t.nickname || "Je Spelersnaam"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={18}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.replace(/[:|~]/g, ""))}
                    placeholder={lang === "nl" ? "Bijv. KaasKoning" : "e.g. QuizKing"}
                    className="w-full text-base font-bold px-3 py-2 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-purple-500 dark:focus:border-purple-500 outline-none transition bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleRandomNickname}
                    className="px-3 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0 border border-purple-200 dark:border-purple-800"
                    title={lang === "nl" ? "Genereer een leuke naam" : "Generate fun name"}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{t.randomName || "Naam"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2 Clean Main Tabs: DiceBear Karakters vs Eigen Stijl */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setAvatarMode("dicebear"); sfx.playSelectAnswer(); triggerReaction(); }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  avatarMode === "dicebear"
                    ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>🐻</span>
                <span>{t.tabDiceBear || "DiceBear Karakters"}</span>
                <span className="text-[9px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded-full">
                  Populair ✨
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setAvatarMode("emoji"); sfx.playSelectAnswer(); triggerReaction(); }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  avatarMode === "emoji"
                    ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>🎨</span>
                <span>{t.tabEmoji || "Emoji Stijl"}</span>
              </button>
            </div>

            {/* TAB 1: DICEBEAR (Super intuitive, 1-Click characters & styles) */}
            {avatarMode === "dicebear" && (
              <div className="space-y-3 animate-fade-in max-h-[250px] overflow-y-auto p-1 scrollbar-thin">
                {/* 1. Style Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t.dicebearStyle || "1. Kies Karaktertype"}
                    </label>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/60">
                      {DICEBEAR_STYLES.length} stijlen
                    </span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {DICEBEAR_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleSelectDiceBearStyle(style.id)}
                        className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          dbStyle === style.id
                            ? "bg-purple-600 text-white shadow-xs scale-102"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300"
                        }`}
                        title={style.description}
                      >
                        <span className="text-sm">{style.emoji}</span>
                        <span>{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Quick Pick Gallery */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t.dicebearPickChar || "2. Kies je Karakter"}
                    </label>
                    <button
                      type="button"
                      onClick={shuffleStyleSeeds}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800/60"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{t.shuffleChars || "Nieuwe Figuren"}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 scrollbar-thin">
                    {customSeeds.map((item) => {
                      const isSelected = dbSeed === item.seed;
                      return (
                        <button
                          key={item.seed}
                          type="button"
                          onClick={() => {
                            setDbSeed(item.seed);
                            if (!nickname.trim() || nickname.startsWith("Speler") || nickname.startsWith("Player")) {
                              setNickname(item.name + Math.floor(Math.random() * 89 + 10));
                            }
                            sfx.playSelectAnswer();
                            triggerReaction();
                          }}
                          className={`p-1.5 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer relative select-none ${
                            isSelected
                              ? "bg-purple-100 dark:bg-purple-900/60 border-2 border-purple-600 shadow-sm ring-2 ring-purple-400/40 scale-105"
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 hover:scale-105"
                          }`}
                        >
                          <img
                            src={getDiceBearAvatarUrl(dbStyle, item.seed, dbBg)}
                            alt={item.name}
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 object-cover"
                            loading="lazy"
                          />
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full">
                            {item.name}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 p-0.5 bg-purple-600 text-white rounded-full">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Character Seed Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-0.5">
                    {t.dicebearSeed || "3. Karakter Zaadje / Eigen Tekst (Optioneel)"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={dbSeed}
                      maxLength={25}
                      onChange={(e) => {
                        setDbSeed(e.target.value.replace(/[:|~]/g, ""));
                        triggerReaction();
                      }}
                      placeholder="Typ een woord om te morpheren..."
                      className="w-full text-xs font-bold px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-purple-500 outline-none transition bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const words = ["Baas", "Held", "Turbo", "Flits", "Koning", "Brein", "Spook", "Ninja", "Dino", "Pixel", "Raket"];
                        const randWord = `${words[Math.floor(Math.random() * words.length)]}_${Math.floor(Math.random() * 900 + 100)}`;
                        setDbSeed(randWord);
                        sfx.playSelectAnswer();
                        triggerReaction();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0 border border-purple-200 dark:border-purple-800"
                      title="Genereer willekeurig zaadje"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>Rol</span>
                    </button>
                  </div>
                </div>

                {/* 4. Background Color Palette */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-0.5">
                    {t.dicebearBg || "4. Achtergrondkleur"}
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {DICEBEAR_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => {
                          setDbBg(bg.hex);
                          sfx.playSelectAnswer();
                          triggerReaction();
                        }}
                        className={`w-7 h-7 rounded-full shrink-0 transition-transform cursor-pointer shadow-xs relative flex items-center justify-center border border-white/40 dark:border-slate-700 ${bg.colorClass} ${
                          dbBg === bg.hex
                            ? "ring-3 ring-purple-500 scale-110 shadow-md"
                            : "hover:scale-105 opacity-90"
                        }`}
                        title={bg.name}
                      >
                        {dbBg === bg.hex && (
                          <Check className="w-3 h-3 text-slate-900 dark:text-white drop-shadow stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EMOJI SYSTEM */}
            {avatarMode === "emoji" && (
              <div className="space-y-3 animate-fade-in">
                {/* Sub-tabs for Emoji */}
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setAvatarTab("characters"); sfx.playSelectAnswer(); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      avatarTab === "characters"
                        ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    🎭 Kant-en-klaar ({AVATAR_PRESETS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAvatarTab("customize"); sfx.playSelectAnswer(); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      avatarTab === "customize"
                        ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    ⚙️ Zelf Samenstellen
                  </button>
                </div>

            {/* TAB 1: CHARACTERS (Categorized, 1-Click Cards) */}
            {avatarTab === "characters" && (
              <div className="space-y-2 animate-fade-in">
                {/* Category Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: "christmas", label: "Kerstmis 🎄" },
                    { id: "all", label: t.catAll || "Alles" },
                    { id: "animals", label: t.catAnimals || "Dieren 🐾" },
                    { id: "scifi", label: t.catSciFi || "Sci-Fi 🚀" },
                    { id: "food", label: t.catFood || "Eten & Fun 🍕" },
                    { id: "heroes", label: t.catHeroes || "Helden ⚡" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setActiveCategory(cat.id as any); sfx.playSelectAnswer(); }}
                      className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
                        activeCategory === cat.id
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Grid of Characters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto p-1 scrollbar-thin">
                  {AVATAR_PRESETS
                    .filter((p) => activeCategory === "all" || p.category === activeCategory)
                    .map((p) => {
                      const isSelected = activePresetId === p.id || (
                        baseIdx === p.baseIdx && hatIdx === p.hatIdx && accIdx === p.accIdx && gradIdx === p.gradIdx
                      );
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p)}
                          className={`p-2 rounded-2xl border flex items-center gap-2 text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-purple-50 dark:bg-purple-950/60 border-purple-500 shadow-sm ring-2 ring-purple-400/60 scale-[1.02]"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/20"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-200 dark:border-slate-700">
                            {p.emojiBadge}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-800 dark:text-white truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {p.suggestedName}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 p-0.5 bg-purple-600 text-white rounded-full">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOMIZE (Easy Color Theme + Hat + Accessory) */}
            {avatarTab === "customize" && (
              <div className="space-y-3 animate-fade-in max-h-[220px] overflow-y-auto p-1 scrollbar-thin">
                {/* 1. Theme Color */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-0.5">
                    {t.themeColor || "1. Kleur & Sfeer"}
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {AVATAR_GRADIENTS.map((g, idx) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setActivePresetId(null);
                          setGradIdx(idx);
                          sfx.playSelectAnswer();
                          triggerReaction();
                        }}
                        style={{ background: `linear-gradient(135deg, ${g.stops[0]}, ${g.stops[1]})` }}
                        className={`w-9 h-9 rounded-full shrink-0 transition-transform cursor-pointer shadow-xs relative flex items-center justify-center ${
                          gradIdx === idx
                            ? "ring-4 ring-purple-500 scale-110 shadow-md"
                            : "hover:scale-105 opacity-90 border border-white/40"
                        }`}
                        title={g.name}
                      >
                        {gradIdx === idx && (
                          <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Base Character with Category Filters and Rich Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t.tabBase || "2. Karakter Figuur"}
                    </label>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/60">
                      {AVATAR_BASES.length} {lang === "nl" ? "emojis" : "emojis"}
                    </span>
                  </div>

                  {/* Sub-category pills for base emojis */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { id: "all", label: lang === "nl" ? "Alles" : "All" },
                      { id: "animals", label: "🐾 Dieren" },
                      { id: "food", label: "🍔 Eten" },
                      { id: "gaming", label: "🎮 Gaming" },
                      { id: "magic", label: "✨ Magie" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCustomBaseCategory(cat.id as any);
                          sfx.playSelectAnswer();
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                          customBaseCategory === cat.id
                            ? "bg-purple-600 text-white shadow-xs scale-102"
                            : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Rich Emoji Grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 scrollbar-thin">
                    {AVATAR_BASES
                      .map((b, idx) => ({ ...b, originalIdx: idx }))
                      .filter((b) => customBaseCategory === "all" || b.category === customBaseCategory)
                      .map((b) => {
                        const isSelected = baseIdx === b.originalIdx;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setActivePresetId(null);
                              setBaseIdx(b.originalIdx);
                              sfx.playSelectAnswer();
                              triggerReaction();
                            }}
                            className={`h-10 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer select-none ${
                              isSelected
                                ? "bg-purple-100 dark:bg-purple-900/70 border-2 border-purple-600 scale-105 shadow-sm ring-2 ring-purple-400/40"
                                : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 hover:scale-105"
                            }`}
                            title={b.name}
                          >
                            <span>{b.emoji}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* 3. Hat / Headwear */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t.hatOptional || "3. Hoofddeksel (Optioneel)"}
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {AVATAR_HATS.length} {lang === "nl" ? "keuzes" : "options"}
                    </span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {AVATAR_HATS.map((h, idx) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setActivePresetId(null);
                          setHatIdx(idx);
                          setCustomHatX(0);
                          setCustomHatY(0);
                          setCustomHatSize(0);
                          sfx.playSelectAnswer();
                          triggerReaction();
                        }}
                        className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          hatIdx === idx
                            ? "bg-purple-100 dark:bg-purple-900/60 border-2 border-purple-600 text-purple-700 dark:text-purple-300 shadow-sm scale-102"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-300"
                        }`}
                        title={h.name}
                      >
                        <span className="text-sm">{h.emoji || "✖️"}</span>
                        <span>{idx === 0 ? (t.noneOption || "Geen") : h.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Accessory */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t.accOptional || "4. Bril & Extra's (Optioneel)"}
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {AVATAR_ACCESSORIES.length} {lang === "nl" ? "keuzes" : "options"}
                    </span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {AVATAR_ACCESSORIES.map((a, idx) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setActivePresetId(null);
                          setAccIdx(idx);
                          setCustomAccX(0);
                          setCustomAccY(0);
                          setCustomAccSize(0);
                          sfx.playSelectAnswer();
                          triggerReaction();
                        }}
                        className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          accIdx === idx
                            ? "bg-purple-100 dark:bg-purple-900/60 border-2 border-purple-600 text-purple-700 dark:text-purple-300 shadow-sm scale-102"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-300"
                        }`}
                        title={a.name}
                      >
                        <span className="text-sm">{a.emoji || "✖️"}</span>
                        <span>{idx === 0 ? (t.noneOption || "Geen") : a.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-2xl text-center text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("code")}
                className="w-1/3 flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-3.5 rounded-2xl font-bold transition cursor-pointer uppercase tracking-wider text-xs"
                disabled={isLoading}
              >
                {t.back}
              </button>
              <button
                type="submit"
                disabled={isLoading || !nickname.trim()}
                className="w-2/3 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 via-rose-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none uppercase tracking-widest text-xs border border-red-400/40"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-amber-300" /> {lang === "nl" ? "🎄 Spel Binnengaan 🎅" : "🎄 Enter Christmas Game 🎅"}
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
