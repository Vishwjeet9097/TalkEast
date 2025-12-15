
import React, { useState } from 'react';
import { useProcessing } from '../context/ProcessingContext';
import { Loader2, CheckCircle, XCircle, ChevronRight, PauseCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GlobalStatus() {
  const { state, statusMessage, progress, activeTaskName, resetJob, error } = useProcessing();
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);

  if (state === 'IDLE') return null;

  const isComplete = state === 'completed';
  const isError = state === 'failed';
  const isPaused = state === 'paused';

  const handleClick = () => {
    if (isComplete) {
      resetJob();
      navigate('/dashboard'); 
    } else if (isError || isPaused) {
      // Navigate to dashboard where they can manage the job
      navigate('/dashboard'); 
    }
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isComplete || isError) {
      resetJob();
    }
  };

  return (
    <>
      {isMinimized ? (
        // Floating Icon Only
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50">
          <button
            onClick={handleMinimize}
            className={`w-14 h-14 rounded-full shadow-2xl border-2 backdrop-blur-xl transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 ${
              isError ? 'bg-red-500/90 dark:bg-red-600/90 border-red-300 text-white' : 
              isPaused ? 'bg-amber-500/90 dark:bg-amber-600/90 border-amber-300 text-white' :
              isComplete ? 'bg-green-500/90 dark:bg-green-600/90 border-green-300 text-white' : 
              'bg-indigo-500/90 dark:bg-indigo-600/90 border-indigo-300 text-white'
            }`}
            title={isError ? 'Processing Failed - Click to expand' : isPaused ? 'Processing Paused - Click to expand' : activeTaskName}
          >
            {state === 'processing' && <Loader2 className="animate-spin" size={24} />}
            {isComplete && <CheckCircle size={24} />}
            {isError && <XCircle size={24} />}
            {isPaused && <PauseCircle size={24} />}
          </button>
          {/* Progress Ring (when processing/paused) */}
          {!isComplete && !isError && (
            <svg className="absolute inset-0 -rotate-90" width="56" height="56">
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - progress / 100)}`}
                className="transition-all duration-500"
              />
            </svg>
          )}
        </div>
      ) : (
        // Expanded Card View
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-96 z-50">
          <div 
            className={`glass-panel p-3 rounded-2xl shadow-2xl border border-white/40 dark:border-white/10 backdrop-blur-xl transition-all duration-300 transform translate-y-0 ${
              isError ? 'bg-red-50/90 dark:bg-red-900/40 border-red-200' : 
              isPaused ? 'bg-amber-50/90 dark:bg-amber-900/40 border-amber-200' :
              isComplete ? 'bg-green-50/90 dark:bg-green-900/40 border-green-200' : 
              'bg-white/90 dark:bg-slate-800/90'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Icon State */}
              <div className="shrink-0">
                {state === 'processing' && <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={24} />}
                {isComplete && <CheckCircle className="text-green-600 dark:text-green-400" size={24} />}
                {isError && <XCircle className="text-red-500" size={24} />}
                {isPaused && <PauseCircle className="text-amber-500" size={24} />}
              </div>

              {/* Text Content - Clickable for navigation */}
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={handleClick}
              >
                <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {isError ? 'Processing Failed' : isPaused ? 'Processing Paused' : activeTaskName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-300 truncate">
                   {isError ? error : statusMessage}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleMinimize}
                  className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
                  title="Minimize to icon"
                >
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
                {(isComplete || isError) && (
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
                    title="Dismiss"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                )}
                {!isComplete && !isError && (
                  <div 
                    onClick={handleClick}
                    className="p-1.5 cursor-pointer"
                  >
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar (Only when processing or paused) */}
            {!isComplete && !isError && (
              <div className="mt-3 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ease-out ${isPaused ? 'bg-amber-400' : 'bg-indigo-600 dark:bg-indigo-400'}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
