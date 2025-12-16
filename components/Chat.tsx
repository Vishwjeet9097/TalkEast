import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { Plus, Send, Save, Bot, Sparkles } from 'lucide-react';
import { getApiKeyForProfile } from '../services/gemini';
import { GoogleGenAI } from '@google/genai';
import { db } from '../services/storage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  expandedContent?: string;
  isExpanded?: boolean;
}

export default function Chat({ profile }: { profile: UserProfile | null }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [expandingMessageId, setExpandingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple suggestion pills (max 3)
  const getSuggestions = () => {
    const targetLang = profile?.targetLanguage || 'Japanese';
    const suggestions: Record<string, string[]> = {
      'Japanese': [
        'How do I say "Hello" in Japanese?',
        'Explain the difference between は and が',
        'Give me 5 essential phrases for daily life'
      ],
      'Korean': [
        'How do I say "Thank you" in Korean?',
        'Explain Korean honorifics (존댓말)',
        'Teach me common K-pop phrases'
      ],
      'Chinese': [
        'How do I say "Hello" in Chinese?',
        'Explain Chinese tones (声调)',
        'Give me essential business Chinese phrases'
      ],
    };
    return suggestions[targetLang] || suggestions['Japanese'];
  };

  const suggestions = getSuggestions();

  // Improved scrolling - scroll to bottom when new messages arrive
  useEffect(() => {
    // Use setTimeout to ensure DOM is updated
    const timer = setTimeout(() => {
      if (messagesEndRef.current && messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const scrollTop = container.scrollTop;
        
        // Only auto-scroll if user is near bottom (within 100px)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        if (isNearBottom || messages.length <= 2) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || inputValue.trim();
    if (!messageToSend || isLoading || !profile) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageToSend,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customMessage) setInputValue('');
    setIsLoading(true);

    try {
      const apiKey = getApiKeyForProfile(profile);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
          {
            role: 'user',
            parts: [{ 
              text: `You are an expert language learning tutor for ${profile.targetLanguage}. The student's native language is ${profile.nativeLanguage}. 
              
IMPORTANT: Keep your response SHORT and CONCISE (2-4 sentences maximum). Be direct and helpful. Save detailed explanations for when the student asks for more.
              
Provide clear, helpful, and encouraging responses. Use examples when explaining grammar or vocabulary, but keep examples brief.
              
Question: ${userMessage.content}` 
            }],
          },
        ],
      });

      const response = await model;
      let text = '';
      
      // Handle different response structures
      if (response && typeof response === 'object') {
        // Try response.text first (direct property)
        if (response.text) {
          text = response.text;
        }
        // Try response.response.candidates (nested structure)
        else if ((response as any).response?.candidates) {
          const candidates = (response as any).response.candidates;
          if (candidates && candidates.length > 0) {
            const content = candidates[0].content;
            if (content && content.parts) {
              text = content.parts.map((p: any) => p.text || '').join('');
            }
          }
        }
        // Try candidates directly
        else if ((response as any).candidates) {
          const candidates = (response as any).candidates;
          if (candidates && candidates.length > 0) {
            const content = candidates[0].content;
            if (content && content.parts) {
              text = content.parts.map((p: any) => p.text || '').join('');
            }
          }
        }
      }
      
      if (!text) {
        text = 'Sorry, I could not generate a response. Please try again.';
      }
      
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        isExpanded: false,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, there was an error. Please check your API key or try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToNotes = async () => {
    if (messages.length === 0) return;

    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'You' : 'AI Tutor'}: ${m.content}`)
      .join('\n\n');

    const note = {
      id: crypto.randomUUID(),
      title: `Chat - ${profile?.targetLanguage} Practice - ${new Date().toLocaleDateString()}`,
      content: conversationText,
      createdAt: Date.now(),
      tags: ['Chat', 'AI', profile?.targetLanguage || 'Language'],
    };

    await db.saveNote(note);
    
    // Show toast using React state
    setShowToast(true);
    
    // Clear existing timeout if any
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Hide toast after 3 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExplainMore = async (messageId: string, originalContent: string) => {
    if (!profile || expandingMessageId === messageId) return;
    
    setExpandingMessageId(messageId);
    
    try {
      const apiKey = getApiKeyForProfile(profile);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ 
              text: `You are an expert language learning tutor for ${profile.targetLanguage}. The student's native language is ${profile.nativeLanguage}. 
              
The student asked a question and you gave this brief answer: "${originalContent}"
              
Now provide a MORE DETAILED and COMPREHENSIVE explanation. Include:
- More examples (3-5 examples)
- Grammar rules if applicable
- Common mistakes to avoid
- Usage tips
- Cultural context if relevant
              
Make it thorough but well-organized.` 
            }],
          },
        ],
      });

      const response = await model;
      let expandedText = '';
      
      // Handle different response structures
      if (response && typeof response === 'object') {
        // Try response.text first (direct property)
        if (response.text) {
          expandedText = response.text;
        }
        // Try response.response.candidates (nested structure)
        else if ((response as any).response?.candidates) {
          const candidates = (response as any).response.candidates;
          if (candidates && candidates.length > 0) {
            const content = candidates[0].content;
            if (content && content.parts) {
              expandedText = content.parts.map((p: any) => p.text || '').join('');
            }
          }
        }
        // Try candidates directly
        else if ((response as any).candidates) {
          const candidates = (response as any).candidates;
          if (candidates && candidates.length > 0) {
            const content = candidates[0].content;
            if (content && content.parts) {
              expandedText = content.parts.map((p: any) => p.text || '').join('');
            }
          }
        }
      }
      
      if (!expandedText) {
        expandedText = 'Could not generate expanded explanation. Please try again.';
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, expandedContent: expandedText, isExpanded: true }
          : msg
      ));
    } catch (error) {
      console.error('Error expanding message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, expandedContent: 'Sorry, could not generate expanded explanation. Please try again.', isExpanded: true }
          : msg
      ));
    } finally {
      setExpandingMessageId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen relative">
      {/* Fixed Background - maintains consistent gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 -z-10"></div>
      
      {/* Main Content - with padding for global header and footer */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 pt-[calc(5rem+env(safe-area-inset-top))] pb-36 scroll-smooth relative z-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] -mt-8">
            {/* Hero Greeting Card - Enhanced */}
            <div 
              className="glass-panel rounded-3xl p-8 md:p-10 mb-8 max-w-md w-full text-center relative overflow-hidden group"
              style={{ boxShadow: 'none' }}
            >
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                {/* Enhanced Bot Icon */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mx-auto mb-4 md:mb-5 shadow-lg shadow-indigo-500/30 animate-float">
                  <Bot size={32} className="md:w-9 md:h-9 text-white" strokeWidth={2.5} />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-2 md:mb-3 tracking-tight">
                  Hi, {profile?.nativeLanguage === 'Hindi' ? 'नमस्ते' : 'there'}! 👋
                </h2>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200 mb-3 md:mb-4">
                  Ready to learn <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">{profile?.targetLanguage || 'a new language'}</span>?
                </h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed px-2">
                  Ask me anything about {profile?.targetLanguage || 'your target language'}. I'm here to help you master it!
                </p>
              </div>
            </div>

            {/* Small Pill Style Suggestions */}
            {suggestions.length > 0 && (
              <div className="w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center mb-2">
                  Try These Questions
                </p>
                <div className="flex flex-wrap gap-2 justify-center px-2">
                  {suggestions.slice(0, 3).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(suggestion)}
                      className="group px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 active:scale-95 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm hover:shadow-md"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto pt-2">
            {messages.map((message, idx) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Enhanced Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                    : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {message.role === 'user' ? (
                    <span className="text-xs md:text-sm font-bold">You</span>
                  ) : (
                    <Bot size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                  )}
                </div>

                {/* Enhanced Message Bubble */}
                <div className={`flex-1 max-w-[80%] md:max-w-[85%] ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 md:px-5 md:py-3.5 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-indigo-500/20'
                        : 'glass-panel text-slate-900 dark:text-slate-100 border border-white/60 dark:border-slate-700/50'
                    }`}
                  >
                    <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                      {message.content}
                    </p>
                    
                    {/* Expanded Content */}
                    {message.isExpanded && message.expandedContent && (
                      <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                          Detailed Explanation
                        </p>
                        <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-normal text-slate-700 dark:text-slate-300">
                          {message.expandedContent}
                        </p>
                      </div>
                    )}
                    
                    {/* Explain More Button - Only for assistant messages */}
                    {message.role === 'assistant' && !message.isExpanded && (
                      <button
                        onClick={() => handleExplainMore(message.id, message.content)}
                        disabled={expandingMessageId === message.id}
                        className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {expandingMessageId === message.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Expanding...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            <span>Explain More</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center shadow-sm">
                  <Bot size={16} className="md:w-[18px] md:h-[18px] text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
                </div>
                <div className="glass-panel rounded-2xl px-4 py-3 md:px-5 md:py-4 border border-white/60 dark:border-slate-700/50 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-medium">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Enhanced Input Bar - Fixed above bottom nav */}
      <div className="fixed bottom-28 left-0 right-0 z-40 md:hidden">
        <div className="max-w-md mx-auto px-4">
          <div className="glass-panel rounded-3xl p-2.5 shadow-xl border border-white/60 dark:border-slate-700/50 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
                title="Attach"
              >
                <Plus size={16} className="text-slate-600 dark:text-slate-400" strokeWidth={2.5} />
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask about ${profile?.targetLanguage || 'language'}...`}
                className="flex-1 h-10 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 transition-all text-sm font-medium shadow-sm"
                disabled={isLoading}
              />
              
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center hover:from-indigo-500 hover:to-violet-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 disabled:shadow-none"
              >
                <Send size={16} className="text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Enhanced Save to Notes Button */}
            {messages.length > 0 && (
              <div className="px-2 pt-2.5 mt-1">
                <button
                  onClick={handleSaveToNotes}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                >
                  <Save size={13} />
                  <span>Save chat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Desktop Input Bar */}
      <div className="hidden md:block sticky bottom-0 z-30 glass-panel border-t border-white/60 dark:border-slate-800/50 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] pt-4">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex items-center gap-2.5">
            <button
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
              title="Attach"
            >
              <Plus size={18} className="text-slate-600 dark:text-slate-400" strokeWidth={2.5} />
            </button>
            
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask about ${profile?.targetLanguage || 'language'}...`}
              className="flex-1 h-11 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 transition-all text-sm font-medium shadow-sm"
              disabled={isLoading}
            />
            
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center hover:from-indigo-500 hover:to-violet-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 disabled:shadow-none"
            >
              <Send size={18} className="text-white" strokeWidth={2.5} />
            </button>
          </div>

          {messages.length > 0 && (
            <div className="px-2 pt-2.5 mt-1">
              <button
                onClick={handleSaveToNotes}
                className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
              >
                <Save size={13} />
                <span>Save chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification - React-based */}
      {showToast && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 glass-panel text-slate-900 dark:text-white px-6 py-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 border border-white/60 dark:border-slate-700/50 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="font-semibold text-sm">Conversation saved to Notes!</span>
          </div>
        </div>
      )}
    </div>
  );
}
