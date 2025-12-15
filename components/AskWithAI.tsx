import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile } from '../types';
import { Plus, Send } from 'lucide-react';
import { getApiKeyForProfile } from '../services/gemini';
import { GoogleGenAI } from '@google/genai';
import { searchWordMeaning } from '../services/gemini';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface PopularIdea {
  id: string;
  icon: string;
  title: string;
}

export default function AskWithAI({ profile }: { profile: UserProfile | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get initial query from location state
  useEffect(() => {
    const state = location.state as { query?: string } | null;
    if (state?.query) {
      setInputValue(state.query);
      inputRef.current?.focus();
    }
  }, [location]);

  const popularIdeas: PopularIdea[] = [
    { id: '1', icon: 'UX', title: 'Mobile app design' },
    { id: '2', icon: 'Fi', title: 'Mobile app design' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !profile) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Try word search first (if it looks like a single word)
      if (query.split(/\s+/).length === 1) {
        try {
          const result = await searchWordMeaning(
            query,
            profile.nativeLanguage,
            profile.targetLanguage,
            profile
          );

          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `**${result.word}** (${result.partOfSpeech})\n\n**Meaning:** ${result.meaning}\n${result.englishMeaning ? `\n**English:** ${result.englishMeaning}\n` : ''}${result.pinyinWithTones ? `\n**Pinyin:** ${result.pinyinWithTones}\n` : ''}\n\n**Examples:**\n${result.examples.map(e => `• ${e.sentence}\n  ${e.translation}`).join('\n\n')}`,
            timestamp: Date.now(),
          };

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        } catch (e) {
          // Fall through to general AI chat
        }
      }

      // General AI chat
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
              text: `You are a helpful language learning assistant teaching ${profile.targetLanguage} to a ${profile.nativeLanguage} speaker. 
              Answer the following question clearly and concisely: ${query}` 
            }],
          },
        ],
      });

      const response = await model;
      let text = '';
      if (response.response) {
        const candidates = response.response.candidates;
        if (candidates && candidates.length > 0) {
          const content = candidates[0].content;
          if (content && content.parts) {
            text = content.parts.map((p: any) => p.text || '').join('');
          }
        }
      }
      if (!text) {
        text = response.text || 'Sorry, I could not generate a response.';
      }
      
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, there was an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePopularIdeaClick = (idea: PopularIdea) => {
    setInputValue(idea.title);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      {/* Main Content - with padding for global header and footer */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pt-[calc(5rem+env(safe-area-inset-top))] pb-32">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full -mt-16 px-4">
            {/* Greeting */}
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
                Hi, {profile?.nativeLanguage === 'Hindi' ? 'नमस्ते' : 'Alex'}!
              </h2>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                How can I help you?
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400 font-normal">
                Your smart assistant is ready
              </p>
            </div>

            {/* Popular Ideas */}
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">Popular Idea</span>
                <button className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium">
                  See all
                </button>
              </div>
              
              <div className="flex gap-3">
                {popularIdeas.map((idea, idx) => (
                  <button
                    key={idea.id}
                    onClick={() => handlePopularIdeaClick(idea)}
                    className="flex-1 bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-700/80 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-slate-900 mb-3 ${
                        idx === 0 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                          : 'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        {idea.icon}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                        {idea.title}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6 px-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} px-2`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-5 py-3.5 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-normal">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start px-2">
                <div className="bg-white dark:bg-slate-800 rounded-3xl px-5 py-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar - Fixed above bottom nav */}
      <div className="fixed bottom-28 left-0 right-0 z-40 md:hidden">
        <div className="max-w-md mx-auto px-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-lg border border-slate-200 dark:border-slate-700">
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
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask about ${profile?.targetLanguage || 'language'}...`}
                className="flex-1 h-10 px-4 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                disabled={isLoading}
              />
              
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} className="text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Input Bar */}
      <div className="hidden md:block sticky bottom-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] pt-3">
        <div className="max-w-md mx-auto px-5">
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
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask about ${profile?.targetLanguage || 'language'}...`}
              className="flex-1 h-10 px-4 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
              disabled={isLoading}
            />
            
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

