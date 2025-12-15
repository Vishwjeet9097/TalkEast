import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Language } from '../types';
import { ArrowRight, Check } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => Promise<void> | void;
}

export default function Onboarding({ onComplete }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [native, setNative] = useState<Language>(Language.ENGLISH);
  const [target, setTarget] = useState<Language>(Language.JAPANESE);

  const handleFinish = async () => {
    await onComplete({
      nativeLanguage: native,
      targetLanguage: target,
      onboardingComplete: true,
      theme: 'light' // Default
    });
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
       {/* Decor */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-purple-500 rounded-full filter blur-[80px] opacity-30"></div>
      <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-blue-500 rounded-full filter blur-[80px] opacity-30"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl shadow-2xl z-10">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">I speak...</h2>
            <div className="space-y-3">
              {[Language.ENGLISH, Language.HINDI].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setNative(lang)}
                  className={`w-full p-4 rounded-xl flex justify-between items-center transition-all ${
                    native === lang 
                      ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]' 
                      : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80'
                  }`}
                >
                  <span className="font-medium text-lg">{lang}</span>
                  {native === lang && <Check size={20} />}
                </button>
              ))}
            </div>
            <button 
                onClick={() => setStep(2)}
                className="w-full mt-8 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
                Next <ArrowRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">I want to learn...</h2>
            <div className="space-y-3">
              {[Language.JAPANESE, Language.KOREAN, Language.CHINESE].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setTarget(lang)}
                  className={`w-full p-4 rounded-xl flex justify-between items-center transition-all ${
                    target === lang 
                      ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]' 
                      : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80'
                  }`}
                >
                  <span className="font-medium text-lg">{lang}</span>
                  {target === lang && <Check size={20} />}
                </button>
              ))}
            </div>
             <button 
                onClick={handleFinish}
                className="w-full mt-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30"
            >
                Get Started
            </button>
          </div>
        )}
      </div>
    </div>
  );
}