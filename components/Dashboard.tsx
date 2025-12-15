
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, Course, Chapter, Language, ProcessingJob, SearchResult, UserStats, PracticeHistory } from '../types';
import { db } from '../services/storage';
import { useNavigate } from 'react-router-dom';
import { Book, GraduationCap, ChevronRight, Plus, Flame, Trophy, Clock, ArrowRight, BookOpen, Layers, Zap, PlayCircle, Lightbulb, Sparkles, Search, X, Loader2, Play, Pause, Trash2, AlertTriangle, RefreshCw, Globe, Wand2, Star, History } from 'lucide-react';
import { useProcessing } from '../context/ProcessingContext';
import { searchWordMeaning } from '../services/gemini';

export default function Dashboard({ profile }: { profile: UserProfile | null }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [recentChapters, setRecentChapters] = useState<{course: Course, chapter: Chapter}[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistory[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<{ type: 'course'|'chapter'|'word', title: string, subtitle?: string, id: string, courseId?: string, chapterId?: string }[]>([]);
  
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [aiResult, setAiResult] = useState<SearchResult | null>(null);

  const navigate = useNavigate();
  const { resumeJob, pauseJob, deleteJob, activeJobId, state: processingState } = useProcessing();
  const prevDataRef = useRef<{courses: string, chapters: string, jobs: string, stats: string}>({courses: '', chapters: '', jobs: '', stats: ''});

  // Helper to check if data actually changed
  const hasDataChanged = (newData: any, oldData: string, key: string): boolean => {
      const newStr = JSON.stringify(newData);
      if (newStr !== oldData) {
          prevDataRef.current[key as keyof typeof prevDataRef.current] = newStr;
          return true;
      }
      return false;
  };

  const loadData = useCallback(async () => {
      try {
          const data = await db.getCourses();
          const filteredCourses = data.filter(c => {
              if (c.targetLanguage) {
                  return c.targetLanguage === profile?.targetLanguage;
              }
              return true;
          });
          filteredCourses.sort((a, b) => {
              if (a.processingJobId && !b.processingJobId) return -1;
              if (!a.processingJobId && b.processingJobId) return 1;
              return 0; 
          });
          
          // Only update if courses actually changed
          if (hasDataChanged(filteredCourses, prevDataRef.current.courses, 'courses')) {
              setCourses(filteredCourses);
          }
          
          const chaptersList: {course: Course, chapter: Chapter}[] = [];
          filteredCourses.forEach(c => {
              c.chapters.forEach(ch => {
                  // Only include chapters that have vocab (for Jump Back In)
                  if (ch.vocab.length > 0) {
                      chaptersList.push({ course: c, chapter: ch });
                  }
              });
          });
          
          // Recency: lastAccessed desc; fallback to earliest chapters to fill 3 slots
          const withAccess = [...chaptersList].sort((a, b) => {
              const aTime = a.chapter.lastAccessed ?? 0;
              const bTime = b.chapter.lastAccessed ?? 0;
              if (aTime === bTime) return a.chapter.order - b.chapter.order;
              return bTime - aTime;
          });
          const picked: {course: Course, chapter: Chapter}[] = [];
          for (const item of withAccess) {
              if (picked.length >= 3) break;
              picked.push(item);
          }
          if (picked.length < 3) {
              const byOrder = [...chaptersList].sort((a, b) => a.chapter.order - b.chapter.order);
              for (const item of byOrder) {
                  if (picked.length >= 3) break;
                  if (!picked.find(p => p.chapter.id === item.chapter.id)) picked.push(item);
              }
          }
          
          // Only update if chapters actually changed
          if (hasDataChanged(picked, prevDataRef.current.chapters, 'chapters')) {
              setRecentChapters(picked);
          }

          const allJobs = await db.getAllJobs();
          const activeJobs = allJobs.filter(j => j.status !== 'completed').sort((a,b) => b.updatedAt - a.updatedAt);
          
          // Only update if jobs actually changed
          if (hasDataChanged(activeJobs, prevDataRef.current.jobs, 'jobs')) {
              setJobs(activeJobs);
          }

          const userStats = await db.getStats();
          
          // Only update if stats actually changed
          if (hasDataChanged(userStats, prevDataRef.current.stats, 'stats')) {
              setStats(userStats);
          }
      } catch (error) {
          console.error('Error loading data:', error);
      }
  }, [profile?.targetLanguage]);

  useEffect(() => {
      setIsLoading(true);
      loadData().finally(() => setIsLoading(false));
      
      // Only poll for updates if processing, otherwise check less frequently
      const pollInterval = processingState === 'processing' ? 3000 : 10000; // 3s if processing, 10s otherwise
      
      const interval = setInterval(() => {
          loadData();
      }, pollInterval);
      
      return () => clearInterval(interval);
  }, [loadData, processingState]);

  useEffect(() => {
      if (!searchQuery.trim()) {
          setFilteredResults([]);
          return;
      }
      
      const query = searchQuery.toLowerCase();
      const results: any[] = [];

      courses.forEach(course => {
          if (course.title.toLowerCase().includes(query)) {
              results.push({ type: 'course', title: course.title, subtitle: `${course.chapters.length} chapters`, id: course.id });
          }
          course.chapters.forEach(chapter => {
              if (chapter.title.toLowerCase().includes(query)) {
                  results.push({ type: 'chapter', title: chapter.title, subtitle: course.title, id: chapter.id, courseId: course.id });
              }
              chapter.vocab.forEach(v => {
                  if (v.original.toLowerCase().includes(query) || v.meaning.toLowerCase().includes(query)) {
                      results.push({ type: 'word', title: v.original, subtitle: `${v.meaning} (${chapter.title})`, id: chapter.id, courseId: course.id, chapterId: chapter.id });
                  }
              });
          });
      });
      setFilteredResults(results.slice(0, 10)); 
  }, [searchQuery, courses]);

  const handleAISearch = async () => {
      if (!profile || !searchQuery) return;
      setIsSearchingAI(true);
      setFilteredResults([]); 
      try {
          const result = await searchWordMeaning(searchQuery, profile.nativeLanguage, profile.targetLanguage, profile);
          setAiResult(result);
      } catch (e) {
          console.error(e);
          alert("Could not fetch meaning. Please try again.");
      } finally {
          setIsSearchingAI(false);
      }
  };

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 18) return "Good Afternoon";
      return "Good Evening";
  }

  const startPractice = (courseId: string, chapterId: string) => {
      navigate(`/course/${courseId}`, { state: { activeChapterId: chapterId, autoStartStudy: true } });
  }

  const handleResultClick = (result: any) => {
      if (result.type === 'course') navigate(`/course/${result.id}`);
      else if (result.type === 'chapter') navigate(`/course/${result.courseId}`, { state: { activeChapterId: result.id } });
      else if (result.type === 'word') navigate(`/course/${result.courseId}`, { state: { activeChapterId: result.chapterId } });
  };

  return (
    <div className="space-y-10 pb-12">
      
      {/* AI Search Modal */}
      {aiResult && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setAiResult(null)}>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 relative border border-white/20" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setAiResult(null)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
                  
                  <div className="text-center mb-8 mt-2">
                      <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-3 uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                        {aiResult.partOfSpeech}
                      </span>
                      <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">{aiResult.word}</h2>
                      {aiResult.pinyinWithTones && <p className="text-lg text-indigo-500 font-medium font-serif">{aiResult.pinyinWithTones}</p>}
                  </div>

                  <div className="space-y-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800/50 p-5 rounded-2xl border border-indigo-100 dark:border-slate-700">
                          <p className="text-[10px] text-indigo-400 mb-1 uppercase font-bold tracking-wider">{profile?.nativeLanguage}</p>
                          <p className="font-bold text-xl text-slate-800 dark:text-white leading-snug">{aiResult.meaning}</p>
                      </div>

                      {aiResult.englishMeaning && (
                          <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                              <p className="text-[10px] text-slate-400 mb-1 uppercase font-bold tracking-wider">English</p>
                              <p className="font-medium text-slate-700 dark:text-slate-200">{aiResult.englishMeaning}</p>
                          </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Context Examples</p>
                          <div className="space-y-3">
                            {aiResult.examples.map((ex, i) => (
                                <div key={i} className="text-sm">
                                    <p className="text-indigo-600 dark:text-indigo-400 font-semibold mb-1">{ex.sentence}</p>
                                    <p className="text-slate-500 dark:text-slate-400 italic">{ex.translation}</p>
                                </div>
                            ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Hero Section */}
      <div className="space-y-6">
        <div className="px-1">
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm mb-1 uppercase tracking-wide">{getGreeting()},</p>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                Ready to master <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">{profile?.targetLanguage || 'a new language'}?</span>
            </h2>
        </div>

        {/* Stats Cards */}
        {stats && (
            <div className="grid grid-cols-3 gap-3">
                <div className="glass-panel p-4 rounded-2xl border border-white/60 dark:border-slate-700 text-center relative group">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <Trophy size={16} className="text-yellow-500" />
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">{stats.todayHighScore}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Today's High Score</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-white/60 dark:border-slate-700 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <Star size={16} className="text-indigo-500" />
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">{stats.streakDays}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Day Streak</p>
                </div>
                <button 
                    onClick={async () => {
                        const history = await db.getPracticeHistory(50);
                        setPracticeHistory(history);
                        setShowHistory(true);
                    }}
                    className="glass-panel p-4 rounded-2xl border border-white/60 dark:border-slate-700 text-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
                >
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <History size={16} className="text-purple-500 group-hover:text-indigo-600 transition-colors" />
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">{stats.totalWordsReviewed}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Words Reviewed</p>
                </button>
            </div>
        )}

        {/* Search Bar */}
        <div className="relative z-20 group">
            <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-3xl blur-xl group-hover:bg-indigo-500/10 transition-all duration-500"></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center p-2 pl-5 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all focus-within:scale-[1.01]">
                <Search className="text-slate-400 mr-3" size={20} />
                <input 
                    type="text" 
                    placeholder={`Ask AI or search in ${profile?.nativeLanguage}...`}
                    className="w-full py-3 bg-transparent outline-none text-slate-800 dark:text-white font-medium placeholder-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                />
                {searchQuery ? (
                    <button onClick={() => setSearchQuery('')} className="p-2 text-slate-400 hover:text-slate-600"><X size={18} /></button>
                ) : (
                    <button className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-400"><Wand2 size={18} /></button>
                )}
            </div>
            
            {/* Dropdown */}
            {(searchQuery || isSearchingAI) && !aiResult && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    {isSearchingAI ? (
                        <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                            <p className="text-slate-800 dark:text-white font-bold">Consulting AI Tutor...</p>
                        </div>
                    ) : (
                        <>
                           <div 
                                onClick={handleAISearch}
                                className="p-4 m-2 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer flex items-center gap-4 group transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">Ask AI Assistant</p>
                                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Get definition & examples for "{searchQuery}"</p>
                                </div>
                            </div>
                            
                            <div className="max-h-60 overflow-y-auto custom-scrollbar px-2 pb-2">
                                {filteredResults.map((result, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => handleResultClick(result)}
                                        className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between group transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                result.type === 'word' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {result.type === 'word' ? 'W' : 'C'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{result.title}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400">{result.subtitle}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* ACTIVE JOBS */}
        {jobs.length > 0 && (
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-5 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-40"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <RefreshCw size={14} className={jobs.some(j => j.status === 'processing') ? "animate-spin" : ""} /> 
                            Processing Queue
                        </h3>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">{jobs.length} Tasks</span>
                    </div>
                    
                    <div className="space-y-3">
                        {jobs.map(job => (
                            <div key={job.id} className="bg-white/10 dark:bg-slate-200/50 backdrop-blur-sm p-3 rounded-2xl border border-white/10 dark:border-slate-300 flex items-center gap-3">
                                <div className="relative w-10 h-10 flex items-center justify-center">
                                     <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-white/20 dark:text-slate-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                        <path className={`${job.status === 'failed' ? 'text-red-400' : 'text-indigo-400 dark:text-indigo-600'} transition-all duration-500`} strokeDasharray={`${job.progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    </svg>
                                    <div className="absolute text-[8px] font-bold">{job.progress}%</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm truncate">{job.courseMetadata.title}</h4>
                                    <p className="text-[10px] opacity-70 truncate">{job.status === 'processing' ? 'Generating smart content...' : job.status}</p>
                                </div>
                                <div className="flex gap-1">
                                    {job.status === 'processing' ? (
                                        <button onClick={() => pauseJob(job.id)} className="p-2 hover:bg-white/20 rounded-full"><Pause size={14} /></button>
                                    ) : (
                                        <button onClick={() => resumeJob(job.id)} className="p-2 hover:bg-white/20 rounded-full"><Play size={14} /></button>
                                    )}
                                    <button onClick={() => deleteJob(job.id)} className="p-2 hover:bg-red-500/20 rounded-full text-red-300 dark:text-red-500"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* QUICK PRACTICE */}
      <div>
        <div className="flex justify-between items-center mb-5 px-1">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap size={20} className="text-amber-500 fill-amber-500" /> Jump Back In
            </h3>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-5 px-5 no-scrollbar snap-x snap-mandatory">
            {isLoading ? (
                <div className="w-full h-32 glass-panel rounded-3xl flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                </div>
            ) : recentChapters.length > 0 ? (
                recentChapters.map(({course, chapter}, idx) => (
                     <button 
                        key={`${course.id}-${chapter.id}`}
                        onClick={() => startPractice(course.id, chapter.id)}
                        className="snap-start flex-shrink-0 w-72 h-44 glass-panel rounded-[2rem] p-6 flex flex-col justify-between relative overflow-hidden group card-hover border border-white/60 dark:border-white/10"
                    >
                        {/* Abstract Decor */}
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                        
                        <div className="z-10 text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                                    {course.title.substring(0, 15)}...
                                </span>
                            </div>
                            <h4 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight line-clamp-2">
                                {chapter.title}
                            </h4>
                        </div>
                        <div className="z-10 flex justify-between items-end w-full">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                                {chapter.vocab.length} words
                            </span>
                            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 group-hover:scale-110 transition-transform">
                                <Play size={20} fill="currentColor" className="ml-1" />
                            </div>
                        </div>
                    </button>
                ))
            ) : (
                 <div className="w-full h-32 glass-panel rounded-3xl flex flex-col items-center justify-center text-slate-500 text-sm border-dashed border-2 border-slate-300 dark:border-slate-700">
                    <p className="font-medium">No active sessions.</p>
                    <span className="text-xs mt-1">Upload content to start!</span>
                 </div>
            )}
        </div>
      </div>

      {/* Course List */}
      <div>
        <div className="flex justify-between items-center mb-5 px-1">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Your Library</h3>
            <button 
                onClick={() => navigate('/upload')} 
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
            >
                <Plus size={16} /> Add New
            </button>
        </div>

        {isLoading ? (
          <div className="text-center py-16 glass-panel rounded-[2.5rem] flex flex-col items-center">
            <Loader2 size={32} className="animate-spin text-indigo-600 mb-4" />
            <p className="text-slate-500 text-sm">Loading your library...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Book className="h-8 w-8 text-indigo-400" />
            </div>
            <h4 className="font-bold text-xl mb-2 text-slate-800 dark:text-white">Library Empty</h4>
            <p className="text-slate-500 text-sm mb-8 max-w-[220px] leading-relaxed">Import a textbook PDF or photo to generate your personalized AI course.</p>
            <button 
                onClick={() => navigate('/upload')}
                className="btn-primary px-8 py-3.5 rounded-2xl font-bold text-sm"
            >
                Import First Book
            </button>
          </div>
        ) : (
          <div className="grid gap-5">
            {courses.map((course) => (
              <div 
                key={course.id}
                onClick={() => navigate(`/course/${course.id}`)}
                className="glass-panel p-5 rounded-[2rem] flex items-center gap-5 cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all border border-white/50 dark:border-slate-700 group card-hover relative overflow-hidden"
              >
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-500 relative z-10">
                    <GraduationCap size={36} />
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                
                <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-extrabold text-lg truncate text-slate-900 dark:text-white tracking-tight">{course.title}</h4>
                        {course.processingJobId && (
                            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <Loader2 size={10} className="animate-spin" /> BUILDING
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wide">
                            {course.level}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                           <Layers size={12} /> {course.chapters?.length || 0} Units
                        </span>
                    </div>
                </div>

                <div className="h-12 w-12 rounded-full border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-all relative z-10 bg-white/50 dark:bg-slate-800/50">
                    <ChevronRight size={20} className="ml-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Practice History Modal */}
      {showHistory && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-300 relative border border-white/20" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                      <div>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Practice History</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Recent attempts and scores</p>
                      </div>
                      <button 
                          onClick={() => setShowHistory(false)}
                          className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                      {practiceHistory.length > 0 ? (
                          practiceHistory.map((entry) => {
                              const date = new Date(entry.timestamp);
                              const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              
                              return (
                                  <div 
                                      key={entry.id}
                                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                  >
                                      <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                                  entry.type === 'daily-review' 
                                                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                      : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                              }`}>
                                                  {entry.type === 'daily-review' ? 'Daily Review' : entry.type}
                                              </span>
                                              <span className="text-xs text-slate-500 dark:text-slate-400">{dateStr} • {timeStr}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                              <Trophy size={14} className="text-yellow-500" />
                                              <span className="text-sm font-bold text-slate-900 dark:text-white">{entry.score}</span>
                                          </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 mt-2">
                                          <div>
                                              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Accuracy</p>
                                              <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.accuracy}%</p>
                                          </div>
                                          <div>
                                              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Correct</p>
                                              <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.correctCount}/{entry.totalCount}</p>
                                          </div>
                                          {entry.duration && (
                                              <div>
                                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Time</p>
                                                  <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.duration}s</p>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })
                      ) : (
                          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                              <History size={48} className="mx-auto mb-4 opacity-50" />
                              <p className="text-sm font-medium">No practice history yet</p>
                              <p className="text-xs mt-1">Complete practice sessions to see your progress</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
