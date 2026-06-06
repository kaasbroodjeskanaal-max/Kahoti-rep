export interface Question {
  id: string;
  questionText: string;
  imageUrl?: string;
  timeLimit: number; // in seconds, e.g., 20
  points: number;     // e.g., 1000
  options: string[];  // 2 to 6 answer choices
  correctOptionIndex: number; // 0 to 5
  correctOptionIndices?: number[]; // indices of correct answers
  questionType?: "multiple_choice" | "true_false" | "wheel_spin";
  theme?: "default" | "summer" | "winter" | "halloween" | "space" | "neon";
  lobbyTheme?: "default" | "summer" | "winter" | "halloween" | "space" | "neon";
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  creatorId: string;
  createdAt: any; // Firestore timestamp or standard Date ISO string
  questions: Question[];
  theme?: "default" | "summer" | "winter" | "halloween" | "space" | "neon";
  lobbyTheme?: "default" | "summer" | "winter" | "halloween" | "space" | "neon";
}

export interface GameSession {
  id: string;
  hostId: string;
  code: string; // 6-digit numeric code
  status: 'lobby' | 'countdown' | 'question' | 'show_answer' | 'leaderboard' | 'ended';
  quizId: string;
  quizTitle: string;
  currentQuestionIndex: number;
  questionStartTime: any; // Firestore Timestamp
  questionDuration: number;
  totalQuestions: number;
}

export interface Player {
  id: string;
  nickname: string;
  score: number;
  streak: number;
  currentAnswerIndex: number | null; // index of chosen answer, or null if not answered yet
  currentAnswerTime: number | null;  // reaction duration or timestamp of answer, null if no answer
  isHost: boolean;
  joinedAt: any; // Firestore Timestamp
}

export const checkIsCorrect = (playerAnswerIndex: number | null, question: Question): boolean => {
  if (playerAnswerIndex === null) return false;
  const correctIndices = question.correctOptionIndices || [question.correctOptionIndex ?? 0];
  if (correctIndices.length > 1) {
    // Multi-select comparison via bitmask
    let correctBitmask = 0;
    correctIndices.forEach((idx) => {
      correctBitmask |= (1 << idx);
    });
    return playerAnswerIndex === correctBitmask;
  } else {
    // Single-select comparison
    const singleCorrect = correctIndices[0] ?? question.correctOptionIndex ?? 0;
    return playerAnswerIndex === singleCorrect;
  }
};

export interface ThemeConfig {
  bgClasses: string;
  cardBg: string;
  textColor: string;
  accentColor: string;
  emoji: string;
  name: string;
}

export const getThemeConfig = (theme?: string): ThemeConfig => {
  switch (theme) {
    case "summer":
      return {
        bgClasses: "bg-amber-100 dark:bg-amber-950 bg-gradient-to-br from-amber-200 via-orange-300 to-yellow-200 text-slate-900 transition-all duration-700 relative overflow-hidden",
        cardBg: "bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-amber-300/40 shadow-xl",
        textColor: "text-amber-950 dark:text-amber-100",
        accentColor: "bg-orange-500 border-orange-650",
        emoji: "☀️",
        name: "Zomer",
      };
    case "winter":
      return {
        bgClasses: "bg-sky-50 dark:bg-slate-950 bg-gradient-to-br from-sky-100 via-indigo-100 to-sky-100 text-slate-900 dark:text-slate-100 transition-all duration-700 relative overflow-hidden",
        cardBg: "bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-sky-300/30 shadow-xl",
        textColor: "text-sky-950 dark:text-sky-100",
        accentColor: "bg-cyan-500 border-cyan-650",
        emoji: "❄️",
        name: "Winter",
      };
    case "halloween":
      return {
        bgClasses: "bg-purple-950 bg-gradient-to-br from-purple-950 via-slate-950 to-orange-950 text-orange-200 transition-all duration-700 relative overflow-hidden",
        cardBg: "bg-slate-900/90 border border-purple-900/50 shadow-2xl",
        textColor: "text-orange-100 dark:text-orange-50",
        accentColor: "bg-orange-600 border-orange-750",
        emoji: "🎃",
        name: "Halloween",
      };
    case "space":
      return {
        bgClasses: "bg-slate-950 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-indigo-150 transition-all duration-700 relative overflow-hidden",
        cardBg: "bg-slate-900/80 border border-indigo-900/40 shadow-2xl backdrop-blur-xs",
        textColor: "text-indigo-50 dark:text-indigo-100",
        accentColor: "bg-indigo-650 border-indigo-800",
        emoji: "🪐",
        name: "Kosmisch",
      };
    case "neon":
      return {
        bgClasses: "bg-slate-950 bg-radial-at-t from-fuchsia-950 via-slate-950 to-slate-950 text-fuchsia-300 transition-all duration-700 relative overflow-hidden",
        cardBg: "bg-slate-900/90 border border-fuchsia-900/50 shadow-2xl",
        textColor: "text-fuchsia-100",
        accentColor: "bg-fuchsia-600 border-fuchsia-750",
        emoji: "⚡",
        name: "Neon Retro",
      };
    case "default":
    default:
      return {
        bgClasses: "bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-all duration-500",
        cardBg: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm",
        textColor: "text-slate-800 dark:text-slate-100",
        accentColor: "bg-indigo-600 border-indigo-750",
        emoji: "🎉",
        name: "Standaard",
      };
  }
};
