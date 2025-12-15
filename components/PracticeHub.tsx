
import React, { useState, useEffect } from 'react';
import { UserProfile, Course, PracticeType, PracticeItem, VocabWord, UserStats, PracticeHistory } from '../types';
import { db } from '../services/storage';
import { generatePracticeSession, explainGrammarMistake } from '../services/gemini';
import { useTTS } from '../hooks/useTTS';
import { 
    BrainCircuit, BookOpen, Ear, MessageSquare, ArrowLeft, 
    Play, CheckCircle2, XCircle, Loader2, Volume2, HelpCircle, 
    RefreshCcw, Sparkles, Trophy, X, ChevronRight, Wand2, Star
} from 'lucide-react';

interface Props {
    profile: UserProfile | null;
}

const MOTIVATION_MESSAGES = [
    "Amazing work! You're building a strong foundation! 🎯",
    "Outstanding! Every word you learn brings you closer to fluency! 🌟",
    "Fantastic! Your dedication is paying off! Keep going! 💪",
    "Excellent! You're mastering the language one word at a time! 🚀",
    "Brilliant! Consistency is key, and you're nailing it! ⭐",
    "Wonderful! Your progress is inspiring! Keep up the momentum! 🎉"
];

export default function PracticeHub({ profile }: Props) {
    const [activeMode, setActiveMode] = useState<PracticeType | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [showCourseSelection, setShowCourseSelection] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isDailyReview, setIsDailyReview] = useState(false);
    const [sessionCompleted, setSessionCompleted] = useState(false);
    const [sessionScore, setSessionScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState(0);
    
    // Session State
    const [items, setItems] = useState<PracticeItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [useLocalContent, setUseLocalContent] = useState(true); // Track if user wants to use local content

    const { speak, state: audioState, currentText: playingText } = useTTS();

    useEffect(() => {
        const load = async () => {
            const data = await db.getCourses();
            setCourses(data);
            const userStats = await db.getStats();
            setStats(userStats);
        };
        load();
    }, []);

    const hasCourseContent = (): boolean => {
        // Filter by target language and check for content
        return courses.some(c => {
            const languageMatch = !c.targetLanguage || c.targetLanguage === profile?.targetLanguage;
            const hasContent = c.chapters.some(ch => ch.vocab.length > 0);
            return languageMatch && hasContent;
        });
    };

    const collectWordsFromCourses = (): VocabWord[] => {
        const allWords: VocabWord[] = [];
        // Filter courses by target language
        const filteredCourses = courses.filter(c => 
            !c.targetLanguage || c.targetLanguage === profile?.targetLanguage
        );
        filteredCourses.forEach(course => {
            course.chapters.forEach(chapter => {
                allWords.push(...chapter.vocab);
            });
        });
        return allWords;
    };

    const startDailyReview = async () => {
        if (!profile) return;
        
        const allWords = collectWordsFromCourses();
        if (allWords.length === 0) {
            alert("No words found in your courses. Please add content first.");
            return;
        }

        // Shuffle and pick 10 words
        const shuffled = [...allWords].sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, Math.min(10, shuffled.length));

        // Convert to PracticeItems - filter out words without meanings
        const validWords = selectedWords.filter(w => w.meaning && w.meaning.trim());
        const practiceItems: PracticeItem[] = validWords.map((word, idx) => {
            const distractors = generateDistractors(word.meaning, allWords);
            return {
                id: `daily-${idx}`,
                type: 'vocab' as PracticeType,
                question: `What does "${word.original}" mean?`,
                correctAnswer: word.meaning,
                possibleAnswers: distractors.length >= 4 ? distractors : [...distractors, 'Not sure'], // Ensure 4 options
                audioText: word.original,
                explanation: word.exampleSentence || `"${word.original}" means "${word.meaning}"`
            };
        });

        setIsDailyReview(true);
        setActiveMode('vocab');
        setItems(practiceItems);
        setCurrentIndex(0);
        setFeedback('idle');
        setUserInput('');
        setCorrectCount(0);
        setSessionScore(0);
        setSessionCompleted(false);
        setSessionStartTime(Date.now());
    };

    const generateDistractors = (correct: string, allWords: VocabWord[]): string[] => {
        // Get unique wrong answers
        const uniqueMeanings = new Set<string>();
        allWords.forEach(w => {
            if (w.meaning && w.meaning.trim() && w.meaning !== correct) {
                uniqueMeanings.add(w.meaning);
            }
        });
        
        const wrongArray = Array.from(uniqueMeanings).sort(() => Math.random() - 0.5);
        
        // Ensure we have at least 3 wrong options, if not enough words, use generic options
        let wrong: string[] = [];
        if (wrongArray.length >= 3) {
            wrong = wrongArray.slice(0, 3);
        } else if (wrongArray.length > 0) {
            // If we have some but not enough, repeat to fill
            wrong = [...wrongArray];
            while (wrong.length < 3 && wrongArray.length > 0) {
                wrong.push(...wrongArray.slice(0, 3 - wrong.length));
            }
            wrong = wrong.slice(0, 3);
        } else {
            // Fallback generic options if no words available
            wrong = ['Option A', 'Option B', 'Option C'];
        }
        
        const options = [correct, ...wrong].sort(() => Math.random() - 0.5);
        return options.slice(0, 4); // Ensure exactly 4 options
    };

    const startPractice = async (type: PracticeType, fromCourse?: Course, forceAI: boolean = false) => {
        if (!profile) return;

        // Check if we should ask for course selection (only if local content exists and not forcing AI)
        if (hasCourseContent() && !fromCourse && !forceAI && useLocalContent) {
            setShowCourseSelection(true);
            setActiveMode(type);
            return;
        }

        setActiveMode(type);
        setIsLoading(true);
        setItems([]);
        setCurrentIndex(0);
        setFeedback('idle');
        setUserInput('');
        setAiExplanation(null);
        setCorrectCount(0);
        setSessionScore(0);
        setSessionCompleted(false);
        setIsDailyReview(false);
        setSessionStartTime(Date.now());

        try {
            let generatedItems: PracticeItem[] = [];

            // Priority 1: Use local content if course is provided and not forcing AI
            if (fromCourse && !forceAI) {
                if (type === 'vocab') {
                // Use course vocabulary
                const allWords: VocabWord[] = [];
                fromCourse.chapters.forEach(ch => {
                    allWords.push(...ch.vocab.filter(w => w.meaning && w.meaning.trim())); // Filter out empty meanings
                });
                
                if (allWords.length > 0) {
                    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
                    const selected = shuffled.slice(0, Math.min(10, shuffled.length));
                    generatedItems = selected.map((word, idx) => {
                        const distractors = generateDistractors(word.meaning, allWords);
                        return {
                            id: `course-${idx}`,
                            type: 'vocab' as PracticeType,
                            question: `What does "${word.original}" mean?`,
                            correctAnswer: word.meaning,
                            possibleAnswers: distractors.length >= 4 ? distractors : [...distractors, 'Not sure'], // Ensure 4 options
                            audioText: word.original,
                            explanation: word.exampleSentence || `"${word.original}" means "${word.meaning}"`
                        };
                    });
                }
                } else {
                    // For grammar, listening, reading - try to extract from course content
                    const allWords: VocabWord[] = [];
                    fromCourse.chapters.forEach(ch => {
                        allWords.push(...ch.vocab.filter(w => w.meaning && w.meaning.trim()));
                    });
                    
                    // If we have enough content, create practice items from it
                    if (allWords.length >= 5) {
                        const shuffled = [...allWords].sort(() => Math.random() - 0.5);
                        const selected = shuffled.slice(0, Math.min(10, shuffled.length));
                        
                        if (type === 'grammar') {
                            // Create grammar questions from course content
                            generatedItems = selected.map((word, idx) => ({
                                id: `course-grammar-${idx}`,
                                type: 'grammar' as PracticeType,
                                question: `Complete: "${word.exampleSentence?.replace(word.original, '___') || `Use "${word.original}" in a sentence`}"`,
                                correctAnswer: word.original,
                                possibleAnswers: [
                                    word.original,
                                    ...shuffled.filter(w => w.original !== word.original).slice(0, 3).map(w => w.original)
                                ].sort(() => Math.random() - 0.5).slice(0, 4),
                                audioText: word.exampleSentence || word.original,
                                explanation: word.exampleSentence || `"${word.original}" means "${word.meaning}"`
                            }));
                        } else if (type === 'listening' || type === 'reading') {
                            // Create listening/reading questions from course content
                            generatedItems = selected.map((word, idx) => ({
                                id: `course-${type}-${idx}`,
                                type: type,
                                question: type === 'listening' ? "Type what you hear" : `What does "${word.original}" mean?`,
                                correctAnswer: type === 'listening' ? word.original : word.meaning,
                                audioText: word.original,
                                explanation: word.exampleSentence || `"${word.original}" means "${word.meaning}"`
                            }));
                        }
                    }
                }
            }

            // Priority 2: Use AI only if no local content was generated OR if explicitly forced
            if (generatedItems.length === 0 || forceAI) {
                const context = fromCourse 
                    ? fromCourse.title 
                    : courses.length > 0 
                        ? courses[Math.floor(Math.random() * courses.length)].title 
                        : 'General Daily Conversation';

                generatedItems = await generatePracticeSession(
                    type, 
                    profile.targetLanguage, 
                    profile.nativeLanguage, 
                    context,
                    profile
                );
            }

            if (generatedItems.length === 0) {
                throw new Error("No practice items could be generated. Please ensure you have content or check your API key.");
            }

            setItems(generatedItems);
        } catch (e) {
            console.error(e);
            alert("Failed to start practice session. " + (e instanceof Error ? e.message : "Please try again."));
            setActiveMode(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheck = () => {
        const currentItem = items[currentIndex];
        const isCorrect = normalize(userInput) === normalize(currentItem.correctAnswer);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        
        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            setSessionScore(prev => prev + 10);
        }
        
        // Auto-play audio if correct for listening/reading
        if (isCorrect && currentItem.audioText) {
            speak(currentItem.audioText, profile?.targetLanguage);
        }
    };

    const handleMultipleChoice = (choice: string) => {
        if (feedback !== 'idle') return;
        setUserInput(choice);
        const currentItem = items[currentIndex];
        const isCorrect = choice === currentItem.correctAnswer;
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        
        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            setSessionScore(prev => prev + 10);
        }
        
        if (isCorrect && currentItem.audioText) {
             speak(currentItem.audioText, profile?.targetLanguage);
        }
    };

    const handleAskAI = async () => {
        if (!profile || !activeMode) return;
        setIsExplaining(true);
        try {
            const currentItem = items[currentIndex];
            const explanation = await explainGrammarMistake(
                currentItem.question,
                userInput,
                currentItem.correctAnswer,
                profile.targetLanguage,
                profile.nativeLanguage,
                profile
            );
            setAiExplanation(explanation);
        } catch (e) {
            setAiExplanation("Could not fetch explanation.");
        } finally {
            setIsExplaining(false);
        }
    };

    const nextQuestion = async () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setFeedback('idle');
            setUserInput('');
            setAiExplanation(null);
        } else {
            // End of session - save history and update stats
            const today = new Date().toISOString().split('T')[0];
            const accuracy = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0;
            const duration = sessionStartTime > 0 ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;
            
            // Save practice history
            const history: PracticeHistory = {
                id: crypto.randomUUID(),
                date: today,
                timestamp: Date.now(),
                type: isDailyReview ? 'daily-review' : activeMode || 'vocab',
                score: sessionScore,
                correctCount: correctCount,
                totalCount: items.length,
                accuracy: accuracy,
                duration: duration
            };
            await db.savePracticeHistory(history);
            
            // Update stats
            const updatedStats = stats ? { ...stats } : await db.getStats();
            const todayDate = new Date().toISOString().split('T')[0];
            
            // Update high score (only if higher than current)
            if (sessionScore > updatedStats.todayHighScore) {
                updatedStats.todayHighScore = sessionScore;
            }
            
            updatedStats.totalWordsReviewed += items.length;
            updatedStats.lastActivity = Date.now();
            
            if (isDailyReview) {
                updatedStats.dailyReviewCompleted = true;
                // Streak logic: increment if same day, reset if new day
                if (updatedStats.lastReviewDate === todayDate) {
                    // Same day - don't change streak
                } else {
                    // New day - check if yesterday was completed
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    
                    if (updatedStats.lastReviewDate === yesterdayStr) {
                        // Consecutive day - increment streak
                        updatedStats.streakDays = (updatedStats.streakDays || 0) + 1;
                    } else {
                        // Streak broken - reset to 1
                        updatedStats.streakDays = 1;
                    }
                }
                updatedStats.lastReviewDate = todayDate;
            }
            
            await db.saveStats(updatedStats);
            setStats(updatedStats);
            setSessionCompleted(true);
        }
    };

    const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

    const handleCloseSession = () => {
        setActiveMode(null);
        setSessionCompleted(false);
        setItems([]);
        setCurrentIndex(0);
        setCorrectCount(0);
        setSessionScore(0);
        setIsDailyReview(false);
        setSessionStartTime(0);
        setSelectedCourse(null);
    };

    // Congratulation Card
    if (sessionCompleted) {
        const accuracy = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0;
        const motivation = MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)];
        
        return (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300 relative border border-white/20 overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-500/30 animate-bounce">
                            <Trophy size={48} className="text-white" />
                        </div>
                        
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Session Complete!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">{motivation}</p>
                        
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
                                <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{correctCount}/{items.length}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Correct</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                                <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{accuracy}%</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accuracy</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                                <div className="text-2xl font-extrabold text-green-600 dark:text-green-400">+{sessionScore}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Points</div>
                            </div>
                        </div>
                        
                        {isDailyReview && (
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-4 mb-6 border border-indigo-100 dark:border-indigo-800">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Star className="text-yellow-500 fill-yellow-500" size={20} />
                                    <span className="font-bold text-slate-800 dark:text-white">Daily Review Complete!</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    {stats?.streakDays || 0} day streak 🔥
                                </p>
                            </div>
                        )}
                        
                        <div className="flex gap-3">
                            {isDailyReview && (
                                <button 
                                    onClick={() => {
                                        setSessionCompleted(false);
                                        setCurrentIndex(0);
                                        setCorrectCount(0);
                                        setSessionScore(0);
                                        setFeedback('idle');
                                        setUserInput('');
                                        setAiExplanation(null);
                                        // Reset items to restart
                                        const allWords = collectWordsFromCourses();
                                        if (allWords.length > 0) {
                                            const validWords = allWords.filter(w => w.meaning && w.meaning.trim());
                                            const shuffled = [...validWords].sort(() => Math.random() - 0.5);
                                            const selectedWords = shuffled.slice(0, Math.min(10, shuffled.length));
                                            const practiceItems: PracticeItem[] = selectedWords.map((word, idx) => {
                                                const distractors = generateDistractors(word.meaning, allWords);
                                                return {
                                                    id: `daily-retry-${idx}`,
                                                    type: 'vocab' as PracticeType,
                                                    question: `What does "${word.original}" mean?`,
                                                    correctAnswer: word.meaning,
                                                    possibleAnswers: distractors.length >= 4 ? distractors : [...distractors, 'Not sure'],
                                                    audioText: word.original,
                                                    explanation: word.exampleSentence || `"${word.original}" means "${word.meaning}"`
                                                };
                                            });
                                            setItems(practiceItems);
                                            setSessionStartTime(Date.now());
                                        }
                                    }}
                                    className="flex-1 py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform"
                                >
                                    Reattempt
                                </button>
                            )}
                            <button 
                                onClick={handleCloseSession}
                                className={`${isDailyReview ? 'flex-1' : 'w-full'} py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform`}
                            >
                                Continue Learning
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Course Selection Modal
    if (showCourseSelection && activeMode) {
        // Filter by target language and content
        const coursesWithContent = courses.filter(c => {
            // Match target language
            const languageMatch = !c.targetLanguage || c.targetLanguage === profile?.targetLanguage;
            // Has vocabulary content
            const hasContent = c.chapters.some(ch => ch.vocab.length > 0);
            return languageMatch && hasContent;
        });

        return (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300 relative border border-white/20">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Choose Practice Source</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Practice from your courses or generate with AI</p>
                        </div>
                        <button 
                            onClick={() => {
                                setShowCourseSelection(false);
                                setActiveMode(null);
                            }}
                            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                        {coursesWithContent.length > 0 ? (
                            coursesWithContent.map(course => (
                                <button
                                    key={course.id}
                                    onClick={() => {
                                        setSelectedCourse(course);
                                        setShowCourseSelection(false);
                                        setUseLocalContent(true); // User chose local content
                                        startPractice(activeMode, course, false); // Use local content, don't force AI
                                    }}
                                    className="w-full text-left p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{course.title}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {course.chapters.reduce((sum, ch) => sum + ch.vocab.length, 0)} words available
                                            </p>
                                        </div>
                                        <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                                <p className="text-sm">No courses available for {profile?.targetLanguage}</p>
                                <p className="text-xs mt-1">Upload content or generate with AI</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            setShowCourseSelection(false);
                            setUseLocalContent(false); // User explicitly chose AI
                            startPractice(activeMode, undefined, true); // Force AI generation
                        }}
                        className="w-full p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center justify-center gap-2"
                    >
                        <Wand2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Generate with AI</span>
                    </button>
                </div>
            </div>
        );
    }

    if (activeMode) {
        // --- ACTIVE SESSION VIEW ---
        const currentItem = items[currentIndex];
        
        return (
            <div className="flex flex-col min-h-[80vh] pb-24">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={handleCloseSession} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                {isDailyReview ? 'Daily Review' : activeMode} Practice
                            </span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{currentIndex + 1} / {items.length}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-500 transition-all duration-300" 
                                style={{ width: items.length ? `${((currentIndex + 1) / items.length) * 100}%` : '0%' }}
                            ></div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center flex-1">
                        <Loader2 size={40} className="text-indigo-600 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Generating smart questions...</p>
                    </div>
                ) : currentItem ? (
                    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
                        
                        {/* Question Card */}
                        <div className="glass-panel p-8 rounded-[2rem] shadow-xl mb-6 relative overflow-hidden flex flex-col items-center justify-center text-center min-h-[200px]">
                            
                            {/* Listening Mode Icon */}
                            {activeMode === 'listening' && (
                                <button 
                                    onClick={() => speak(currentItem.audioText || '', profile?.targetLanguage)}
                                    className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 hover:scale-105 transition-transform"
                                >
                                    {playingText === currentItem.audioText && audioState === 'PLAYING' ? <Volume2 size={40} className="animate-pulse" /> : <Play size={40} className="ml-1" />}
                                </button>
                            )}

                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 leading-snug">
                                {activeMode === 'listening' ? "Type what you hear" : currentItem.question}
                            </h3>
                            
                            {/* Audio Prompt Button (if avail) */}
                            {(activeMode === 'vocab' || activeMode === 'reading') && currentItem.audioText && (
                                <button 
                                    onClick={() => speak(currentItem.audioText || '', profile?.targetLanguage)}
                                    className="mt-2 flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full transition-colors"
                                >
                                    <Volume2 size={14} /> Listen
                                </button>
                            )}
                        </div>

                        {/* Interaction Area */}
                        <div className="space-y-4">
                            
                            {/* Multiple Choice */}
                            {currentItem.possibleAnswers ? (
                                <div className="grid gap-3">
                                    {currentItem.possibleAnswers.map((ans, idx) => {
                                        let btnClass = "p-4 rounded-xl border-2 text-left font-bold transition-all ";
                                        if (feedback === 'idle') {
                                            btnClass += "bg-white dark:bg-slate-800 border-transparent hover:border-indigo-200 dark:hover:border-slate-600";
                                        } else if (ans === currentItem.correctAnswer) {
                                            btnClass += "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-500/50 dark:text-green-400";
                                        } else if (ans === userInput && feedback === 'incorrect') {
                                            btnClass += "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-400";
                                        } else {
                                            btnClass += "bg-white dark:bg-slate-800 border-transparent opacity-50";
                                        }

                                        return (
                                            <button 
                                                key={idx}
                                                onClick={() => handleMultipleChoice(ans)}
                                                className={btnClass}
                                                disabled={feedback !== 'idle'}
                                            >
                                                {ans}
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                /* Text Input */
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        placeholder="Type your answer here..."
                                        className="w-full p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-lg font-medium shadow-sm transition-all"
                                        disabled={feedback !== 'idle'}
                                        onKeyDown={(e) => e.key === 'Enter' && feedback === 'idle' && handleCheck()}
                                    />
                                    <button 
                                        onClick={handleCheck}
                                        disabled={!userInput || feedback !== 'idle'}
                                        className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white px-4 rounded-xl font-bold disabled:opacity-0 disabled:pointer-events-none transition-all hover:bg-indigo-700"
                                    >
                                        Check
                                    </button>
                                </div>
                            )}

                            {/* Feedback Section */}
                            {feedback !== 'idle' && (
                                <div className={`p-4 rounded-2xl animate-in slide-in-from-bottom-2 ${feedback === 'correct' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 ${feedback === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                                            {feedback === 'correct' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold text-lg ${feedback === 'correct' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                {feedback === 'correct' ? 'Correct!' : 'Incorrect'}
                                            </p>
                                            
                                            {feedback === 'incorrect' && (
                                                <div className="mt-2">
                                                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-1">Correct Answer:</p>
                                                    <p className="font-bold text-slate-800 dark:text-white">{currentItem.correctAnswer}</p>
                                                    
                                                    {/* AI Explain Button */}
                                                    {!aiExplanation ? (
                                                        <button 
                                                            onClick={handleAskAI}
                                                            disabled={isExplaining}
                                                            className="mt-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline"
                                                        >
                                                            {isExplaining ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                            Explain with AI
                                                        </button>
                                                    ) : (
                                                        <div className="mt-3 bg-white/50 dark:bg-black/20 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-200">
                                                            <div className="flex items-center gap-2 mb-1 text-indigo-500 font-bold text-xs uppercase tracking-wide">
                                                                <BrainCircuit size={12} /> AI Explanation
                                                            </div>
                                                            {aiExplanation}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={nextQuestion}
                                        className={`w-full mt-4 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 ${feedback === 'correct' ? 'bg-green-600' : 'bg-red-500'}`}
                                    >
                                        Next Question
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    // --- HUB VIEW ---
    return (
        <div className="space-y-8 pb-24">
            <div className="px-1">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Practice Arena</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Master your skills with AI-powered exercises.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <PracticeCard 
                    title="Vocabulary" 
                    subtitle="Flashcards & Quiz" 
                    icon={BrainCircuit} 
                    color="bg-purple-500" 
                    delay={0}
                    onClick={() => startPractice('vocab')} 
                />
                <PracticeCard 
                    title="Grammar" 
                    subtitle="Sentence Building" 
                    icon={BookOpen} 
                    color="bg-blue-500" 
                    delay={100}
                    onClick={() => startPractice('grammar')} 
                />
                <PracticeCard 
                    title="Listening" 
                    subtitle="Dictation Mode" 
                    icon={Ear} 
                    color="bg-pink-500" 
                    delay={200}
                    onClick={() => startPractice('listening')} 
                />
                <PracticeCard 
                    title="Reading" 
                    subtitle="Comprehension" 
                    icon={MessageSquare} 
                    color="bg-orange-500" 
                    delay={300}
                    onClick={() => startPractice('reading')} 
                />
            </div>

            {/* Daily Challenge Banner */}
            <div className="glass-panel p-6 rounded-[2rem] flex items-center gap-5 relative overflow-hidden group border border-indigo-100 dark:border-indigo-900/50">
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                    <RefreshCcw size={28} className="group-hover:rotate-180 transition-transform duration-700" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Daily Review</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Review 10 words from your library.</p>
                    {stats?.dailyReviewCompleted ? (
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span className="text-xs font-bold text-green-600 dark:text-green-400">Completed today</span>
                        </div>
                    ) : (
                        <button 
                            onClick={startDailyReview} 
                            className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider hover:underline"
                        >
                            Start Now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const PracticeCard = ({ title, subtitle, icon: Icon, color, onClick, delay }: any) => (
    <button 
        onClick={onClick}
        className="glass-panel p-5 rounded-[2rem] text-left relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-xl border border-white/50 dark:border-slate-700 h-44 flex flex-col justify-between"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg mb-4`}>
            <Icon size={24} />
        </div>
        <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-1">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-current opacity-5 rounded-full blur-xl group-hover:scale-150 transition-transform text-slate-900 dark:text-white"></div>
    </button>
);
