
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

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[35] transition-all duration-300 bg-indigo-500/95 backdrop-blur-sm"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        height: '10px',
        maxHeight: '10px'
      }}
      onClick={handleClick}
    >
      <div className="max-w-md mx-auto md:max-w-5xl px-6 h-full flex items-center justify-between cursor-pointer">
        {/* Data Count and Percentage */}
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-white leading-none">
          <span>{displayProcessed}</span>
          <span className="opacity-70">/</span>
          <span className="opacity-70">{displayTotal}</span>
          <span className="ml-1 opacity-80">{progress}%</span>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 h-full bg-black/20 dark:bg-black/30 ml-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-400 dark:bg-indigo-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
