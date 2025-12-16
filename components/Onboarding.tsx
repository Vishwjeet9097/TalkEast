import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Language } from '../types';
import { ArrowRight, Check, Globe, Play, Sparkles, Languages, BookOpen, Mic, BrainCircuit } from 'lucide-react';
import onboardImage from '../assets/onboard.png';

interface Props {
  onComplete: (profile: UserProfile) => Promise<void> | void;
}

// Language configuration with emojis and descriptions
const LANGUAGE_CONFIG: Record<Language, { emoji: string; nativeName: string; description: string }> = {
  [Language.ENGLISH]: { emoji: '🇬🇧', nativeName: 'English', description: 'Global communication' },
  [Language.HINDI]: { emoji: '🇮🇳', nativeName: 'हिन्दी', description: 'भारत की भाषा' },
  [Language.JAPANESE]: { emoji: '🇯🇵', nativeName: '日本語', description: 'Rich culture & tradition' },
  [Language.KOREAN]: { emoji: '🇰🇷', nativeName: '한국어', description: 'K-pop & modern culture' },
  [Language.CHINESE]: { emoji: '🇨🇳', nativeName: '中文', description: 'Ancient wisdom & business' },
};

export default function Onboarding({ onComplete }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // Start with welcome page
  const [native, setNative] = useState<Language>(Language.ENGLISH);
  const [target, setTarget] = useState<Language>(Language.JAPANESE);

  const handleFinish = async () => {
    await onComplete({
      nativeLanguage: native,
      targetLanguage: target,
      onboardingComplete: true,
      theme: 'light',
      useEnvKey: true
    });
    navigate('/dashboard', { replace: true });
  };

  // Welcome Page (Step 0)
  if (step === 0) {
    return (
      <div className="fixed inset-0 h-screen w-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/20" style={{ minHeight: '100vh', height: '100vh' }}>
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 w-full h-full flex flex-col px-6 py-6 md:py-8 overflow-hidden">
          {/* Top Section - Title (Full Width) - Enhanced */}
          <div className="flex-shrink-0 mb-4 md:mb-6 w-full relative">
            {/* Decorative Background Glow */}
            <div className="absolute -left-4 -top-4 w-32 h-32 bg-gradient-to-br from-indigo-400/20 via-purple-400/20 to-pink-400/20 rounded-full blur-2xl animate-pulse"></div>
            
            <h1 className="relative z-10 text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight w-full">
              {/* Line 1 - Animated - Full Width */}
              <span 
                className="block text-slate-900 dark:text-white mb-1 md:mb-2 fade-in slide-in-from-left-4 w-full"
                style={{ animationDelay: '0.1s' }}
              >
                Make every day
              </span>
              
              {/* Line 2 - Animated - Full Width */}
              <span 
                className="block text-slate-800 dark:text-slate-100 mb-2 md:mb-3 fade-in slide-in-from-left-4 w-full"
                style={{ animationDelay: '0.3s' }}
              >
                a learning
              </span>
              
              {/* Line 3 - Gradient with Animation - Full Width */}
              <span 
                className="block relative w-full fade-in slide-in-from-left-4"
                style={{ animationDelay: '0.5s' }}
              >
                <span className="gradient-text-animated relative inline-block">
                  journey
                </span>
                {/* Gradient Underline Effect */}
                <span className="absolute bottom-0 left-0 w-full h-1.5 md:h-2 gradient-underline rounded-full opacity-30 blur-sm"></span>
              </span>
            </h1>
            
            {/* Subtle Shadow for Depth */}
            <div className="absolute inset-0 -z-10 blur-2xl opacity-20">
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                Make every day<br />a learning<br />journey
              </h1>
            </div>
          </div>

          {/* Central Image - Centered and Flexible */}
          <div className="flex-1 flex items-center justify-center relative w-full my-2 md:my-4 min-h-0">
            <img 
              src={onboardImage} 
              alt="Language Learning Illustration" 
              className="w-full h-full object-contain max-w-md md:max-w-lg lg:max-w-xl"
              style={{ maxHeight: '100%' }}
            />
          </div>

          {/* Bottom Section - Description and Button */}
          <div className="flex-shrink-0 flex flex-col items-center w-full">
            {/* Descriptive Text */}
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mb-4 md:mb-6 leading-relaxed font-medium text-left w-full">
              An engaging way to master new languages and connect with cultures worldwide
            </p>

            {/* CTA Button - Purple Glass Effect 3D */}
            <button
              onClick={() => setStep(1)}
              className="group w-full px-8 py-4 rounded-2xl font-bold text-base md:text-lg shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(147, 51, 234, 0.9) 50%, rgba(219, 39, 119, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(147, 51, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 8px rgba(0, 0, 0, 0.1)',
                transform: 'perspective(1000px) translateZ(0)',
              }}
            >
              {/* 3D Effect Overlay */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)',
                  transform: 'translateZ(10px)',
                }}
              ></div>
              
              {/* Content */}
              <span className="relative z-10 text-white">Start Learning with TalkEast</span>
              <ArrowRight className="w-5 h-5 relative z-10 text-white group-hover:translate-x-1 transition-transform" />
              
              {/* Hover Glow Effect */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                  filter: 'blur(10px)',
                }}
              ></div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Language Selection Pages
  return (
    <div className="fixed inset-0 h-screen w-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/20" style={{ minHeight: '100vh', height: '100vh' }}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col px-6 py-8 md:py-12 md:px-8">
        {/* Progress Indicator - Top */}
        <div className="mb-6 md:mb-8 flex-shrink-0 flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
              Step {step} of 2
            </p>
          </div>
        </div>

        {/* Language Selection Content - Centered */}
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          {step === 1 && (
            <div className="space-y-6 md:space-y-8 w-full max-w-md mx-auto">
              {/* Header - Centered */}
              <div className="space-y-3 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <Languages className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white">
                  I speak...
                </h2>
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-normal">
                  Select your native language
                </p>
              </div>

              {/* Language Options */}
              <div className="space-y-4 md:space-y-5">
                {[Language.ENGLISH, Language.HINDI].map((lang) => {
                  const config = LANGUAGE_CONFIG[lang];
                  const isSelected = native === lang;
                  
                  return (
                    <button
                      key={lang}
                      onClick={() => setNative(lang)}
                      className={`w-full p-4 md:p-5 rounded-2xl flex items-center justify-between transition-all duration-300 group text-left ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`text-3xl md:text-4xl transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {config.emoji}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-base md:text-lg mb-0.5">
                            {config.nativeName}
                          </div>
                          <div className={`text-xs md:text-sm font-normal ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            {config.description}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Next Button - Purple Glass Effect 3D */}
              <button
                onClick={() => setStep(2)}
                className="w-full py-4 md:py-5 rounded-2xl font-semibold text-base md:text-lg shadow-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group relative overflow-hidden mt-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(147, 51, 234, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(147, 51, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 8px rgba(0, 0, 0, 0.1)',
                  transform: 'perspective(1000px) translateZ(0)',
                }}
              >
                {/* 3D Effect Overlay */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)',
                    transform: 'translateZ(10px)',
                  }}
                ></div>
                
                <span className="relative z-10 text-white">Continue</span>
                <ArrowRight className="w-5 h-5 relative z-10 text-white group-hover:translate-x-1 transition-transform" />
                
                {/* Hover Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                    filter: 'blur(10px)',
                  }}
                ></div>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 md:space-y-8 w-full max-w-md mx-auto">
              {/* Header - Centered */}
              <div className="space-y-3 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                  <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white">
                  I want to learn...
                </h2>
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-normal">
                  Choose your target language
                </p>
              </div>

              {/* Language Options */}
              <div className="space-y-4 md:space-y-5">
                {[Language.JAPANESE, Language.KOREAN, Language.CHINESE].map((lang) => {
                  const config = LANGUAGE_CONFIG[lang];
                  const isSelected = target === lang;
                  
                  return (
                    <button
                      key={lang}
                      onClick={() => setTarget(lang)}
                      className={`w-full p-4 md:p-5 rounded-2xl flex items-center justify-between transition-all duration-300 group text-left ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`text-3xl md:text-4xl transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {config.emoji}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-base md:text-lg mb-0.5">
                            {config.nativeName}
                          </div>
                          <div className={`text-xs md:text-sm font-normal ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            {config.description}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Get Started Button - Purple Glass Effect 3D */}
              <button
                onClick={handleFinish}
                className="w-full py-4 md:py-5 rounded-2xl font-semibold text-base md:text-lg shadow-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group relative overflow-hidden mt-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(147, 51, 234, 0.9) 50%, rgba(219, 39, 119, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(147, 51, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 8px rgba(0, 0, 0, 0.1)',
                  transform: 'perspective(1000px) translateZ(0)',
                }}
              >
                {/* 3D Effect Overlay */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)',
                    transform: 'translateZ(10px)',
                  }}
                ></div>
                
                <Sparkles className="w-5 h-5 relative z-10 text-white group-hover:rotate-12 transition-transform" />
                <span className="relative z-10 text-white">Get Started</span>
                <ArrowRight className="w-5 h-5 relative z-10 text-white group-hover:translate-x-1 transition-transform" />
                
                {/* Hover Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                    filter: 'blur(10px)',
                  }}
                ></div>
              </button>

              {/* Back Button */}
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-normal text-sm md:text-base mt-2"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
