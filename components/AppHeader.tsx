import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile, Language } from '../types';
import { Sun, Moon, ChevronDown, Check } from 'lucide-react';

interface AppHeaderProps {
  profile: UserProfile | null;
  onUpdateProfile?: (profile: UserProfile) => void;
}

export default function AppHeader({ profile, onUpdateProfile }: AppHeaderProps) {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentTheme = profile?.theme || 'system';
  const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveTheme = currentTheme === 'system' 
    ? (systemPrefersDark ? 'dark' : 'light')
    : currentTheme;
  const ThemeIcon = effectiveTheme === 'dark' ? Moon : Sun;

  // Don't show header only on onboarding page
  if (location.pathname === '/onboarding') {
    return null;
  }

  const switchLanguage = (lang: Language) => {
    if (profile && onUpdateProfile) {
      onUpdateProfile({ ...profile, targetLanguage: lang });
      setIsLangMenuOpen(false);
    }
  };

  const cycleTheme = () => {
    if (profile && onUpdateProfile) {
      const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
      const currentIndex = themes.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      onUpdateProfile({ ...profile, theme: themes[nextIndex] });
    }
  };

  const supportedLanguages = [Language.JAPANESE, Language.KOREAN, Language.CHINESE];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 glass-panel border-b border-white/60 dark:border-slate-800/50 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="max-w-md mx-auto md:max-w-5xl px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-95"
          >
            LF
          </button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            LingoFlow
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={cycleTheme}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-amber-300 transition-colors"
            title={`Theme: ${currentTheme === 'system' ? 'System' : currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`}
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
      </div>
      
      {isLangMenuOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setIsLangMenuOpen(false)}></div>
      )}
    </header>
  );
}

