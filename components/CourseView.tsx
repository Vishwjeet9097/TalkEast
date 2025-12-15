
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../services/storage';
import { generateMissingSection } from '../services/gemini';
import { Course, Chapter, VocabWord, DialogueLine, Language, UserProfile } from '../types';
import { BookOpen, Volume2, ArrowLeft, Play, RotateCcw, Check, X, Layers, MessageCircle, Mic, Globe, Loader2, PauseCircle, List, Sparkles, ChevronRight, Wand2 } from 'lucide-react';
import { useTTS } from '../hooks/useTTS';

export default function CourseView({ profile }: { profile: UserProfile | null }) {
  const { courseId } = useParams();
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

  // Dialogue Playback State
  const [activeDialogueType, setActiveDialogueType] = useState<'short' | 'long'>('short');
  const [autoPlayIndex, setAutoPlayIndex] = useState<number | null>(null);

  const { speak, cancel, state: audioState, currentText: playingText } = useTTS();
  const dialogueTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const loadCourse = async () => {
        if (!courseId) return;
        const courses = await db.getCourses();
        const found = courses.find(c => c.id === courseId);
        if (found) {
            setCourse(found);
            
            const state = location.state as { activeChapterId?: string, autoStartStudy?: boolean };
            
            if (state?.activeChapterId) {
                setActiveChapter(state.activeChapterId);
                if (state.autoStartStudy) {
                     const ch = found.chapters.find(c => c.id === state.activeChapterId);
                     if (ch && ch.vocab.length > 0) {
                         setIsStudyMode(true);
                     }
                }
            } else if(found.chapters.length > 0) {
                const sortedChapters = [...found.chapters].sort((a, b) => a.order - b.order);
                setActiveChapter(sortedChapters[0].id);
            }
        }
    };
    loadCourse();
    
    return () => {
        cancel();
        if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current);
    };
  }, [courseId, location.state, cancel]);

  if (!course) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  const currentChapter = course.chapters.find(c => c.id === activeChapter);
  const currentVocabList = currentChapter?.vocab || [];
  const sortedChapters = [...course.chapters].sort((a, b) => a.order - b.order);

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
      }
  };

  const nextCard = (known: boolean) => {
      setIsFlipped(false);
      setTimeout(() => {
          if (currentCardIndex < currentVocabList.length - 1) {
              setCurrentCardIndex(prev => prev + 1);
          } else {
              setStudySessionCompleted(true);
          }
      }, 200);
  };

  const exitStudy = () => {
      stopPlayback();
      setIsStudyMode(false);
  };

  // --- RENDER: FLASHCARD MODE ---
  if (isStudyMode) {
      if (studySessionCompleted) {
          return (
              <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300">
                  <div className="w-28 h-28 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-500 mb-6 shadow-xl shadow-green-500/10">
                      <Check size={56} strokeWidth={4} />
                  </div>
                  <h2 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-2 tracking-tight">Session Complete!</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-10">You reviewed {currentVocabList.length} words.</p>
                  <button onClick={exitStudy} className="w-full max-w-xs py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform">Back to Lesson</button>
              </div>
          );
      }
      const currentCard = currentVocabList[currentCardIndex];
      return (
          <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-900 pb-[env(safe-area-inset-bottom)]">
              <div className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex justify-between items-center">
                  <button onClick={exitStudy} className="p-3 bg-white dark:bg-slate-800 shadow-sm rounded-full"><X size={24} className="text-slate-500" /></button>
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

              <div className="flex-1 flex items-center justify-center p-6 perspective-1000">
                  <div className={`relative w-full max-w-sm aspect-[3/4] transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                      {/* FRONT */}
                      <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center p-8 shadow-2xl border border-slate-100 dark:border-slate-700">
                          <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full mb-10">Tap to Reveal</span>
                          <h2 className="text-5xl font-extrabold text-slate-800 dark:text-white text-center mb-6 leading-tight">{currentCard.original}</h2>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.original); }} 
                            className="p-4 bg-slate-50 dark:bg-slate-700 rounded-full text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform active:bg-indigo-100"
                          >
                             {playingText === currentCard.original && audioState === 'LOADING' ? <Loader2 size={24} className="animate-spin" /> : <Volume2 size={28} />}
                          </button>
                      </div>
                      {/* BACK */}
                      <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] flex flex-col items-center justify-center p-8 rotate-y-180 shadow-2xl text-white relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                           <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

                          <button onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.original); }} className="absolute top-6 right-6 p-3 bg-white/20 rounded-full hover:bg-white/30 backdrop-blur-md">
                              <Volume2 size={20} className="text-white" />
                          </button>
                          
                          {currentCard.partOfSpeech && (
                              <span className="mb-4 px-3 py-1 bg-white/20 backdrop-blur-md text-white/90 text-xs font-bold rounded-lg uppercase tracking-wider">
                                  {currentCard.partOfSpeech}
                              </span>
                          )}
                          
                          <p className="text-2xl text-white/80 font-medium mb-3">{currentCard.reading}</p>
                          <h3 className="text-4xl font-extrabold text-white text-center mb-8">{currentCard.meaning}</h3>
                          
                          {currentCard.exampleSentence && (
                              <div className="bg-black/20 backdrop-blur-md p-5 rounded-2xl w-full border border-white/10">
                                  <p className="text-white/90 text-center italic text-lg">"{currentCard.exampleSentence}"</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
              
              <div className="p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex justify-between items-center gap-6 max-w-md mx-auto w-full">
                  <button onClick={(e) => { e.stopPropagation(); nextCard(false); }} className="h-16 flex-1 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-red-100 dark:border-red-900/30"><RotateCcw size={20} /><span className="text-[10px] uppercase tracking-wide">Again</span></button>
                   <button onClick={(e) => { e.stopPropagation(); nextCard(true); }} className="h-16 flex-1 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all border border-green-100 dark:border-green-900/30"><Check size={20} /><span className="text-[10px] uppercase tracking-wide">Got it</span></button>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-24 relative">
      
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
                      
                      {sortedChapters.map((ch, idx) => (
                          <button 
                            key={ch.id}
                            onClick={() => {
                                stopPlayback();
                                setActiveChapter(ch.id);
                                setShowTableOfContents(false);
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
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"><ArrowLeft size={20} /></button>
            <h2 className="text-xl font-bold truncate text-slate-800 dark:text-white max-w-[200px]">{course.title}</h2>
          </div>
          <button 
            onClick={() => setShowTableOfContents(true)}
            className="w-10 h-10 bg-white dark:bg-slate-800 shadow-sm rounded-full text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center justify-center transition-colors"
          >
              <List size={20} />
          </button>
      </div>

      {currentChapter && (
          <div className="glass-panel rounded-[2.5rem] overflow-hidden min-h-[60vh] flex flex-col shadow-2xl border border-white/60 dark:border-slate-700 relative">
             {/* Content Header & Tabs */}
             <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100 dark:border-slate-700/50">
                <div className="p-6 pb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Chapter {currentChapter.order + 1}</p>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">{currentChapter.title}</h1>
                </div>

                <div className="px-6 pb-4 overflow-x-auto no-scrollbar">
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-max">
                        <button onClick={() => { stopPlayback(); setViewMode('dialogue'); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'dialogue' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                            <MessageCircle size={16} /> Dialogue
                        </button>
                        <button onClick={() => { stopPlayback(); setViewMode('vocab'); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'vocab' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                            <Layers size={16} /> Words
                        </button>
                        <button onClick={() => { stopPlayback(); setViewMode('grammar'); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'grammar' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                            <BookOpen size={16} /> Grammar
                        </button>
                    </div>
                 </div>
             </div>

             <div className="p-6 flex-1 bg-white/30 dark:bg-slate-900/20">
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
                                        <h4 className="text-xl font-bold text-slate-800 dark:text-white">Conversation Missing</h4>
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
                                                             <p className={`text-lg font-bold leading-snug ${isEven ? 'text-slate-800 dark:text-white' : 'text-white'}`}>{line.text}</p>
                                                             {playingText === line.text && audioState === 'PLAYING' && <Volume2 size={16} className={`${isEven ? 'text-indigo-500' : 'text-white/80'} animate-pulse`} />}
                                                        </div>
                                                        <p className={`text-sm mt-1.5 font-medium ${isEven ? 'text-slate-400' : 'text-white/70'}`}>{line.translation}</p>
                                                    </div>
                                                </button>
                                            </div>
                                         )
                                     })}
                                     
                                     <button 
                                        onClick={() => autoPlayIndex !== null ? stopPlayback() : playDialogueSequence(dialogue)}
                                        className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 w-16 h-16 rounded-full shadow-xl shadow-indigo-500/40 hover:scale-110 active:scale-95 transition-all z-20 flex items-center justify-center text-white ${autoPlayIndex !== null ? 'bg-slate-900' : 'bg-indigo-600'}`}
                                     >
                                         {autoPlayIndex !== null ? <PauseCircle size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
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
                                    <h4 className="text-xl font-bold text-slate-800 dark:text-white">Vocabulary Missing</h4>
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
                                <div className="flex justify-end mb-6">
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
                                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">{word.original}</h4>
                                                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{word.reading}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pl-14">
                                                <p className="font-semibold text-slate-700 dark:text-slate-300 leading-snug">{word.meaning}</p>
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
                                 <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Mic size={20} /> Pronunciation Clinic</h3>
                                 <div className="grid gap-3">
                                    {currentChapter.pronunciationTips.map((tip, i) => (
                                        <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <h5 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm mb-1">{tip.title}</h5>
                                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{tip.rule}</p>
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
                                        <h4 className="text-xl font-bold text-slate-800 dark:text-white">Grammar Missing</h4>
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
                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{point.title}</h4>
                                        
                                        <div className="bg-indigo-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 mb-4 inline-block">
                                            <code className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">{point.structure}</code>
                                        </div>
                                        
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed font-medium">{point.explanation}</p>
                                        
                                        <div className="space-y-3">
                                            {point.examples.map((ex, i) => (
                                                <button key={i} onClick={() => handleSpeak(ex.sentence)} className="w-full text-left bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-1 hover:border-indigo-200 dark:hover:border-slate-600 transition-colors group">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform"></span>
                                                        <p className="font-bold text-slate-800 dark:text-white">{ex.sentence}</p>
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
