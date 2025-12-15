import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical } from 'lucide-react';

export default function ChatHeader() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors active:scale-95"
        >
          <ArrowLeft size={20} className="text-slate-700 dark:text-slate-300" strokeWidth={2.5} />
        </button>
        
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Chat</h1>
        
        <button
          className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors active:scale-95"
        >
          <MoreVertical size={20} className="text-slate-700 dark:text-slate-300" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}

