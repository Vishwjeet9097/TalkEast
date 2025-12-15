import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Globe2, Sparkles, Moon, Sun, KeyRound, Shield, Monitor } from 'lucide-react';
import { UserProfile, Language } from '../types';

interface ProfileProps {
  profile: UserProfile | null;
  onUpdateProfile?: (profile: UserProfile) => void;
}

const Profile = ({ profile, onUpdateProfile }: ProfileProps) => {
  const navigate = useNavigate();
  const currentTheme = profile?.theme || 'system';
  const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveTheme = currentTheme === 'system' 
    ? (systemPrefersDark ? 'dark' : 'light')
    : currentTheme;
  const isDark = effectiveTheme === 'dark';
  const languages = Object.values(Language);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [useEnvKey, setUseEnvKey] = useState<boolean>(profile?.useEnvKey ?? true);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const hasSavedKey = !!(profile?.apiKey);

  useEffect(() => {
    setUseEnvKey(profile?.useEnvKey ?? true);
    setIsEditingKey(false);
  }, [profile?.useEnvKey]);

  const handleBack = () => {
    // Android-like back navigation with a safe fallback
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard', { replace: true });
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

  const handleLanguageChange = (field: 'nativeLanguage' | 'targetLanguage', value: Language) => {
    if (profile && onUpdateProfile) {
      onUpdateProfile({ ...profile, [field]: value });
    }
  };

  const handleToggleSource = (nextUseEnv: boolean) => {
    if (profile && onUpdateProfile) {
      setUseEnvKey(nextUseEnv);
      onUpdateProfile({ ...profile, useEnvKey: nextUseEnv });
    }
  };

  const handleSaveApiKey = () => {
    if (!profile || !onUpdateProfile) return;
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    onUpdateProfile({ ...profile, apiKey: trimmed, useEnvKey: false });
    setUseEnvKey(false);
    setApiKeyInput('');
    setIsEditingKey(false);
  };

  const handleClearApiKey = () => {
    if (!profile || !onUpdateProfile) return;
    onUpdateProfile({ ...profile, apiKey: undefined, useEnvKey: true });
    setUseEnvKey(true);
    setApiKeyInput('');
    setIsEditingKey(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors active:scale-95"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-panel rounded-3xl p-5 shadow-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            PF
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Profile</p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your preferences</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-800/60 flex flex-col gap-3">
            <Globe2 className="text-indigo-500" size={20} />
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Target Language</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Where you’re heading</p>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => {
                  const active = profile?.targetLanguage === lang;
                  return (
                    <button
                      key={lang}
                      disabled={!profile}
                      onClick={() => handleLanguageChange('targetLanguage', lang)}
                      className={`px-3 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95 disabled:opacity-60
                        ${active 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500/60'}`
                      }
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-800/60 flex flex-col gap-3">
            <Sparkles className="text-amber-500" size={20} />
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Native Language</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your comfort zone</p>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => {
                  const active = profile?.nativeLanguage === lang;
                  return (
                    <button
                      key={lang}
                      disabled={!profile}
                      onClick={() => handleLanguageChange('nativeLanguage', lang)}
                      className={`px-3 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95 disabled:opacity-60
                        ${active 
                          ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-md shadow-amber-400/40' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-200 dark:hover:border-amber-400/50'}`
                      }
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-800/60 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              currentTheme === 'system' 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                : isDark 
                  ? 'bg-slate-800 text-amber-300' 
                  : 'bg-indigo-50 text-indigo-600'
            }`}>
              {currentTheme === 'system' ? <Monitor size={18} /> : (isDark ? <Moon size={18} /> : <Sun size={18} />)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Theme</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {currentTheme === 'system' 
                  ? `System (${effectiveTheme === 'dark' ? 'Dark' : 'Light'})`
                  : (isDark ? 'Dark' : 'Light')
                }
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Follow system or choose manually</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => profile && onUpdateProfile && onUpdateProfile({ ...profile, theme })}
                disabled={!profile}
                className={`px-3 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95 disabled:opacity-60 ${
                  currentTheme === theme
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500/60'
                }`}
              >
                {theme === 'system' ? 'System' : theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* API Key Source */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-800/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 flex items-center justify-center">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">API Key</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose Gemini key source</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleToggleSource(true)}
              disabled={!profile}
              className={`px-3 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95 disabled:opacity-60 ${
                useEnvKey
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500/60'
              }`}
            >
              Use .env.local
            </button>
            <button
              onClick={() => handleToggleSource(false)}
              disabled={!profile}
              className={`px-3 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95 disabled:opacity-60 ${
                !useEnvKey
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500/60'
              }`}
            >
              Custom Key
            </button>
            {hasSavedKey && (
              <span className="px-3 py-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300">
                Saved
              </span>
            )}
          </div>

          {!useEnvKey && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {hasSavedKey ? 'Custom key saved' : 'Enter custom key'}
                </div>
                {hasSavedKey && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingKey(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-500/60 transition-colors"
                    >
                      Edit Key
                    </button>
                    <button
                      onClick={handleClearApiKey}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {(!hasSavedKey || isEditingKey) && (
                <>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Gemini API Key</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder={hasSavedKey ? 'Enter new key to replace saved one' : 'Enter key (stored locally)'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      disabled={!profile}
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!profile || !apiKeyInput.trim()}
                      className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/30 hover:bg-indigo-500 transition-colors disabled:opacity-60"
                    >
                      Save
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <Shield size={14} />
                    <span>Key केवल इस ब्राउज़र के IndexedDB में सुरक्षित रहता है.</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 bg-white/50 dark:bg-slate-900/40">
        <Smartphone className="text-slate-400" size={20} />
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Android-style navigation</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Use the Back button above or your device back gesture to return.</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;

