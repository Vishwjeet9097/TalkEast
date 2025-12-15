import React from 'react';
import { Plus, Send, Save } from 'lucide-react';

interface ChatFooterProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSave?: () => void;
  isLoading?: boolean;
  hasMessages?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyPress?: (e: React.KeyboardEvent) => void;
}

export default function ChatFooter({
  inputValue,
  onInputChange,
  onSend,
  onSave,
  isLoading = false,
  hasMessages = false,
  placeholder = 'Ask about language...',
  inputRef,
  onKeyPress,
}: ChatFooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      {/* Glass blur effect for outer area */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl -z-10"></div>
      
      <div className="max-w-md mx-auto px-5 pb-[env(safe-area-inset-bottom)] pt-3">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/60 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <button
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
            >
              <Plus size={18} className="text-slate-600 dark:text-slate-400" strokeWidth={2.5} />
            </button>
            
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder={placeholder}
              className="flex-1 h-10 px-4 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
              disabled={isLoading}
            />
            
            <button
              onClick={onSend}
              disabled={!inputValue.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} className="text-white" strokeWidth={2.5} />
            </button>
          </div>

          {/* Save chat button */}
          {hasMessages && onSave && (
            <div className="px-2 pt-2">
              <button
                onClick={onSave}
                className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Save size={12} />
                <span>Save chat</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

