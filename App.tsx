
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { db } from './services/storage';
import { NotificationService } from './services/notifications';
import { PermissionService } from './services/permissions';
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
import ErrorBoundary from './components/ErrorBoundary';
import ErrorDisplay from './components/ErrorDisplay';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<Error | string | null>(null);
  const [initError, setInitError] = useState<Error | null>(null);

  const normalizeProfile = (p: UserProfile | null): UserProfile | null => {
    if (!p) return null;
    return { ...p, useEnvKey: p.useEnvKey ?? true };
  };

  useEffect(() => {
    // Global error handlers
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      const errorMessage = event.error?.message || event.message || 'An unexpected error occurred';
      
      // Check if it's a storage error
      if (errorMessage.includes('storage') || errorMessage.includes('IndexedDB') || errorMessage.includes('DB not initialized')) {
        setError('Database initialization failed. Please refresh the page.');
        return;
      }
      
      setError(errorMessage);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      const errorMessage = event.reason?.message || String(event.reason) || 'An unexpected error occurred';
      
      // Check if it's a storage error
      if (errorMessage.includes('storage') || errorMessage.includes('IndexedDB') || errorMessage.includes('DB not initialized') || errorMessage.includes('Access to storage')) {
        setError('Database access error. Please refresh the page.');
        return;
      }
      
      setError(errorMessage);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const initApp = async () => {
      try {
        setInitError(null);
      await db.init();
      const user = await db.getProfile();
      const normalized = normalizeProfile(user);
      if (normalized && normalized.useEnvKey === undefined) {
        normalized.useEnvKey = true;
      }
      setProfile(normalized);
      setLoading(false);
        
        // Check if this is first launch (no profile or onboarding not complete)
        const isFirstLaunch = !normalized || !normalized.onboardingComplete;
        
        // Request permissions on first launch
        if (isFirstLaunch) {
          try {
            // Check current permission status
            const permissionStatus = await PermissionService.checkPermissions();
            
            console.log('First launch - Permission status:', permissionStatus);
            
            // Request notification permission if not granted
            if (permissionStatus.notifications !== 'granted') {
              console.log('Requesting notification permission on first launch...');
              try {
                await PermissionService.requestNotificationPermission();
              } catch (err) {
                console.warn('Failed to request notification permission:', err);
              }
            }
            
            // Request microphone permission if not granted
            // Small delay to avoid showing multiple dialogs at once
            if (permissionStatus.microphone !== 'granted') {
              console.log('Requesting microphone permission on first launch...');
              setTimeout(async () => {
                try {
                  await PermissionService.requestMicrophonePermission();
                } catch (err) {
                  console.warn('Failed to request microphone permission:', err);
                }
              }, 1000); // 1 second delay after notification permission
            }
          } catch (permError) {
            console.warn('Permission request error on first launch:', permError);
          }
        } else {
          // For returning users, check and request notifications if needed
          try {
            const permissionStatus = await PermissionService.checkPermissions();
            if (permissionStatus.notifications !== 'granted') {
              await NotificationService.requestPermission();
            }
          } catch (notifError) {
            console.warn('Notification permission error:', notifError);
          }
        }
        
        // Setup notifications (only if permission granted)
        try {
          await NotificationService.requestPermission();
          // Check and reset daily status if new day
          await NotificationService.checkAndResetDailyStatus();
          // Start hourly reminders for daily review
          await NotificationService.startHourlyReminders();
        } catch (notifError) {
          console.warn('Notification permission error:', notifError);
        }
        
        // Handle visibility change - restart reminders when app becomes visible
        const handleVisibilityChange = async () => {
          if (!document.hidden) {
            try {
              await NotificationService.checkAndResetDailyStatus();
              await NotificationService.restartHourlyReminders();
            } catch (error) {
              console.warn('Error restarting reminders on visibility change:', error);
            }
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Also handle focus event
        const handleFocus = async () => {
          try {
            await NotificationService.checkAndResetDailyStatus();
            await NotificationService.restartHourlyReminders();
          } catch (error) {
            console.warn('Error restarting reminders on focus:', error);
          }
        };
        
        window.addEventListener('focus', handleFocus);
        
        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('focus', handleFocus);
        };
      
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
      } catch (err: any) {
        console.error('App initialization error:', err);
        setInitError(err);
        setLoading(false);
        const errorMessage = err?.message || 'Failed to initialize application';
        if (errorMessage.includes('storage') || errorMessage.includes('IndexedDB') || errorMessage.includes('DB not initialized')) {
          setError('Database initialization failed. Please refresh the page or check your browser settings.');
        } else {
          setError(errorMessage);
        }
      }
    };
    
    initApp();

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
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

  // Show initialization error screen
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-2xl w-full glass-panel rounded-3xl p-8 md:p-12 shadow-2xl border border-white/60 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
              <AlertTriangle size={48} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
              Initialization Error
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-lg">
              {initError.message || 'Failed to initialize the application'}
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-red-700 dark:text-red-400">
                This might be due to browser storage restrictions. Please:
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 mt-2 list-disc list-inside space-y-1">
                <li>Check if your browser allows storage access</li>
                <li>Try using a different browser</li>
                <li>Clear browser cache and reload</li>
                <li>Check if you're in a private/incognito mode</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={20} />
              Reload Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 animate-float shadow-xl flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">TE</span>
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-black/20 blur-md rounded-full animate-pulse"></div>
            </div>
            <p className="text-slate-500 font-medium tracking-wide text-sm uppercase">Loading TalkEast...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <ProcessingProvider>
      <HashRouter>
        <div className="min-h-screen relative selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Global Error Display */}
            {error && (
              <ErrorDisplay 
                error={error} 
                onDismiss={() => setError(null)}
                onRetry={() => {
                  setError(null);
                  window.location.reload();
                }}
              />
            )}
            
          {/* Dynamic Background */}
          <div className="mesh-bg light-mesh dark:hidden"></div>
          <div className="mesh-bg hidden dark:block bg-slate-900"></div>
          
          {/* Global Status Progress Bar - Above Header */}
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
                  element={<div className="fixed inset-0"><Onboarding onComplete={handleProfileUpdate} /></div>} 
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
    </ErrorBoundary>
  );
}

// Wrapper component to conditionally show FloatingAIWidget
function FloatingAIWidgetWrapper({ profile }: { profile: UserProfile | null }) {
  const location = useLocation();
  
  // Hide on chat and onboarding pages
  const hidePaths = ['/chat', '/onboarding'];
  if (hidePaths.includes(location.pathname)) {
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
            <main className="px-5 relative z-10 flex-1 pt-[calc(5rem+env(safe-area-inset-top)+10px)] pb-28">
                {children}
            </main>
        </div>
    );
}
