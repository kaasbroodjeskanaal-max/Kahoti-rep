export interface Question {
  id: string;
  questionText: string;
  imageUrl?: string;
  timeLimit: number; // in seconds, e.g., 20
  points: number;     // e.g., 1000
  options: string[];  // 4 answer choices
  correctOptionIndex: number; // 0 to 3
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  creatorId: string;
  createdAt: any; // Firestore timestamp or standard Date ISO string
  questions: Question[];
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
