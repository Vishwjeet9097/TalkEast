
import React from 'react';
import { useProcessing } from '../context/ProcessingContext';
import { Loader2, CheckCircle, XCircle, ChevronRight, PauseCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GlobalStatus() {
  const { state, statusMessage, progress, activeTaskName, resetJob, error } = useProcessing();
  const navigate = useNavigate();

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

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-96 z-50">
      <div 
        onClick={handleClick}
        className={`glass-panel p-3 rounded-2xl shadow-2xl border border-white/40 dark:border-white/10 backdrop-blur-xl transition-all duration-300 transform translate-y-0 cursor-pointer ${
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

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
              {isError ? 'Processing Failed' : isPaused ? 'Processing Paused' : activeTaskName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-300 truncate">
               {isError ? error : statusMessage}
            </p>
          </div>

          {/* Action Icon */}
          <ChevronRight size={18} className="text-slate-400" />
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
  );
}
