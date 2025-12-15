import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  error: Error | string;
  onDismiss?: () => void;
  onRetry?: () => void;
  type?: 'error' | 'warning' | 'info';
}

export default function ErrorDisplay({ 
  error, 
  onDismiss, 
  onRetry,
  type = 'error' 
}: ErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
    }
  }, [error]);

  if (!error || !isVisible) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  
  const colors = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
      button: 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
      button: 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50'
    }
  };

  const colorScheme = colors[type];

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full mx-4 animate-in slide-in-from-top-4 duration-300`}>
      <div className={`${colorScheme.bg} ${colorScheme.border} border-2 rounded-xl p-4 shadow-2xl backdrop-blur-xl`}>
        <div className="flex items-start gap-3">
          <div className={`${colorScheme.icon} shrink-0 mt-0.5`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${colorScheme.text} font-medium text-sm leading-relaxed break-words`}>
              {errorMessage}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className={`${colorScheme.button} mt-3 px-4 py-2 rounded-lg text-xs font-bold ${colorScheme.text} transition-all flex items-center gap-2`}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className={`${colorScheme.icon} hover:opacity-70 transition-opacity shrink-0`}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

