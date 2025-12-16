
import React, { useState, useEffect } from 'react';
import { useProcessing } from '../context/ProcessingContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/storage';

export default function GlobalStatus() {
  const { state, progress, resetJob, activeJobId } = useProcessing();
  const navigate = useNavigate();
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch job data to get actual batch counts
  useEffect(() => {
    if (activeJobId && state !== 'IDLE') {
      const fetchJobData = async () => {
        try {
          const job = await db.getJob(activeJobId);
          if (job) {
            setProcessedCount(job.processedBatches?.length || 0);
            setTotalCount(job.totalBatches || 0);
          }
        } catch (error) {
          console.warn('Error fetching job data:', error);
        }
      };
      fetchJobData();
      // Update periodically
      const interval = setInterval(fetchJobData, 1000);
      return () => clearInterval(interval);
    } else {
      setProcessedCount(0);
      setTotalCount(0);
    }
  }, [activeJobId, state]);

  if (state === 'IDLE') return null;

  const isComplete = state === 'completed';
  const isError = state === 'failed';
  const isPaused = state === 'paused';

  const handleClick = () => {
    if (isComplete || isError || isPaused) {
      resetJob();
      navigate('/dashboard'); 
    }
  };

  // Use actual batch counts if available, otherwise use progress-based estimate
  const displayProcessed = totalCount > 0 ? processedCount : Math.round(progress);
  const displayTotal = totalCount > 0 ? totalCount : 100;

  // Determine color scheme based on state
  const getColorScheme = () => {
    if (isError) {
      return {
        bg: 'from-red-600 via-red-500 to-red-600',
        progress: 'from-red-400 via-red-300 to-red-400',
        glow: 'shadow-red-500/50',
        text: 'text-red-50'
      };
    }
    if (isComplete) {
      return {
        bg: 'from-emerald-600 via-emerald-500 to-emerald-600',
        progress: 'from-emerald-400 via-emerald-300 to-emerald-400',
        glow: 'shadow-emerald-500/50',
        text: 'text-emerald-50'
      };
    }
    if (isPaused) {
      return {
        bg: 'from-amber-600 via-amber-500 to-amber-600',
        progress: 'from-amber-400 via-amber-300 to-amber-400',
        glow: 'shadow-amber-500/50',
        text: 'text-amber-50'
      };
    }
    // Processing
    return {
      bg: 'from-indigo-600 via-purple-600 to-indigo-600',
      progress: 'from-indigo-400 via-purple-400 to-indigo-400',
      glow: 'shadow-indigo-500/50',
      text: 'text-indigo-50'
    };
  };

  const colors = getColorScheme();

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[35] transition-all duration-300"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        height: '10px',
        maxHeight: '10px'
      }}
      onClick={handleClick}
    >
      {/* Main Container with 3D Glass Effect - Compact 10px Height */}
      <div 
        className={`relative bg-gradient-to-r ${colors.bg} backdrop-blur-md shadow-xl ${colors.glow} border-b border-white/20 h-full`}
        style={{
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-[shimmer_2s_infinite]"></div>
        </div>

        <div className="relative max-w-md mx-auto md:max-w-5xl px-3 md:px-4 h-full flex items-center justify-between cursor-pointer">
          {/* Left: Compact Status Info */}
          <div className="flex items-center gap-1.5 flex-shrink-0 h-full">
            {/* Compact Count Display */}
            <div className={`flex items-center gap-1 ${colors.text} font-extrabold text-[8px] md:text-[9px] leading-none`}
              style={{
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)'
              }}
            >
              <span className="tabular-nums">{displayProcessed}</span>
              <span className="opacity-70">/</span>
              <span className="opacity-70 tabular-nums">{displayTotal}</span>
              <span className="ml-1 opacity-85 tabular-nums">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Right: Compact 3D Progress Bar */}
          <div className="flex-1 h-[6px] ml-2 rounded-full overflow-hidden relative"
            style={{
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%)',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.6), 0 0.5px 1px rgba(255, 255, 255, 0.1)',
              border: '0.5px solid rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Progress Fill with 3D Gradient and Glow */}
            <div 
              className={`h-full bg-gradient-to-r ${colors.progress} transition-all duration-500 ease-out rounded-full relative overflow-hidden`}
              style={{ 
                width: `${progress}%`,
                boxShadow: `
                  0 0 6px rgba(99, 102, 241, 0.7),
                  0 0 12px rgba(99, 102, 241, 0.5),
                  inset 0 0.5px 0 rgba(255, 255, 255, 0.3),
                  inset 0 -0.5px 0 rgba(0, 0, 0, 0.3)
                `,
                animation: progress > 0 && progress < 100 ? 'pulse-glow-compact 2s ease-in-out infinite' : 'none'
              }}
            >
              {/* Animated Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_1.5s_infinite]"></div>
              
              {/* Compact Progress Indicator Dot */}
              {progress > 0 && progress < 100 && (
                <div 
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                  style={{
                    boxShadow: '0 0 4px rgba(255, 255, 255, 0.9), 0 0 8px rgba(99, 102, 241, 0.7)'
                  }}
                ></div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Border Glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>

      {/* Add CSS animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulse-glow-compact {
          0%, 100% { 
            box-shadow: 0 0 6px rgba(99, 102, 241, 0.7),
                        0 0 12px rgba(99, 102, 241, 0.5),
                        inset 0 0.5px 0 rgba(255, 255, 255, 0.3);
          }
          50% { 
            box-shadow: 0 0 8px rgba(99, 102, 241, 0.9),
                        0 0 16px rgba(99, 102, 241, 0.7),
                        inset 0 0.5px 0 rgba(255, 255, 255, 0.4);
          }
        }
      `}</style>
    </div>
  );
}
