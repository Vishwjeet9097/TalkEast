
import React, { useState, useEffect } from 'react';
import { UserProfile, Course, PracticeType, PracticeItem } from '../types';
import { db } from '../services/storage';
import { generatePracticeSession, explainGrammarMistake } from '../services/gemini';
import { useTTS } from '../hooks/useTTS';
import { 
    BrainCircuit, BookOpen, Ear, MessageSquare, ArrowLeft, 
    Play, CheckCircle2, XCircle, Loader2, Volume2, HelpCircle, 
    RefreshCcw, Sparkles 
} from 'lucide-react';

interface Props {
    profile: UserProfile | null;
}

export default function PracticeHub({ profile }: Props) {
    const [activeMode, setActiveMode] = useState<PracticeType | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    
    // Session State
    const [items, setItems] = useState<PracticeItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);

    const { speak, state: audioState, currentText: playingText } = useTTS();

    useEffect(() => {
        const load = async () => {
            const data = await db.getCourses();
            setCourses(data);
        };
        load();
    }, []);

    const startPractice = async (type: PracticeType) => {
        if (!profile) return;
        setActiveMode(type);
        setIsLoading(true);
        setItems([]);
        setCurrentIndex(0);
        setFeedback('idle');
        setUserInput('');
        setAiExplanation(null);

        try {
            // Context heuristic: Pick a random course title or topic
            const context = courses.length > 0 
                ? courses[Math.floor(Math.random() * courses.length)].title 
                : 'General Daily Conversation';

            const generatedItems = await generatePracticeSession(
                type, 
                profile.targetLanguage, 
                profile.nativeLanguage, 
                context
            );
            setItems(generatedItems);
        } catch (e) {
            console.error(e);
            alert("Failed to start practice session.");
            setActiveMode(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheck = () => {
        const currentItem = items[currentIndex];
        const isCorrect = normalize(userInput) === normalize(currentItem.correctAnswer);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        
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
                profile.nativeLanguage
            );
            setAiExplanation(explanation);
        } catch (e) {
            setAiExplanation("Could not fetch explanation.");
        } finally {
            setIsExplaining(false);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setFeedback('idle');
            setUserInput('');
            setAiExplanation(null);
        } else {
            // End of session
            alert("Great job! Session complete.");
            setActiveMode(null);
        }
    };

    const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

    if (activeMode) {
        // --- ACTIVE SESSION VIEW ---
        const currentItem = items[currentIndex];
        
        return (
            <div className="flex flex-col min-h-[80vh] pb-24">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setActiveMode(null)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{activeMode} Practice</span>
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
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Daily Review</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Review 10 words from your library.</p>
                    <button onClick={() => startPractice('vocab')} className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider hover:underline">Start Now</button>
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
