import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BrainCircuit, Plus, PenTool, Sparkles } from 'lucide-react';

export default function AppFooter() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: BrainCircuit, label: 'Practice', path: '/practice' },
    { icon: Plus, label: 'Create', path: '/upload', special: true },
    { icon: PenTool, label: 'Notes', path: '/notes' },
    { icon: Sparkles, label: 'Ask with AI', path: '/chat' },
  ];

  if (location.pathname === '/onboarding') return null;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/60 dark:border-slate-800/50 backdrop-blur-xl rounded-t-3xl py-2.5 pb-[calc(0.64rem+env(safe-area-inset-bottom))] md:hidden">
      {/* Full width navigation bar - no inner container, no margins */}
      <div className="w-full px-4 flex justify-between items-center">
        {navItems.map((item) => {
          const active = isActive(item.path);
          
          if (item.special) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative -top-[33.48px] w-[61.6px] h-[61.6px] rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 transition-transform active:scale-95 ${
                  active ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'bg-indigo-600 text-white'
                }`}
              >
                <Plus size={31} strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col items-center gap-0.5 py-0.5 rounded-2xl transition-all duration-200 group relative"
            >
              <div className={`p-1.5 rounded-2xl transition-all duration-300 ${
                active 
                  ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' 
                  : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
              }`}>
                <item.icon size={20} strokeWidth={active ? 2.5 : 2} fill={active ? "currentColor" : "none"} className={active ? "opacity-100" : "opacity-80"} />
              </div>
              {/* Label text below icon */}
              <span className={`text-[9px] font-semibold leading-tight transition-colors ${
                active 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}

