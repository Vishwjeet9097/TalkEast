import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Language } from '../types';
import { ArrowRight, Check, Globe, Play, Sparkles, Languages, BookOpen, Mic, BrainCircuit } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => Promise<void> | void;
}

// Language configuration with emojis and descriptions
const LANGUAGE_CONFIG: Record<Language, { emoji: string; nativeName: string; description: string }> = {
  [Language.ENGLISH]: { emoji: '🇬🇧', nativeName: 'English', description: 'Global communication' },
  [Language.HINDI]: { emoji: '🇮🇳', nativeName: 'हिन्दी', description: 'भारत की भाषा' },
  [Language.JAPANESE]: { emoji: '🇯🇵', nativeName: '日本語', description: 'Rich culture & tradition' },
  [Language.KOREAN]: { emoji: '🇰🇷', nativeName: '한국어', description: 'K-pop & modern culture' },
  [Language.CHINESE]: { emoji: '🇨🇳', nativeName: '中文', description: 'Ancient wisdom & business' },
};

// Speech Bubbles Illustration - Reference Style
const SpeechBubblesIllustration = () => {
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg 
        viewBox="0 0 400 300" 
        className="w-full h-full max-w-md"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients matching theme */}
          <linearGradient id="bubbleGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          
          <linearGradient id="bubbleGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          
          {/* Animation styles */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            .float-animation {
              animation: float 3s ease-in-out infinite;
            }
            .float-animation-delay {
              animation: float 3s ease-in-out infinite;
              animation-delay: 1.5s;
            }
          `}</style>
        </defs>
        
        {/* Decorative Elements - Left side (Indigo theme) */}
        <g opacity={isDark ? 0.4 : 0.6}>
          {/* Circles */}
          <circle cx="70" cy="50" r="8" fill="#6366f1" />
          <circle cx="50" cy="90" r="6" fill="#9333ea" />
          <circle cx="90" cy="110" r="7" fill="#6366f1" />
          <circle cx="40" cy="130" r="5" fill="#9333ea" />
          
          {/* X marks */}
          <g transform="translate(65, 75)">
            <line x1="-4" y1="-4" x2="4" y2="4" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="4" y1="-4" x2="-4" y2="4" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g transform="translate(80, 140)">
            <line x1="-3" y1="-3" x2="3" y2="3" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="3" y1="-3" x2="-3" y2="3" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </g>
        
        {/* Left Speech Bubble - Indigo */}
        <g className="float-animation" transform="translate(0, 0)">
          <rect 
            x="100" 
            y="80" 
            width="110" 
            height="110" 
            rx="24" 
            fill="url(#bubbleGradient1)"
            style={{ 
              filter: 'drop-shadow(0 10px 20px rgba(99, 102, 241, 0.35))',
            }}
          />
          <text 
            x="155" 
            y="150" 
            textAnchor="middle" 
            fontSize="80" 
            fill="white"
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
            style={{ textRendering: 'optimizeLegibility' }}
          >
            A
          </text>
        </g>
        
        {/* Decorative Elements - Right side (Orange theme) */}
        <g opacity={isDark ? 0.4 : 0.6}>
          {/* Circles */}
          <circle cx="310" cy="50" r="8" fill="#f59e0b" />
          <circle cx="330" cy="90" r="6" fill="#f97316" />
          <circle cx="290" cy="110" r="7" fill="#f59e0b" />
          <circle cx="340" cy="130" r="5" fill="#f97316" />
          
          {/* X marks */}
          <g transform="translate(305, 75)">
            <line x1="-4" y1="-4" x2="4" y2="4" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="4" y1="-4" x2="-4" y2="4" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g transform="translate(320, 140)">
            <line x1="-3" y1="-3" x2="3" y2="3" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="3" y1="-3" x2="-3" y2="3" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </g>
        
        {/* Right Speech Bubble - Orange */}
        <g className="float-animation-delay" transform="translate(0, 0)">
          <rect 
            x="190" 
            y="80" 
            width="110" 
            height="110" 
            rx="24" 
            fill="url(#bubbleGradient2)"
            style={{ 
              filter: 'drop-shadow(0 10px 20px rgba(245, 158, 11, 0.35))',
            }}
          />
          <text 
            x="245" 
            y="150" 
            textAnchor="middle" 
            fontSize="70" 
            fill="white"
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
            style={{ textRendering: 'optimizeLegibility' }}
          >
            文
          </text>
        </g>
      </svg>
    </div>
  );
};

// Professional Language Learning SVG Illustration Component
const LanguageLearningIllustration = () => {
  // Detect dark mode with state to track changes
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  
  React.useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <svg 
      viewBox="0 0 360 320" 
      className="w-full h-full object-contain"
      style={{ maxHeight: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradient definitions matching app theme */}
        <linearGradient id="globeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#9333ea" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.7" />
        </linearGradient>
        
        <linearGradient id="bubbleGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#9333ea" stopOpacity="0.25" />
        </linearGradient>
        
        <linearGradient id="bubbleGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.25" />
        </linearGradient>
        
        <linearGradient id="bubbleGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.25" />
        </linearGradient>
        
        <radialGradient id="glowGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
        
        {/* Animation for floating elements */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .float-animation {
            animation: float 3s ease-in-out infinite;
          }
          .float-animation-delay {
            animation: float 3s ease-in-out infinite;
            animation-delay: 1s;
          }
          .pulse-animation {
            animation: pulse 2s ease-in-out infinite;
          }
        `}</style>
      </defs>
      
      {/* Background glow effect - Subtle */}
      <circle cx="180" cy="160" r="120" fill="url(#glowGradient)" className="pulse-animation" opacity={isDark ? 0.4 : 0.3} />
      
      {/* Central Globe - Main focal point - Simplified */}
      <g className="float-animation" transform="translate(180, 160)">
        {/* Globe base circle */}
        <circle 
          cx="0" 
          cy="0" 
          r="70" 
          fill="url(#globeGradient)" 
          opacity={isDark ? 0.95 : 1}
          style={{ filter: 'drop-shadow(0 8px 24px rgba(99, 102, 241, 0.25))' }}
        />
        
        {/* Simplified Globe grid lines (longitude) */}
        {[0, 2, 4].map((i) => {
          return (
            <ellipse
              key={`long-${i}`}
              cx="0"
              cy="0"
              rx="70"
              ry="35"
              fill="none"
              stroke="rgba(255, 255, 255, 0.35)"
              strokeWidth="1.5"
              transform={`rotate(${i * 60})`}
            />
          );
        })}
        
        {/* Simplified Globe grid lines (latitude) */}
        {[-45, 0, 45].map((lat) => {
          const radius = 70 * Math.cos((lat * Math.PI) / 180);
          const y = 70 * Math.sin((lat * Math.PI) / 180);
          return (
            <line
              key={`lat-${lat}`}
              x1={-radius}
              y1={y}
              x2={radius}
              y2={y}
              stroke="rgba(255, 255, 255, 0.35)"
              strokeWidth="1.5"
            />
          );
        })}
        
        {/* Globe highlight */}
        <ellipse
          cx="-18"
          cy="-18"
          rx="25"
          ry="18"
          fill="rgba(255, 255, 255, 0.25)"
        />
      </g>
      
      {/* Speech bubbles with language symbols - Cleaner and better positioned */}
      
      {/* Top-left bubble - Japanese */}
      <g className="float-animation-delay" transform="translate(70, 65)">
        <ellipse 
          cx="0" 
          cy="0" 
          rx="42" 
          ry="32" 
          fill="url(#bubbleGradient1)"
          opacity={isDark ? 0.85 : 1}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.2))' }}
        />
        <ellipse 
          cx="0" 
          cy="0" 
          rx="38" 
          ry="28" 
          fill={isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
        />
        <text 
          x="0" 
          y="6" 
          textAnchor="middle" 
          fontSize="26" 
          fill={isDark ? 'rgba(255, 255, 255, 0.95)' : '#1e293b'}
          fontWeight="500"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ textRendering: 'optimizeLegibility' }}
        >
          日本語
        </text>
        {/* Speech bubble tail */}
        <path 
          d="M 12 22 Q 20 26 16 30 L 8 26 Z" 
          fill="url(#bubbleGradient1)"
          opacity={isDark ? 0.85 : 1}
        />
      </g>
      
      {/* Top-right bubble - Korean */}
      <g className="float-animation" transform="translate(290, 75)">
        <ellipse 
          cx="0" 
          cy="0" 
          rx="42" 
          ry="32" 
          fill="url(#bubbleGradient2)"
          opacity={isDark ? 0.85 : 1}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(147, 51, 234, 0.2))' }}
        />
        <ellipse 
          cx="0" 
          cy="0" 
          rx="38" 
          ry="28" 
          fill={isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
        />
        <text 
          x="0" 
          y="6" 
          textAnchor="middle" 
          fontSize="22" 
          fill={isDark ? 'rgba(255, 255, 255, 0.95)' : '#1e293b'}
          fontWeight="500"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ textRendering: 'optimizeLegibility' }}
        >
          한국어
        </text>
        {/* Speech bubble tail */}
        <path 
          d="M -12 22 Q -20 26 -16 30 L -8 26 Z" 
          fill="url(#bubbleGradient2)"
          opacity={isDark ? 0.85 : 1}
        />
      </g>
      
      {/* Bottom-left bubble - Chinese */}
      <g className="float-animation-delay" transform="translate(65, 255)">
        <ellipse 
          cx="0" 
          cy="0" 
          rx="42" 
          ry="32" 
          fill="url(#bubbleGradient3)"
          opacity={isDark ? 0.85 : 1}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(236, 72, 153, 0.2))' }}
        />
        <ellipse 
          cx="0" 
          cy="0" 
          rx="38" 
          ry="28" 
          fill={isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
        />
        <text 
          x="0" 
          y="6" 
          textAnchor="middle" 
          fontSize="24" 
          fill={isDark ? 'rgba(255, 255, 255, 0.95)' : '#1e293b'}
          fontWeight="500"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ textRendering: 'optimizeLegibility' }}
        >
          中文
        </text>
        {/* Speech bubble tail */}
        <path 
          d="M 12 22 Q 20 26 16 30 L 8 26 Z" 
          fill="url(#bubbleGradient3)"
          opacity={isDark ? 0.85 : 1}
        />
      </g>
      
      {/* Bottom-right bubble - Hindi */}
      <g className="float-animation" transform="translate(295, 245)">
        <ellipse 
          cx="0" 
          cy="0" 
          rx="42" 
          ry="32" 
          fill="url(#bubbleGradient1)"
          opacity={isDark ? 0.85 : 1}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.2))' }}
        />
        <ellipse 
          cx="0" 
          cy="0" 
          rx="38" 
          ry="28" 
          fill={isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
        />
        <text 
          x="0" 
          y="6" 
          textAnchor="middle" 
          fontSize="22" 
          fill={isDark ? 'rgba(255, 255, 255, 0.95)' : '#1e293b'}
          fontWeight="500"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ textRendering: 'optimizeLegibility' }}
        >
          हिन्दी
        </text>
        {/* Speech bubble tail */}
        <path 
          d="M -12 22 Q -20 26 -16 30 L -8 26 Z" 
          fill="url(#bubbleGradient1)"
          opacity={isDark ? 0.85 : 1}
        />
      </g>
      
      {/* Subtle connection lines from bubbles to globe */}
      <g opacity={isDark ? 0.25 : 0.15} strokeWidth="1.5">
        <line x1="112" y1="97" x2="130" y2="135" stroke="#6366f1" strokeDasharray="3,3" />
        <line x1="248" y1="107" x2="230" y2="135" stroke="#9333ea" strokeDasharray="3,3" />
        <line x1="107" y1="223" x2="130" y2="195" stroke="#ec4899" strokeDasharray="3,3" />
        <line x1="253" y1="213" x2="230" y2="195" stroke="#6366f1" strokeDasharray="3,3" />
      </g>
      
      {/* Decorative stars/sparkles - Reduced and better positioned */}
      {[
        { x: 45, y: 45, delay: '0s' },
        { x: 315, y: 50, delay: '0.6s' },
        { x: 50, y: 275, delay: '1.2s' },
        { x: 310, y: 270, delay: '0.3s' }
      ].map((star, i) => (
        <g key={`star-${i}`} opacity={isDark ? 0.7 : 0.5} className="pulse-animation" style={{ animationDelay: star.delay }}>
          <circle cx={star.x} cy={star.y} r="2.5" fill="#6366f1" />
          <circle cx={star.x} cy={star.y} r="1.2" fill={isDark ? '#e0e7ff' : '#ffffff'} />
        </g>
      ))}
    </svg>
  );
};

export default function Onboarding({ onComplete }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // Start with welcome page
  const [native, setNative] = useState<Language>(Language.ENGLISH);
  const [target, setTarget] = useState<Language>(Language.JAPANESE);

  const handleFinish = async () => {
    await onComplete({
      nativeLanguage: native,
      targetLanguage: target,
      onboardingComplete: true,
      theme: 'light',
      useEnvKey: true
    });
    navigate('/dashboard', { replace: true });
  };

  // Welcome Page (Step 0) - Enhanced Design
  if (step === 0) {
    return (
      <div className="fixed inset-0 h-screen w-screen flex flex-col relative overflow-hidden bg-white dark:bg-slate-900" style={{ minHeight: '100vh', height: '100vh' }}>
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        {/* Top White Section with Illustration */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-8 md:pt-12 pb-4 z-10">
          {/* Speech Bubbles Illustration with Fade In */}
          <div 
            className="relative w-full max-w-sm md:max-w-md lg:max-w-lg flex items-center justify-center fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <SpeechBubblesIllustration />
          </div>
        </div>

        {/* Curved Bottom Section with Gradient - Enhanced */}
        <div 
          className="relative flex-shrink-0 w-full px-6 md:px-8 z-10"
          style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 50%, #ec4899 100%)',
            borderTopLeftRadius: '48px',
            borderTopRightRadius: '48px',
            paddingTop: '52px',
            paddingBottom: '36px',
            minHeight: '45vh'
          }}
        >
          {/* Decorative Top Border Glow */}
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
            }}
          ></div>

          {/* Text Content - Enhanced with Animations */}
          <div className="text-center space-y-2 md:space-y-3 mb-10 md:mb-12">
            <p 
              className="text-indigo-200 text-base md:text-lg lg:text-xl font-normal italic fade-in slide-in-from-bottom-4"
              style={{ 
                fontFamily: 'Georgia, serif', 
                fontStyle: 'italic',
                animationDelay: '0.3s',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              Let's Break
            </p>
            <p 
              className="text-indigo-100 text-xl md:text-2xl lg:text-3xl font-bold tracking-wider uppercase fade-in slide-in-from-bottom-4"
              style={{ 
                animationDelay: '0.4s',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
            >
              THE BARRIERS OF
            </p>
            <h1 
              className="text-white text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold uppercase tracking-tight leading-tight fade-in slide-in-from-bottom-4"
              style={{ 
                animationDelay: '0.5s',
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
              }}
            >
              LANGUAGE
            </h1>
          </div>

          {/* Enhanced Circular CTA Button */}
          <div className="flex justify-end pr-2 md:pr-4">
            <button
              onClick={() => setStep(1)}
              className="group w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 relative overflow-hidden fade-in"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
                animationDelay: '0.6s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(245, 158, 11, 0.5), 0 0 0 8px rgba(245, 158, 11, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.4)';
              }}
            >
              {/* Animated Ripple Effect */}
              <div 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              ></div>
              
              {/* Button Glow on Hover */}
              <div 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                }}
              ></div>
              
              {/* Enhanced Arrow Icon - Using Lucide Icon */}
              <ArrowRight 
                className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white relative z-10 transform rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" 
                strokeWidth={3}
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                }}
              />
              
              {/* Click Ripple Effect */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-30 group-active:animate-ping"></div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Language Selection Pages
  return (
    <div className="fixed inset-0 h-screen w-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/20" style={{ minHeight: '100vh', height: '100vh' }}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col px-6 py-8 md:py-12 md:px-8">
        {/* Progress Indicator - Top */}
        <div className="mb-6 md:mb-8 flex-shrink-0 flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s 
                      ? 'w-8' 
                      : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                  style={
                    step >= s
                      ? {
                          background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
                          boxShadow: '0 0 8px rgba(245, 158, 11, 0.6), 0 0 16px rgba(245, 158, 11, 0.4)',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        }
                      : {}
                  }
                />
              ))}
            </div>
            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
              Step {step} of 2
            </p>
          </div>
        </div>

        {/* Language Selection Content - Centered */}
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          {step === 1 && (
            <div className="space-y-6 md:space-y-8 w-full max-w-md mx-auto">
              {/* Header - Centered */}
              <div className="space-y-3 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <Languages className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white">
                  I speak...
                </h2>
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-normal">
                  Select your native language
                </p>
              </div>

              {/* Language Options */}
              <div className="space-y-4 md:space-y-5">
                {[Language.ENGLISH, Language.HINDI].map((lang) => {
                  const config = LANGUAGE_CONFIG[lang];
                  const isSelected = native === lang;
                  
                  return (
                    <button
                      key={lang}
                      onClick={() => setNative(lang)}
                      className={`w-full p-4 md:p-5 rounded-2xl flex items-center justify-between transition-all duration-300 group text-left ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`text-3xl md:text-4xl transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {config.emoji}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-base md:text-lg mb-0.5">
                            {config.nativeName}
                          </div>
                          <div className={`text-xs md:text-sm font-normal ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            {config.description}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Next Button - Purple Glass Effect 3D */}
              <button
                onClick={() => setStep(2)}
                className="w-full py-4 md:py-5 rounded-2xl font-semibold text-base md:text-lg shadow-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group relative overflow-hidden mt-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(147, 51, 234, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(147, 51, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 8px rgba(0, 0, 0, 0.1)',
                  transform: 'perspective(1000px) translateZ(0)',
                }}
              >
                {/* 3D Effect Overlay */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)',
                    transform: 'translateZ(10px)',
                  }}
                ></div>
                
                <span className="relative z-10 text-white">Continue</span>
                <ArrowRight className="w-5 h-5 relative z-10 text-white group-hover:translate-x-1 transition-transform" />
                
                {/* Hover Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                    filter: 'blur(10px)',
                  }}
                ></div>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 md:space-y-8 w-full max-w-md mx-auto">
              {/* Header - Centered */}
              <div className="space-y-3 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                  <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white">
                  I want to learn...
                </h2>
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-normal">
                  Choose your target language
                </p>
              </div>

              {/* Language Options */}
              <div className="space-y-4 md:space-y-5">
                {[Language.JAPANESE, Language.KOREAN, Language.CHINESE].map((lang) => {
                  const config = LANGUAGE_CONFIG[lang];
                  const isSelected = target === lang;
                  
                  return (
                    <button
                      key={lang}
                      onClick={() => setTarget(lang)}
                      className={`w-full p-4 md:p-5 rounded-2xl flex items-center justify-between transition-all duration-300 group text-left ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`text-3xl md:text-4xl transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {config.emoji}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-base md:text-lg mb-0.5">
                            {config.nativeName}
                          </div>
                          <div className={`text-xs md:text-sm font-normal ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            {config.description}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Get Started Button - Purple Glass Effect 3D */}
              <button
                onClick={handleFinish}
                className="w-full py-4 md:py-5 rounded-2xl font-semibold text-base md:text-lg shadow-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group relative overflow-hidden mt-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(147, 51, 234, 0.9) 50%, rgba(219, 39, 119, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(147, 51, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 8px rgba(0, 0, 0, 0.1)',
                  transform: 'perspective(1000px) translateZ(0)',
                }}
              >
                {/* 3D Effect Overlay */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)',
                    transform: 'translateZ(10px)',
                  }}
                ></div>
                
                <Sparkles className="w-5 h-5 relative z-10 text-white group-hover:rotate-12 transition-transform" />
                <span className="relative z-10 text-white">Get Started</span>
                <ArrowRight className="w-5 h-5 relative z-10 text-white group-hover:translate-x-1 transition-transform" />
                
                {/* Hover Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                    filter: 'blur(10px)',
                  }}
                ></div>
              </button>

              {/* Back Button */}
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-normal text-sm md:text-base mt-2"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
