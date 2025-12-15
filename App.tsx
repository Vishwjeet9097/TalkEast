
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { db } from './services/storage';
import { NotificationService } from './services/notifications';
import { UserProfile, Language } from './types';
import { BookOpen, Mic, PenTool, Layout, Plus, Sparkles, ChevronDown, Check, Home, BrainCircuit, Sun, Moon } from 'lucide-react';
import { ProcessingProvider } from './context/ProcessingContext';
import GlobalStatus from './components/GlobalStatus';

// Components
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import CourseView from './components/CourseView';
import LiveAssistant from './components/LiveAssistant';
import NotesView from './components/NotesView';
import PDFUploader from './components/PDFUploader';
import PracticeHub from './components/PracticeHub';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const initApp = async () => {
      await db.init();
      const user = await db.getProfile();
      setProfile(user);
      setLoading(false);
      NotificationService.requestPermission();
      
      const isDark = user?.theme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
    };
    initApp();
  }, []);

  const handleProfileUpdate = async (newProfile: UserProfile) => {
    await db.saveProfile(newProfile);
    setProfile(newProfile);
    document.documentElement.classList.toggle('dark', newProfile.theme === 'dark');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 animate-float shadow-xl flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">LF</span>
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-black/20 blur-md rounded-full animate-pulse"></div>
            </div>
            <p className="text-slate-500 font-medium tracking-wide text-sm uppercase">Loading LingoFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <ProcessingProvider>
      <HashRouter>
        <div className="min-h-screen relative selection:bg-indigo-500/30 overflow-x-hidden">
          {/* Dynamic Background */}
          <div className="mesh-bg light-mesh dark:hidden"></div>
          <div className="mesh-bg hidden dark:block bg-slate-900"></div>
          
          <GlobalStatus />

          {/* Main Route Container */}
          <div className="pb-32 md:pb-0">
              <Routes>
                <Route 
                  path="/" 
                  element={!profile?.onboardingComplete ? <Navigate to="/onboarding" /> : <Navigate to="/dashboard" />} 
                />
                <Route 
                  path="/onboarding" 
                  element={<Onboarding onComplete={handleProfileUpdate} />} 
                />
                <Route 
                  path="/dashboard" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><Dashboard profile={profile} /></MainLayout>} 
                />
                <Route 
                   path="/course/:courseId" 
                   element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><CourseView profile={profile} /></MainLayout>} 
                />
                <Route 
                  path="/practice" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><PracticeHub profile={profile} /></MainLayout>} 
                />
                <Route 
                  path="/live" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><LiveAssistant profile={profile} /></MainLayout>} 
                />
                <Route 
                  path="/notes" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><NotesView /></MainLayout>} 
                />
                <Route 
                  path="/upload" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><PDFUploader profile={profile} /></MainLayout>} 
                />
              </Routes>
          </div>
          
          {/* Mobile Navigation */}
          {profile?.onboardingComplete && (
             <MobileNav />
          )}
        </div>
      </HashRouter>
    </ProcessingProvider>
  );
}

const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: BrainCircuit, label: 'Practice', path: '/practice' },
    { icon: Plus, label: 'Create', path: '/upload', special: true },
    { icon: Mic, label: 'Live', path: '/live' },
    { icon: PenTool, label: 'Notes', path: '/notes' },
  ];

  if (location.pathname === '/onboarding') return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:hidden z-40 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
          <div className="glass-panel rounded-3xl p-2 px-3 flex justify-between items-center shadow-2xl border border-white/60 dark:border-white/10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl">
            {navItems.map((item) => {
              const active = isActive(item.path);
              
              if (item.special) {
                  return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`relative -top-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 transition-transform active:scale-95 ${
                            active ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'bg-indigo-600 text-white'
                        }`}
                    >
                        <Plus size={28} strokeWidth={2.5} />
                    </button>
                  )
              }

              return (
                <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-200 group relative"
                >
                    <div className={`p-2 rounded-2xl transition-all duration-300 ${
                        active 
                        ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' 
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}>
                        <item.icon size={22} strokeWidth={active ? 2.5 : 2} fill={active ? "currentColor" : "none"} className={active ? "opacity-100" : "opacity-80"} />
                    </div>
                    {active && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>}
                </button>
              )
            })}
          </div>
      </div>
    </div>
  );
};

const MainLayout = ({ 
  children, 
  profile, 
  onUpdateProfile 
}: { 
  children?: React.ReactNode, 
  profile: UserProfile | null,
  onUpdateProfile?: (p: UserProfile) => void 
}) => {
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const isDarkTheme = profile?.theme === 'dark';
    const ThemeIcon = isDarkTheme ? Moon : Sun;

    const switchLanguage = (lang: Language) => {
        if (profile && onUpdateProfile) {
            onUpdateProfile({ ...profile, targetLanguage: lang });
            setIsLangMenuOpen(false);
        }
    };

    const toggleTheme = () => {
        if (profile && onUpdateProfile) {
            const newTheme = profile.theme === 'light' ? 'dark' : 'light';
            onUpdateProfile({ ...profile, theme: newTheme });
        }
    }

    const supportedLanguages = [Language.JAPANESE, Language.KOREAN, Language.CHINESE];

    return (
        <div className="max-w-md mx-auto md:max-w-5xl min-h-screen relative flex flex-col">
            <header className="sticky top-0 z-30 px-6 py-4 pt-[calc(1.5rem+env(safe-area-inset-top))] mb-4 flex justify-between items-center bg-gradient-to-b from-white/90 to-white/0 dark:from-slate-900/90 dark:to-slate-900/0 backdrop-blur-sm md:rounded-b-3xl md:bg-white/50 md:backdrop-blur-xl transition-all duration-300">
                 <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                        LF
                     </div>
                     <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                        LingoFlow
                     </h1>
                 </div>
                 
                 <div className="flex items-center gap-3">
                     <button
                        onClick={toggleTheme}
                        className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-amber-300 transition-colors"
                     >
                        <ThemeIcon size={18} />
                     </button>

                     <div className="relative">
                         <button 
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className="pl-3 pr-2 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all active:scale-95"
                         >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            {profile?.targetLanguage}
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                         </button>

                         {isLangMenuOpen && (
                             <div className="absolute right-0 top-full mt-2 w-48 glass-panel rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700 z-50 p-1">
                                 {supportedLanguages.map((lang) => (
                                     <button
                                        key={lang}
                                        onClick={() => switchLanguage(lang)}
                                        className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-xl flex items-center justify-between transition-colors ${
                                            profile?.targetLanguage === lang 
                                            ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' 
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                     >
                                         {lang}
                                         {profile?.targetLanguage === lang && <Check size={16} />}
                                     </button>
                                 ))}
                             </div>
                         )}
                     </div>
                 </div>
            </header>

            <main className="px-5 relative z-10 flex-1">
                {children}
            </main>
            
            {isLangMenuOpen && (
                <div className="fixed inset-0 z-20" onClick={() => setIsLangMenuOpen(false)}></div>
            )}
        </div>
    )
}
