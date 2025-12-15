import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Mic, MicOff, MessageSquare } from 'lucide-react';
import { UserProfile } from '../types';
import LiveVoiceModal from './LiveVoiceModal';

interface FloatingAIWidgetProps {
  profile: UserProfile | null;
}

export default function FloatingAIWidget({ profile }: FloatingAIWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const widgetRef = useRef<HTMLButtonElement>(null);

  // Pulse animation when active
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        // Visual pulse effect
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const handleWidgetClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsActive(false);
  };

  return (
    <>
      {/* Floating Widget */}
      <button
        ref={widgetRef}
        onClick={handleWidgetClick}
        className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          isActive
            ? 'bg-indigo-600 dark:bg-indigo-500 text-white animate-pulse shadow-indigo-500/50'
            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-slate-900/30 dark:shadow-slate-100/30'
        }`}
        style={{
          marginBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <Sparkles 
          size={24} 
          className={isActive ? 'animate-pulse' : ''}
        />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <LiveVoiceModal
          profile={profile}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onActiveChange={setIsActive}
        />
      )}
    </>
  );
}

