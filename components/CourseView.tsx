
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { db } from '../services/storage';
import { generateMissingSection } from '../services/gemini';
import { Course, Chapter, VocabWord, DialogueLine, Language, UserProfile } from '../types';
import { BookOpen, Volume2, ArrowLeft, Play, RotateCcw, Check, X, Layers, MessageCircle, Mic, Globe, Loader2, PauseCircle, List, Sparkles, ChevronRight, Wand2, Trophy, Star } from 'lucide-react';
import { useTTS } from '../hooks/useTTS';

export default function CourseView({ profile }: { profile: UserProfile | null }) {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dialogue' | 'vocab' | 'grammar'>('dialogue');
  
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Flashcard Mode State
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studySessionCompleted, setStudySessionCompleted] = useState(false);
  const [flashcardCorrectCount, setFlashcardCorrectCount] = useState(0);
  const [flashcardScore, setFlashcardScore] = useState(0);
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  // Dialogue Playback State
  const [activeDialogueType, setActiveDialogueType] = useState<'short' | 'long'>('short');
  const [autoPlayIndex, setAutoPlayIndex] = useState<number | null>(null);

  const { speak, cancel, state: audioState, currentText: playingText } = useTTS();
  const dialogueTimeoutRef = useRef<any>(null);

  const getChapterMeta = (chapter: Chapter) => {
      return {
          hasDialogue: (chapter.shortDialogue && chapter.shortDialogue.length > 0) || (chapter.longDialogue && chapter.longDialogue.length > 0),
          vocabCount: chapter.vocab.length,
          grammarCount: chapter.grammar.length
      }
  };

  // Helper function to check if chapter has meaningful data
  const hasChapterData = (chapter: Chapter): boolean => {
      const meta = getChapterMeta(chapter);
      return meta.vocabCount > 0 || meta.hasDialogue || meta.grammarCount > 0;
  };

  useEffect(() => {
    const loadCourse = async () => {
        if (!courseId) return;
        const courses = await db.getCourses();
        const found = courses.find(c => c.id === courseId);
        if (found) {
            setCourse(found);
            
            const state = (location.state || {}) as { activeChapterId?: string, autoStartStudy?: boolean } | null;
            const initialChapterId = state?.activeChapterId || chapterId;

            if (initialChapterId) {
                // Only set active chapter if it has data
                const ch = found.chapters.find(c => c.id === initialChapterId);
                if (ch && hasChapterData(ch)) {
                    setActiveChapter(initialChapterId);
                    if (state?.autoStartStudy && ch.vocab.length > 0) {
                         setIsStudyMode(true);
                    }
                } else {
                    // If requested chapter has no data, find first chapter with data
                    const sortedChapters = [...found.chapters].sort((a, b) => a.order - b.order);
                    const firstValidChapter = sortedChapters.find(ch => hasChapterData(ch));
                    if (firstValidChapter) {
                        setActiveChapter(firstValidChapter.id);
                    }
                }
            } else {
                // Find first chapter with data
                const sortedChapters = [...found.chapters].sort((a, b) => a.order - b.order);
                const firstValidChapter = sortedChapters.find(ch => hasChapterData(ch));
                if (firstValidChapter) {
                    setActiveChapter(firstValidChapter.id);
                }
            }
        }
    };
    loadCourse();
    
    return () => {
        cancel();
        if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current);
    };
  }, [courseId, location.state, cancel]);

  // Filter chapters to only include those with data, then sort
  const sortedChapters = useMemo(() => {
      if (!course) return [];
      const allChapters = [...course.chapters].sort((a, b) => a.order - b.order);
      // Filter only chapters with data
      return allChapters.filter(ch => hasChapterData(ch));
  }, [course]);

  const currentChapter = useMemo(() => {
      return sortedChapters.find(c => c.id === activeChapter);
  }, [sortedChapters, activeChapter]);

  const currentVocabList = currentChapter?.vocab || [];

  const nextChapterId = useMemo(() => {
      if (!activeChapter) return null;
      const idx = sortedChapters.findIndex(c => c.id === activeChapter);
      if (idx >= 0 && idx < sortedChapters.length - 1) {
          return sortedChapters[idx + 1].id;
      }
      return null;
  }, [sortedChapters, activeChapter]);

  // Helper function to determine which tab has data (priority: dialogue > vocab > grammar)
  const getAvailableTab = (chapter: Chapter | null): 'dialogue' | 'vocab' | 'grammar' | null => {
      if (!chapter) return null;
      
      // Priority 1: Dialogue
      const hasDialogue = (chapter.shortDialogue && chapter.shortDialogue.length > 0) || 
                          (chapter.longDialogue && chapter.longDialogue.length > 0);
      if (hasDialogue) return 'dialogue';
      
      // Priority 2: Vocab
      if (chapter.vocab.length > 0) return 'vocab';
      
      // Priority 3: Grammar
      if (chapter.grammar.length > 0) return 'grammar';
      
      return null;
  };

  // Auto-set viewMode when chapter changes to first available tab with data
  useEffect(() => {
      if (currentChapter) {
          const availableTab = getAvailableTab(currentChapter);
          if (availableTab) {
              setViewMode(availableTab);
          }
      }
  }, [currentChapter?.id]); // Only run when chapter ID changes

  useEffect(() => {
      if (!chapterId || !course) return;
      const exists = course.chapters.find(c => c.id === chapterId);
      // Only set active chapter if it exists and has data
      if (exists && hasChapterData(exists) && exists.id !== activeChapter) {
          setActiveChapter(exists.id);
      } else if (exists && !hasChapterData(exists)) {
          // If chapter has no data, redirect to first valid chapter
          const firstValidChapter = sortedChapters[0];
          if (firstValidChapter) {
              navigate(`/course/${courseId}/chapter/${firstValidChapter.id}`, { replace: true });
          }
      }
  }, [chapterId, course?.id, activeChapter, sortedChapters, courseId, navigate]);

  // Track last access for recency
  useEffect(() => {
      if (!course || !activeChapter) return;
      const target = course.chapters.find(c => c.id === activeChapter);
      if (!target) return;
      // Avoid infinite loops: only write when value changes
      const now = Date.now();
      if (target.lastAccessed && now - target.lastAccessed < 500) return;
      const updated = { ...target, lastAccessed: now };
      const updatedChapters = course.chapters.map(ch => ch.id === updated.id ? updated : ch);
      const updatedCourse = { ...course, chapters: updatedChapters };
      setCourse(updatedCourse);
      db.saveCourse(updatedCourse);
  }, [activeChapter, course?.id]);

  if (!course) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  if (!chapterId) {
      return <Navigate to={`/course/${courseId}/index`} replace />;
  }

  // If current chapter doesn't exist or has no data, redirect to index or first valid chapter
  if (!currentChapter || !hasChapterData(currentChapter)) {
      if (sortedChapters.length > 0) {
          return <Navigate to={`/course/${courseId}/chapter/${sortedChapters[0].id}`} replace />;
      }
      return <Navigate to={`/course/${courseId}/index`} replace />;
  }

  const handleGenerateContent = async (type: 'dialogue' | 'grammar' | 'vocab') => {
      if (!course || !currentChapter || !profile) return;
      setIsGenerating(type);
      try {
          const result = await generateMissingSection(
              currentChapter, 
              type, 
              course.targetLanguage || 'English',
              profile.nativeLanguage || 'English',
              profile
          );
          
          const updatedChapter = { ...currentChapter };
          if (type === 'dialogue' && result.dialogue) {
              updatedChapter.shortDialogue = result.dialogue;
          } else if (type === 'grammar' && result.grammar) {
              updatedChapter.grammar = result.grammar.map((g: any) => ({
                  id: crypto.randomUUID(),
                  title: g.title,
                  structure: g.structure || g.title,
                  explanation: g.explanation,
                  examples: [{ sentence: g.example, translation: g.exampleTranslation || '' }]
              }));
          } else if (type === 'vocab' && result.vocab) {
              updatedChapter.vocab = result.vocab.map((v: any) => ({
                  id: crypto.randomUUID(),
                  original: v.word,
                  reading: v.romanization,
                  meaning: v.meaning,
                  partOfSpeech: v.partOfSpeech,
                  exampleSentence: v.exampleSentence,
                  masteryLevel: 0
              }));
          }

          const updatedChapters = course.chapters.map(c => c.id === updatedChapter.id ? updatedChapter : c);
          const updatedCourse = { ...course, chapters: updatedChapters };
          
          setCourse(updatedCourse);
          await db.saveCourse(updatedCourse);
          
          // Auto-switch to the tab that was just generated
          if (type === 'dialogue') {
              setViewMode('dialogue');
          } else if (type === 'vocab') {
              setViewMode('vocab');
          } else if (type === 'grammar') {
              setViewMode('grammar');
          } 

      } catch (e) {
          console.error("Generation failed", e);
          alert("Failed to generate content. Please try again.");
      } finally {
          setIsGenerating(null);
      }
  };

  const handleSpeak = (text: string) => {
      if (playingText === text && audioState === 'LOADING') return;
      speak(text, course.targetLanguage);
  };

  const playDialogueSequence = (lines: DialogueLine[]) => {
      cancel();
      setAutoPlayIndex(0); 
      
      const playLine = (index: number) => {
          if (index >= lines.length) {
              setAutoPlayIndex(null);
              return;
          }
          speak(lines[index].text, course.targetLanguage, () => {
             dialogueTimeoutRef.current = setTimeout(() => {
                 setAutoPlayIndex(index + 1);
                 playLine(index + 1);
             }, 600);
          });
      };
      playLine(0);
  };

  const stopPlayback = () => {
      cancel();
      setAutoPlayIndex(null);
      if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current);
  };

  // --- FLASHCARD LOGIC ---
  const startStudy = () => {
      stopPlayback();
      if (currentVocabList.length > 0) {
          setIsStudyMode(true);
          setCurrentCardIndex(0);
          setIsFlipped(false);
          setStudySessionCompleted(false);
          setFlashcardCorrectCount(0);
          setFlashcardScore(0);
          setIsProcessingCard(false);
      }
  };

  const nextCard = (known: boolean) => {
      // Prevent rapid clicks
      if (isProcessingCard) return;
      
      setIsProcessingCard(true);
      setIsFlipped(false);
      
      // Track correct answers (known = true means "Got it")
      if (known) {
          setFlashcardCorrectCount(prev => prev + 1);
          setFlashcardScore(prev => prev + 10); // 10 points per correct answer
      }
      
      setTimeout(() => {
          setCurrentCardIndex(prev => {
              if (prev < currentVocabList.length - 1) {
                  setIsProcessingCard(false);
                  return prev + 1;
              } else {
                  setStudySessionCompleted(true);
                  setIsProcessingCard(false);
                  return prev;
              }
          });
      }, 200);
  };

  const exitStudy = () => {
      stopPlayback();
      setIsStudyMode(false);
  };

  // --- RENDER: FLASHCARD MODE ---
  if (isStudyMode) {
      if (studySessionCompleted) {
          const accuracy = currentVocabList.length > 0 ? Math.round((flashcardCorrectCount / currentVocabList.length) * 100) : 0;
          
          // Handle edge case: all cards marked as "Again" (0% accuracy)
          const isPerfect = accuracy === 100;
          const isAllAgain = accuracy === 0;
          
          // Motivation messages based on performance
          const motivationMessages = isAllAgain 
              ? [
                  "Don't worry! Every mistake is a learning opportunity! 💪",
                  "Keep practicing! You're building your foundation! 🌱",
                  "Review helps! Try again and you'll remember better! 🔄",
                  "Learning takes time! You've got this! ⭐",
                  "Practice makes perfect! Let's try once more! 🎯"
              ]
              : isPerfect
              ? [
                  "Perfect score! You're a vocabulary master! 🏆",
                  "Flawless! Outstanding performance! 🌟",
                  "100%! You've mastered these words! 🎉",
                  "Incredible! Perfect recall! ⭐",
                  "Amazing! You know these words inside out! 🚀"
              ]
              : accuracy >= 80
              ? [
                  "Amazing work! You're building a strong foundation! 🎯",
                  "Outstanding! Every word you learn brings you closer to fluency! 🌟",
                  "Fantastic! Your dedication is paying off! Keep going! 💪",
                  "Excellent! You're mastering the language one word at a time! 🚀",
                  "Brilliant! Consistency is key, and you're nailing it! ⭐"
              ]
              : accuracy >= 50
              ? [
                  "Good progress! Keep practicing to improve! 📈",
                  "You're getting there! Review helps retention! 🔄",
                  "Nice work! Every word counts! 💪",
                  "Keep going! Practice makes perfect! ⭐",
                  "You're learning! That's what matters! 🌱"
              ]
              : [
                  "Keep practicing! You're making progress! 💪",
                  "Review helps! Try again to strengthen your memory! 🔄",
                  "Learning takes time! You've got this! ⭐",
                  "Every attempt makes you better! Keep going! 🌱",
                  "Don't give up! Practice makes perfect! 🎯"
              ];
          
          const motivation = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];
          
          // Achievement badges
          const achievements = [];
          if (isPerfect) {
              achievements.push({ icon: "🏆", text: "Perfect Score", color: "from-yellow-400 to-orange-500" });
          }
          if (accuracy >= 80 && !isPerfect) {
              achievements.push({ icon: "⭐", text: "Excellent", color: "from-purple-400 to-pink-500" });
          }
          if (currentVocabList.length >= 10) {
              achievements.push({ icon: "📚", text: "10+ Words", color: "from-blue-400 to-indigo-500" });
          }
          if (flashcardScore >= 50) {
              achievements.push({ icon: "💎", text: "High Score", color: "from-green-400 to-emerald-500" });
          }
          
          return (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300 relative border border-white/20 overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
                      
                      <div className="relative z-10 text-center">
                          {/* Trophy Icon - Different color based on performance */}
                          <div className={`w-24 h-24 bg-gradient-to-br ${isPerfect ? 'from-yellow-400 to-orange-500' : isAllAgain ? 'from-slate-400 to-slate-600' : 'from-indigo-400 to-purple-500'} rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ${isPerfect ? 'shadow-yellow-500/30' : isAllAgain ? 'shadow-slate-500/30' : 'shadow-indigo-500/30'} ${!isAllAgain ? 'animate-bounce' : ''}`}>
                              <Trophy size={48} className="text-white" />
                          </div>
                          
                          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Session Complete!</h2>
                          <p className="text-slate-500 dark:text-slate-400 mb-6">{motivation}</p>
                          
                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-4 mb-6">
                              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
                                  <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{flashcardCorrectCount}/{currentVocabList.length}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Correct</div>
                              </div>
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                                  <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{accuracy}%</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accuracy</div>
                              </div>
                              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                                  <div className="text-2xl font-extrabold text-green-600 dark:text-green-400">+{flashcardScore}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Points</div>
                              </div>
                          </div>
                          
                          {/* Achievements */}
                          {achievements.length > 0 && (
                              <div className="mb-6">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Achievements</p>
                                  <div className="flex flex-wrap justify-center gap-2">
                                      {achievements.map((achievement, idx) => (
                                          <div key={idx} className={`bg-gradient-to-br ${achievement.color} text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg`}>
                                              <span>{achievement.icon}</span>
                                              <span>{achievement.text}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                          
                          {/* Encouragement for 0% accuracy */}
                          {isAllAgain && (
                              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-4 mb-6 border border-orange-100 dark:border-orange-800">
                                  <div className="flex items-center justify-center gap-2 mb-2">
                                      <Star className="text-orange-500 fill-orange-500" size={20} />
                                      <span className="font-bold text-slate-800 dark:text-white">Keep Learning!</span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300">
                                      Review these words and try again. Every attempt strengthens your memory! 💪
                                  </p>
                              </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex gap-3">
                              <button 
                                  onClick={() => {
                                      setIsStudyMode(false);
                                      setStudySessionCompleted(false);
                                      setCurrentCardIndex(0);
                                      setIsFlipped(false);
                                      setFlashcardCorrectCount(0);
                                      setFlashcardScore(0);
                                      startStudy();
                                  }}
                                  className="flex-1 py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform"
                              >
                                  Retry
                              </button>
                              <button 
                                  onClick={exitStudy} 
                                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform"
                              >
                                  Continue Learning
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          );
      }
      
      // Safety check: ensure currentCard exists
      const currentCard = currentVocabList[currentCardIndex];
      if (!currentCard) {
          // If card doesn't exist, exit study mode
          return (
              <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                  <div className="text-center p-8">
                      <p className="text-slate-500 dark:text-slate-400 mb-4">Session ended</p>
                      <button 
                          onClick={exitStudy} 
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                      >
                          Back to Lesson
                      </button>
                  </div>
              </div>
          );
      }
      
      return (
          <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-900 overflow-y-auto overscroll-contain">
              {/* Scrollable Content Container */}
              <div className="">
                  <div className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex justify-between items-center sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 backdrop-blur-sm">
                      <button 
                          onClick={exitStudy} 
                          className="p-3 bg-white dark:bg-slate-800 shadow-sm rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                      >
                          <ArrowLeft size={20} className="text-slate-500" />
                      </button>
                      <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Studying</span>
                          <span className="font-bold text-slate-800 dark:text-white">{currentCardIndex + 1} / {currentVocabList.length}</span>
                      </div>
                      <div className="w-12"></div>
                  </div>
                  
                  <div className="w-full px-6 mt-2">
                     <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${((currentCardIndex + 1) / currentVocabList.length) * 100}%` }}></div>
                     </div>
                  </div>

                  <div className="flex items-center justify-center px-4 py-6 perspective-800">
                      <div className={`relative w-full max-w-sm min-h-[350px] transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                          {/* FRONT - Same structure as back but with front colors */}
                          <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 rounded-[2.5rem] flex flex-col items-center justify-between px-8 pt-10 pb-10 shadow-2xl border border-slate-100 dark:border-slate-700 min-h-[350px]">
                              {/* Badge at top - matching back structure */}
                              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full mb-6">Tap to Reveal</span>
                              
                              {/* Reading - matching back structure but hidden/invisible */}
                              <p className="text-xl text-slate-400 dark:text-slate-500 font-medium mb-2 text-center h-[28px]"></p>
                              
                              {/* Main word - matching back meaning position and size */}
                              <div className="flex-1 flex flex-col items-center justify-center w-full">
                                  <h2 className="text-4xl font-extrabold text-slate-800 dark:text-white text-center mb-4 leading-tight break-words px-2">{currentCard.original}</h2>
                                  
                                  {/* Example sentence placeholder - matching back structure exactly */}
                                  <div className="mb-4 min-h-[60px] flex items-center justify-center w-full">
                                      <p className="text-slate-300 dark:text-slate-600 text-sm italic"></p>
                                  </div>
                              </div>
                              
                              {/* Sound button in same position as back */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.original); }} 
                                className="p-4 bg-slate-50 dark:bg-slate-700 rounded-full text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform active:bg-indigo-100 shadow-md shrink-0"
                              >
                                 {playingText === currentCard.original && audioState === 'LOADING' ? <Loader2 size={24} className="animate-spin" /> : <Volume2 size={28} />}
                              </button>
                          </div>
                          {/* BACK */}
                          <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] flex flex-col items-center justify-between px-8 pt-10 pb-10 rotate-y-180 shadow-2xl text-white relative overflow-hidden min-h-[350px]">
                               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                               <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
                              
                              {/* Match exact structure and spacing as front */}
                              {currentCard.partOfSpeech ? (
                                  <span className="text-xs font-bold text-white/90 uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded-full mb-6">{currentCard.partOfSpeech}</span>
                              ) : (
                                  <span className="text-xs font-bold text-transparent uppercase tracking-widest px-3 py-1 rounded-full mb-6">Placeholder</span>
                              )}
                              
                              <div className="flex-1 flex flex-col items-center justify-center w-full">
                                  <p className="text-xl text-white/80 font-medium mb-2 text-center break-words px-2">{currentCard.reading}</p>
                                  <h3 className="text-4xl font-extrabold text-white text-center mb-4 leading-tight break-words px-2">{currentCard.meaning}</h3>
                                  
                                  {currentCard.exampleSentence ? (
                                      <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl w-full border border-white/10 mb-4">
                                          <p className="text-white/90 text-center italic text-sm leading-relaxed break-words">"{currentCard.exampleSentence}"</p>
                                      </div>
                                  ) : (
                                      <div className="mb-4 min-h-[60px] flex items-center justify-center">
                                          <p className="text-white/50 text-sm italic">No example sentence</p>
                                      </div>
                                  )}
                              </div>
                              
                              {/* Sound button in same position as front */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.original); }} 
                                className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 hover:scale-110 transition-transform active:bg-white/40 shadow-lg shrink-0"
                              >
                                 {playingText === currentCard.original && audioState === 'LOADING' ? <Loader2 size={24} className="animate-spin" /> : <Volume2 size={28} />}
                              </button>
                          </div>
                      </div>
                  </div>
                  
                  {/* Action Buttons - Positioned just below card */}
                  <div className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
                      <div className="max-w-sm mx-auto flex justify-between items-center gap-3">
                          <button 
                              onClick={(e) => { e.stopPropagation(); nextCard(false); }} 
                              disabled={isProcessingCard}
                              className="flex-1 rounded-xl bg-orange-500/80 dark:bg-orange-600/80 backdrop-blur-lg border border-orange-300/50 dark:border-orange-400/30 shadow-lg shadow-orange-500/40 dark:shadow-orange-600/50 px-6 py-3 flex flex-row items-center justify-center gap-2 active:scale-95 transition-all hover:bg-orange-500/90 dark:hover:bg-orange-600/90 hover:shadow-xl hover:shadow-orange-500/50 dark:hover:shadow-orange-600/60 hover:scale-[1.02] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
                              {isProcessingCard ? (
                                  <Loader2 size={18} className="text-white relative z-10 animate-spin" strokeWidth={2.5} />
                              ) : (
                                  <>
                                      <RotateCcw size={18} className="text-white relative z-10" strokeWidth={2.5} />
                                      <span className="text-sm font-bold text-white relative z-10">Again</span>
                                  </>
                              )}
                          </button>
                          <button 
                              onClick={(e) => { e.stopPropagation(); nextCard(true); }} 
                              disabled={isProcessingCard}
                              className="flex-1 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 px-6 py-3 flex flex-row items-center justify-center gap-2 active:scale-95 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                              {isProcessingCard ? (
                                  <Loader2 size={18} className="text-white animate-spin" strokeWidth={2.5} />
                              ) : (
                                  <>
                                      <Check size={18} className="text-white" strokeWidth={2.5} />
                                      <span className="text-sm font-bold text-white">Got it</span>
                                  </>
                              )}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-24 relative -mx-2 md:-mx-0">
      
      {/* TOC Modal */}
      {showTableOfContents && (
          <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex justify-end" onClick={() => setShowTableOfContents(false)}>
              <div className="w-80 h-full bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-8 pt-4">
                      <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Chapters</h3>
                      <button onClick={() => setShowTableOfContents(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="space-y-3 relative">
                      {/* Timeline Line */}
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-800"></div>
                      
                      {sortedChapters.map((ch, idx) => {
                          // Only render chapters with data (already filtered in sortedChapters)
                          return (
                              <button 
                                key={ch.id}
                                onClick={() => {
                                    stopPlayback();
                                    setActiveChapter(ch.id);
                                    setShowTableOfContents(false);
                                    navigate(`/course/${courseId}/chapter/${ch.id}`, { replace: true });
                                }}
                                className={`relative w-full text-left p-4 pl-12 rounded-2xl transition-all ${
                                    activeChapter === ch.id 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-4 border-white dark:border-slate-900 z-10 ${activeChapter === ch.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                      {idx + 1}
                                  </div>
                                  <span className={`text-sm font-bold ${activeChapter === ch.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                      {ch.title}
                                  </span>
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"><ArrowLeft size={20} /></button>
            <h2 className="text-lg font-bold truncate text-slate-800 dark:text-white max-w-[200px]">{course.title}</h2>
          </div>
          <div className="flex items-center gap-2">
              <button 
                 onClick={() => navigate(`/course/${courseId}/index`)}
                 className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors border border-slate-200 dark:border-slate-700"
              >
                 <BookOpen size={16} /> Index page
              </button>
              {nextChapterId && (
                  <button
                    onClick={() => {
                        stopPlayback();
                        setActiveChapter(nextChapterId);
                        navigate(`/course/${courseId}/chapter/${nextChapterId}`, { replace: true });
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Next chapter <ChevronRight size={14} />
                  </button>
              )}
              <button 
                onClick={() => setShowTableOfContents(true)}
                className="w-10 h-10 bg-white dark:bg-slate-800 shadow-sm rounded-full text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center justify-center transition-colors"
              >
                  <List size={20} />
              </button>
          </div>
      </div>

      {currentChapter && (
          <div className="glass-panel rounded-xl overflow-hidden min-h-[60vh] flex flex-col shadow-2xl border border-white/60 dark:border-slate-700 relative">
             {/* Content Header & Tabs */}
             <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="p-4 md:p-6 pb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Chapter {sortedChapters.findIndex(ch => ch.id === currentChapter.id) + 1}</p>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{currentChapter.title}</h1>
                </div>

                <div className="px-4 md:px-6 pb-4 overflow-x-auto no-scrollbar">
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-max">
                        {(() => {
                            const hasDialogue = (currentChapter.shortDialogue && currentChapter.shortDialogue.length > 0) || 
                                                (currentChapter.longDialogue && currentChapter.longDialogue.length > 0);
                            const hasVocab = currentChapter.vocab.length > 0;
                            const hasGrammar = currentChapter.grammar.length > 0;
                            
                            return (
                                <>
                                    <button 
                                        onClick={() => { stopPlayback(); setViewMode('dialogue'); }} 
                                        disabled={!hasDialogue}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                            viewMode === 'dialogue' 
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                                : hasDialogue 
                                                    ? 'text-slate-500 dark:text-slate-400 hover:text-slate-700' 
                                                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        <MessageCircle size={16} /> Dialogue
                                    </button>
                                    <button 
                                        onClick={() => { stopPlayback(); setViewMode('vocab'); }} 
                                        disabled={!hasVocab}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                            viewMode === 'vocab' 
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                                : hasVocab 
                                                    ? 'text-slate-500 dark:text-slate-400 hover:text-slate-700' 
                                                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        <Layers size={16} /> Words
                                    </button>
                                    <button 
                                        onClick={() => { stopPlayback(); setViewMode('grammar'); }} 
                                        disabled={!hasGrammar}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                            viewMode === 'grammar' 
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                                : hasGrammar 
                                                    ? 'text-slate-500 dark:text-slate-400 hover:text-slate-700' 
                                                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        <BookOpen size={16} /> Grammar
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                 </div>
             </div>

             <div className="p-4 md:p-6 flex-1 bg-white/30 dark:bg-slate-900/20">
                 {/* VIEW: DIALOGUE */}
                 {viewMode === 'dialogue' && (
                     <div className="space-y-6">
                         <div className="flex justify-center mb-6">
                             <div className="inline-flex rounded-full bg-white dark:bg-slate-800 p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                                 <button onClick={() => { stopPlayback(); setActiveDialogueType('short'); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeDialogueType === 'short' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Basic</button>
                                 <button onClick={() => { stopPlayback(); setActiveDialogueType('long'); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeDialogueType === 'long' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Extended</button>
                             </div>
                         </div>

                         {(() => {
                             const dialogue = activeDialogueType === 'short' ? currentChapter.shortDialogue : currentChapter.longDialogue;
                             
                             if (!dialogue || dialogue.length === 0) return (
                                 <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
                                     <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-300 mb-2">
                                        <MessageCircle size={36} />
                                     </div>
                                     <div>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">Conversation Missing</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">Create a realistic dialogue for this lesson instantly.</p>
                                     </div>
                                     <button 
                                        onClick={() => handleGenerateContent('dialogue')}
                                        disabled={isGenerating === 'dialogue'}
                                        className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-70"
                                     >
                                        {isGenerating === 'dialogue' ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                        Generate with AI
                                     </button>
                                 </div>
                             );

                             return (
                                 <div className="space-y-6 pb-24">
                                     {dialogue.map((line, idx) => {
                                         const isEven = idx % 2 === 0;
                                         return (
                                            <div key={idx} className={`flex gap-3 transition-opacity duration-300 ${autoPlayIndex !== null && autoPlayIndex !== idx ? 'opacity-40 blur-[1px]' : 'opacity-100'} ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm border-2 border-white dark:border-slate-800 ${isEven ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'}`}>
                                                    {line.speaker.substring(0, 1)}
                                                </div>
                                                <button 
                                                    className={`p-4 rounded-2xl shadow-sm text-left max-w-[85%] transition-transform active:scale-95 ${
                                                        isEven 
                                                        ? 'bg-white dark:bg-slate-800 rounded-tl-none border border-slate-100 dark:border-slate-700' 
                                                        : 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20'
                                                    }`}
                                                    onClick={() => handleSpeak(line.text)}
                                                >
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                             <p className={`text-base font-semibold leading-snug ${isEven ? 'text-slate-800 dark:text-white' : 'text-white'}`}>{line.text}</p>
                                                             {playingText === line.text && audioState === 'PLAYING' && <Volume2 size={16} className={`${isEven ? 'text-indigo-500' : 'text-white/80'} animate-pulse`} />}
                                                        </div>
                                                        <p className={`text-sm mt-1.5 font-normal ${isEven ? 'text-slate-400' : 'text-white/70'}`}>{line.translation}</p>
                                                    </div>
                                                </button>
                                            </div>
                                         )
                                     })}
                                     
                                     <button 
                                        onClick={() => autoPlayIndex !== null ? stopPlayback() : playDialogueSequence(dialogue)}
                                        className={`fixed bottom-[calc(2.7rem+env(safe-area-inset-bottom))] md:bottom-6 right-4 md:right-6 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl shadow-indigo-500/40 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center text-white ${autoPlayIndex !== null ? 'bg-slate-900' : 'bg-indigo-600'}`}
                                        aria-label={autoPlayIndex !== null ? 'Pause dialogue' : 'Play dialogue'}
                                     >
                                         {autoPlayIndex !== null ? <PauseCircle size={28} className="md:w-8 md:h-8" fill="currentColor" /> : <Play size={28} className="md:w-8 md:h-8 ml-0.5 md:ml-1" fill="currentColor" />}
                                     </button>
                                 </div>
                             )
                         })()}
                     </div>
                 )}

                 {/* VIEW: VOCABULARY */}
                 {viewMode === 'vocab' && (
                     <>
                        {currentVocabList.length === 0 ? (
                             <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
                                 <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-300 mb-2">
                                    <Layers size={36} />
                                 </div>
                                 <div>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">Vocabulary Missing</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">Generate a list of essential words for this chapter.</p>
                                 </div>
                                 <button 
                                    onClick={() => handleGenerateContent('vocab')}
                                    disabled={isGenerating === 'vocab'}
                                    className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-70"
                                 >
                                    {isGenerating === 'vocab' ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                    Generate Words
                                 </button>
                             </div>
                        ) : (
                            <>
                                <div className="flex justify-center mb-6">
                                    <button onClick={startStudy} className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform">
                                        <Play size={18} fill="currentColor" /> Start Flashcards
                                    </button>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 pb-10">
                                    {currentVocabList.map((word) => (
                                        <button key={word.id} className="group text-left relative p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-lg transition-all card-hover" onClick={(e) => handleSpeak(word.original)}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
                                                        {playingText === word.original && audioState === 'LOADING' ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{word.original}</h4>
                                                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{word.reading}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pl-14">
                                                <p className="text-base font-medium text-slate-700 dark:text-slate-300 leading-snug">{word.meaning}</p>
                                                {word.exampleSentence && <p className="text-xs text-slate-400 mt-2 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">"{word.exampleSentence}"</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                     </>
                 )}

                 {/* VIEW: GRAMMAR & CULTURE */}
                 {viewMode === 'grammar' && (
                     <div className="space-y-8 pb-10">
                         {currentChapter.culturalTip && (
                             <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-800/30 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 rounded-full blur-2xl"></div>
                                 <h4 className="text-amber-700 dark:text-amber-500 font-extrabold flex items-center gap-2 mb-3">
                                     <Globe size={20} /> Cultural Insight
                                 </h4>
                                 <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                     {currentChapter.culturalTip}
                                 </p>
                             </div>
                         )}
                         
                         {currentChapter.pronunciationTips && currentChapter.pronunciationTips.length > 0 && (
                             <div className="space-y-4">
                                 <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mic size={20} /> Pronunciation Clinic</h3>
                                 <div className="grid gap-3">
                                    {currentChapter.pronunciationTips.map((tip, i) => (
                                        <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <h5 className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm mb-1">{tip.title}</h5>
                                            <p className="text-sm text-slate-500 mb-3 leading-relaxed">{tip.rule}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {tip.examples.map((ex, j) => (
                                                    <span key={j} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-mono font-bold tracking-wide">{ex}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                             </div>
                         )}

                         <div className="space-y-6">
                             {currentChapter.grammar.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
                                     <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-300 mb-2">
                                        <BookOpen size={36} />
                                     </div>
                                     <div>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">Grammar Missing</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">Extract key grammar rules and examples for this section.</p>
                                     </div>
                                     <button 
                                        onClick={() => handleGenerateContent('grammar')}
                                        disabled={isGenerating === 'grammar'}
                                        className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-70"
                                     >
                                        {isGenerating === 'grammar' ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                        Analyze Grammar
                                     </button>
                                 </div>
                             ) : (
                                currentChapter.grammar.map((point) => (
                                    <div key={point.id} className="relative pl-6 pb-8 border-l-2 border-indigo-100 dark:border-slate-800 last:border-0 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 shadow-[0_0_0_4px_white] dark:shadow-[0_0_0_4px_#0f172a]"></div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{point.title}</h4>
                                        
                                        <div className="bg-indigo-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 mb-4 inline-block">
                                            <code className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-mono">{point.structure}</code>
                                        </div>
                                        
                                        <p className="text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed font-normal">{point.explanation}</p>
                                        
                                        <div className="space-y-3">
                                            {point.examples.map((ex, i) => (
                                                <button key={i} onClick={() => handleSpeak(ex.sentence)} className="w-full text-left bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-1 hover:border-indigo-200 dark:hover:border-slate-600 transition-colors group">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform"></span>
                                                        <p className="text-base font-semibold text-slate-800 dark:text-white">{ex.sentence}</p>
                                                        <div className="ml-auto text-slate-300 group-hover:text-indigo-500 transition-colors">
                                                            {playingText === ex.sentence && audioState === 'LOADING' ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-3.5 italic">{ex.translation}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                             )}
                         </div>
                     </div>
                 )}
             </div>
          </div>
      )}
    </div>
  );
}
