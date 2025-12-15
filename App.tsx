
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { db } from './services/storage';
import { NotificationService } from './services/notifications';
import { UserProfile, Language } from './types';
import { BookOpen, Mic, PenTool, Layout, Plus, Sparkles, ChevronDown, Check, Home, BrainCircuit, Sun, Moon, UserRound, MessageSquare } from 'lucide-react';
import { ProcessingProvider } from './context/ProcessingContext';
import GlobalStatus from './components/GlobalStatus';

// Components
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import CourseView from './components/CourseView';
import ChapterIndex from './components/ChapterIndex';
import LiveAssistant from './components/LiveAssistant';
import NotesView from './components/NotesView';
import PDFUploader from './components/PDFUploader';
import PracticeHub from './components/PracticeHub';
import Profile from './components/Profile';
import Chat from './components/Chat';
import AskWithAI from './components/AskWithAI';
import FloatingAIWidget from './components/FloatingAIWidget';
import AppHeader from './components/AppHeader';
import AppFooter from './components/AppFooter';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const normalizeProfile = (p: UserProfile | null): UserProfile | null => {
    if (!p) return null;
    return { ...p, useEnvKey: p.useEnvKey ?? true };
  };

  useEffect(() => {
    const initApp = async () => {
      await db.init();
      const user = await db.getProfile();
      const normalized = normalizeProfile(user);
      if (normalized && normalized.useEnvKey === undefined) {
        normalized.useEnvKey = true;
      }
      setProfile(normalized);
      setLoading(false);
      NotificationService.requestPermission();
      
      // System-first theme detection
      const applyTheme = (themePref: 'light' | 'dark' | 'system' | undefined) => {
        let shouldBeDark = false;
        
        if (themePref === 'system' || !themePref) {
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          shouldBeDark = systemPrefersDark;
        } else {
          shouldBeDark = themePref === 'dark';
        }
        
        document.documentElement.classList.toggle('dark', shouldBeDark);
      };
      
      applyTheme(normalized?.theme);
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = (e: MediaQueryListEvent) => {
        if (!normalized?.theme || normalized.theme === 'system') {
          applyTheme('system');
        }
      };
      mediaQuery.addEventListener('change', handleThemeChange);
      
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    };
    initApp();
  }, []);

  const handleProfileUpdate = async (newProfile: UserProfile) => {
    const normalized = normalizeProfile({ ...newProfile, useEnvKey: newProfile.useEnvKey ?? true });
    if (!normalized) return;
    await db.saveProfile(normalized);
    setProfile(normalized);
    
    // Apply theme
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = normalized.theme === 'system' 
      ? systemPrefersDark 
      : normalized.theme === 'dark';
    document.documentElement.classList.toggle('dark', shouldBeDark);
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

          {/* App Header - Fixed at top */}
          {profile?.onboardingComplete && (
            <AppHeader profile={profile} onUpdateProfile={handleProfileUpdate} />
          )}

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
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><ChapterIndex profile={profile} /></MainLayout>} 
                />
                <Route 
                  path="/course/:courseId/chapter/:chapterId" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><CourseView profile={profile} /></MainLayout>} 
                />
                <Route 
                  path="/course/:courseId/index" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><ChapterIndex profile={profile} /></MainLayout>} 
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
                  path="/chat" 
                  element={<Chat profile={profile} />} 
                />
                <Route 
                  path="/ask-ai" 
                  element={<AskWithAI profile={profile} />} 
                />
                <Route 
                  path="/notes" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><NotesView profile={profile} /></MainLayout>} 
                />
                <Route 
                  path="/upload" 
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><PDFUploader profile={profile} /></MainLayout>} 
                />
                <Route
                  path="/profile"
                  element={<MainLayout profile={profile} onUpdateProfile={handleProfileUpdate}><Profile profile={profile} onUpdateProfile={handleProfileUpdate} /></MainLayout>}
                />
              </Routes>
          </div>
          
          {/* App Footer - Fixed at bottom with glass effect */}
          {profile?.onboardingComplete && (
            <AppFooter />
          )}
          
          {/* Floating AI Widget - Visible on all screens except onboarding and chat */}
          {profile?.onboardingComplete && (
            <FloatingAIWidgetWrapper profile={profile} />
          )}
        </div>
      </HashRouter>
    </ProcessingProvider>
  );
}

// Wrapper component to conditionally show FloatingAIWidget
function FloatingAIWidgetWrapper({ profile }: { profile: UserProfile | null }) {
  const location = useLocation();
  
  // Hide on chat page
  if (location.pathname === '/chat') {
    return null;
  }
  
  return <FloatingAIWidget profile={profile} />;
}

const MainLayout = ({ 
  children, 
  profile, 
  onUpdateProfile 
}: { 
  children?: React.ReactNode, 
  profile: UserProfile | null,
  onUpdateProfile?: (p: UserProfile) => void 
}) => {
    return (
        <div className="max-w-md mx-auto md:max-w-5xl min-h-screen relative flex flex-col">
            <main className="px-5 relative z-10 flex-1 pt-[calc(5rem+env(safe-area-inset-top))] pb-28">
                {children}
            </main>
        </div>
    );
}
