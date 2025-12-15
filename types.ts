
export enum Language {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  JAPANESE = 'Japanese',
  KOREAN = 'Korean',
  CHINESE = 'Chinese'
}

export interface UserProfile {
  nativeLanguage: Language;
  targetLanguage: Language;
  onboardingComplete: boolean;
  theme: 'light' | 'dark';
  apiKey?: string;
  useEnvKey?: boolean;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  translation: string;
}

export interface VocabWord {
  id: string;
  original: string; // Kanji/Hanzi/Hangul
  reading: string; // Furigana/Pinyin/Romaji
  meaning: string;
  partOfSpeech?: string; // n., v., adj., etc.
  exampleSentence?: string;
  audioUrl?: string;
  masteryLevel: number; // 0-5
}

export interface GrammarPoint {
  id: string;
  title: string;
  structure: string;
  explanation: string;
  examples: { sentence: string; translation: string }[];
}

export interface PronunciationPoint {
  title: string;
  rule: string;
  examples: string[];
}

export interface Chapter {
  id: string;
  title: string;
  courseId: string;
  order: number;
  // Content Sections
  shortDialogue?: DialogueLine[];
  longDialogue?: DialogueLine[];
  vocab: VocabWord[];
  grammar: GrammarPoint[];
  culturalTip?: string;
  pronunciationTips?: PronunciationPoint[];
  contentRaw?: string; 
}

export interface Course {
  id: string;
  title: string;
  type: 'Textbook' | 'Workbook' | 'GrammarReference';
  level: string; // N5, N4, Beginner, etc.
  chapters: Chapter[];
  isCustom: boolean; // Uploaded PDF
  targetLanguage?: Language; // Explicit language tag
  processingJobId?: string; // Links to the active background job
}

export interface Note {
  id: string;
  title: string;
  content: string; // HTML/Rich Text
  createdAt: number;
  tags: string[];
}

export interface FlashcardSet {
  id: string;
  name: string;
  cards: string[]; // IDs of VocabWords
}

export interface SearchResult {
  word: string;
  partOfSpeech: string;
  meaning: string; // Native Language Meaning
  englishMeaning?: string; // English Meaning (if native is different)
  examples: { sentence: string, translation: string }[];
  pinyinWithTones?: string;
}

// --- NEW JOB TYPES ---
export type JobStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'failed';

export interface ProcessingJob {
  id: string; // hash of file properties
  courseId: string; // Linked Course ID
  fileName: string;
  fileType: string;
  fileBlob: Blob; // Persist source for resume
  totalPages: number;
  processedBatches: number[]; // Array of completed batch indices
  totalBatches: number;
  status: JobStatus;
  progress: number;
  createdAt: number;
  updatedAt: number;
  courseMetadata: {
    title: string;
    type: string;
    level: string;
    targetLanguage: string;
  };
  errorMessage?: string;
}

export interface ProcessedBatch {
  jobId: string;
  batchIndex: number;
  chapters: Chapter[];
}

// --- PRACTICE TYPES ---
export type PracticeType = 'vocab' | 'grammar' | 'reading' | 'listening';

export interface PracticeItem {
  id: string;
  type: PracticeType;
  question: string; // The prompt (e.g., "Translate 'Apple'", "Fill in the blank")
  context?: string; // Additional context if needed
  correctAnswer: string;
  possibleAnswers?: string[]; // For multiple choice
  explanation?: string; // Why is it correct?
  audioText?: string; // Text to speak for listening
}
