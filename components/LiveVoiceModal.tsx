import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { UserProfile } from '../types';
import { getApiKeyForProfile } from '../services/gemini';
import { db } from '../services/storage';
import { X, Mic, MicOff, Bookmark, Sparkles } from 'lucide-react';

interface LiveVoiceModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onActiveChange: (active: boolean) => void;
}

// Audio Utilities (from Google Guidelines)
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export default function LiveVoiceModal({ profile, isOpen, onClose, onActiveChange }: LiveVoiceModalProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const [conversationMessages, setConversationMessages] = useState<Array<{role: 'user' | 'assistant', text: string, timestamp: number}>>([]);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [userLanguagePreference, setUserLanguagePreference] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);
  const [greetingText, setGreetingText] = useState<string>('');
  const hasUserSpokenRef = useRef(false);
  const activeSessionRef = useRef<any>(null);
  
  // Get status-based colors
  const getStatusColors = () => {
    if (status === 'listening' || status === 'connecting') {
      return {
        gradient: 'from-purple-500 via-violet-500 to-indigo-500',
        glow: 'purple',
        ring: 'ring-purple-500/50',
        bgGlow: 'from-purple-400/30 via-violet-400/30 to-indigo-400/30'
      };
    } else if (status === 'speaking') {
      return {
        gradient: 'from-orange-500 via-amber-500 to-yellow-500',
        glow: 'orange',
        ring: 'ring-orange-500/50',
        bgGlow: 'from-orange-400/30 via-amber-400/30 to-yellow-400/30'
      };
    } else if (status === 'processing') {
      return {
        gradient: 'from-blue-500 via-indigo-500 to-purple-500',
        glow: 'blue',
        ring: 'ring-blue-500/50',
        bgGlow: 'from-blue-400/30 via-indigo-400/30 to-purple-400/30'
      };
    }
    return {
      gradient: 'from-slate-400 to-slate-500',
      glow: 'slate',
      ring: 'ring-slate-400/30',
      bgGlow: 'from-slate-400/20 to-slate-500/20'
    };
  };
  
  const statusColors = getStatusColors();
  
  // Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); 
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      stopSession();
      setStatus('idle');
      setTranscription('');
      setConversationMessages([]);
      setIsFirstInteraction(true);
      setUserLanguagePreference(null);
      sessionStartedRef.current = false;
      setGreetingText('');
      hasUserSpokenRef.current = false;
      activeSessionRef.current = null;
    }
  }, [isOpen]);

  // Save conversation to notes
  const handleSaveToNotes = async () => {
    try {
      const sessionDuration = isActive ? 'Active Session' : 'Completed Session';
      const statusInfo = status !== 'idle' ? `Status: ${status}` : 'Session ended';
      
      const note = {
        id: crypto.randomUUID(),
        title: `Voice Conversation - ${profile?.targetLanguage || 'Language'} Practice - ${new Date().toLocaleDateString()}`,
        content: `Voice Conversation Session\n\n${sessionDuration}\n${statusInfo}\n\nDate: ${new Date().toLocaleString()}\n\n${conversationMessages.length > 0 ? 'Conversation Summary:\n' + conversationMessages.map(m => `${m.role === 'user' ? 'You' : 'AI Tutor'}: ${m.text}`).join('\n\n') : 'This was a voice conversation session. Audio transcripts are not available in this version.'}`,
        createdAt: Date.now(),
        tags: ['Voice Chat', 'AI', profile?.targetLanguage || 'Language'],
      };

      await db.saveNote(note);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save conversation. Please try again.');
    }
  };

  // Simple Face Expression - Eyes and Mouth directly on circle
  const renderFaceOnCircle = () => {
    // Use percentage-based viewBox for responsive scaling
    const viewBoxSize = 100;
    const centerX = viewBoxSize / 2;
    const centerY = viewBoxSize / 2;
    const eyeY = centerY - 12;
    const mouthY = centerY + 12;
    
    if (status === 'idle') {
      // Friendly, welcoming face
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 pointer-events-none" preserveAspectRatio="xMidYMid meet">
          {/* Left eye - happy */}
          <ellipse cx={centerX - 12} cy={eyeY} rx="3.5" ry="4.5" fill="white" opacity="0.95" />
          {/* Right eye - happy */}
          <ellipse cx={centerX + 12} cy={eyeY} rx="3.5" ry="4.5" fill="white" opacity="0.95" />
          {/* Smile */}
          <path d={`M ${centerX - 14} ${mouthY} Q ${centerX} ${mouthY + 7} ${centerX + 14} ${mouthY}`} 
                stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.95" />
        </svg>
      );
    } else if (status === 'listening' || status === 'connecting') {
      // Attentive, listening face
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 pointer-events-none" preserveAspectRatio="xMidYMid meet">
          {/* Left eye - attentive */}
          <circle cx={centerX - 12} cy={eyeY} r="4" fill="white" opacity="0.95" />
          {/* Right eye - attentive */}
          <circle cx={centerX + 12} cy={eyeY} r="4" fill="white" opacity="0.95" />
          {/* Neutral mouth */}
          <line x1={centerX - 12} y1={mouthY} x2={centerX + 12} y2={mouthY} 
                stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
        </svg>
      );
    } else if (status === 'speaking') {
      // Talking face with open mouth
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 pointer-events-none" preserveAspectRatio="xMidYMid meet">
          {/* Left eye - active */}
          <ellipse cx={centerX - 12} cy={eyeY} rx="3.5" ry="4" fill="white" opacity="0.95" />
          {/* Right eye - active */}
          <ellipse cx={centerX + 12} cy={eyeY} rx="3.5" ry="4" fill="white" opacity="0.95" />
          {/* Open mouth (talking) */}
          <ellipse cx={centerX} cy={mouthY + 2} rx="7" ry="4.5" fill="white" opacity="0.95" />
        </svg>
      );
    } else if (status === 'processing') {
      // Thinking/processing face
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 pointer-events-none" preserveAspectRatio="xMidYMid meet">
          {/* Left eye - thinking */}
          <ellipse cx={centerX - 12} cy={eyeY} rx="3" ry="4" fill="white" opacity="0.95" />
          {/* Right eye - thinking */}
          <ellipse cx={centerX + 12} cy={eyeY} rx="3" ry="4" fill="white" opacity="0.95" />
          {/* Small thoughtful mouth */}
          <path d={`M ${centerX - 9} ${mouthY} Q ${centerX} ${mouthY - 2} ${centerX + 9} ${mouthY}`} 
                stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.95" />
        </svg>
      );
    }
    return null;
  };

  // Swipe down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    currentYRef.current = e.touches[0].clientY;
    const deltaY = currentYRef.current - startYRef.current;
    
    if (deltaY > 0 && modalRef.current) {
      modalRef.current.style.transform = `translateY(${deltaY}px)`;
      modalRef.current.style.opacity = `${1 - deltaY / 300}`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    const deltaY = currentYRef.current - startYRef.current;
    if (deltaY > 100) {
      onClose();
    } else {
      if (modalRef.current) {
        modalRef.current.style.transform = '';
        modalRef.current.style.opacity = '';
      }
    }
  };

  const startSession = async () => {
    if (!profile) return;
    
    // Prevent multiple sessions
    if (activeSessionRef.current) {
      console.warn('Session already active, ignoring start request');
      return;
    }
    
    const apiKey = getApiKeyForProfile(profile);
    if (!apiKey) {
        setStatus('idle');
        alert("API key नहीं मिला। प्रोफ़ाइल में जोड़ें या env.local सेट करें।");
        return;
    }
    const ai = new GoogleGenAI({ apiKey });
    setStatus('connecting');
    onActiveChange(true);
    setTranscription('');
    setGreetingText('');
    hasUserSpokenRef.current = false;

    nextStartTimeRef.current = 0;
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    inputAudioContextRef.current = inputAudioContext;
    outputAudioContextRef.current = outputAudioContext;

    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setStatus('listening');
                    sessionStartedRef.current = true;
                    setIsFirstInteraction(true);
                    hasUserSpokenRef.current = true; // Allow greeting audio immediately
                    
                    // Setup audio processing
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then(session => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                    
                    // Trigger greeting by sending a minimal audio signal
                    setTimeout(() => {
                        sessionPromise.then(session => {
                            const greetingTrigger = new Float32Array(800).fill(0.001);
                            const greetingBlob = createBlob(greetingTrigger);
                            session.sendRealtimeInput({ media: greetingBlob });
                        });
                    }, 500);
                },
                onmessage: async (message: LiveServerMessage) => {
                     // Handle Text Transcription (if available)
                     const textParts = message.serverContent?.modelTurn?.parts?.filter((p: any) => p.text);
                     if (textParts && textParts.length > 0) {
                         const assistantText = textParts.map((p: any) => p.text).join(' ');
                         
                         // Track conversation messages
                         setConversationMessages(prev => [...prev, {
                             role: 'assistant',
                             text: assistantText,
                             timestamp: Date.now()
                         }]);
                         
                         // Check if this is the initial greeting
                         if (isFirstInteraction && assistantText.toLowerCase().includes('hi') || assistantText.toLowerCase().includes('hello')) {
                             setIsFirstInteraction(false);
                         }
                         
                         // Check for language preference response
                         if (assistantText.toLowerCase().includes('language') && !userLanguagePreference) {
                             // Extract language preference if mentioned
                             const languageMatch = assistantText.match(/(english|hindi|japanese|chinese|spanish|french|german|korean|arabic|portuguese|russian|italian)/i);
                             if (languageMatch) {
                                 setUserLanguagePreference(languageMatch[1]);
                             }
                         }
                     }
                     
                     // Handle Audio Output
                     const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                     if (base64Audio) {
                        setStatus('speaking');
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                        const audioBuffer = await decodeAudioData(
                            decode(base64Audio),
                            outputAudioContext,
                            24000,
                            1
                        );
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.addEventListener('ended', () => {
                            sourcesRef.current.delete(source);
                            if (sourcesRef.current.size === 0) {
                                setStatus('listening');
                            }
                        });
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        sourcesRef.current.add(source);
                     }
                     
                     // Handle Interruption
                     if (message.serverContent?.interrupted) {
                         sourcesRef.current.forEach(s => s.stop());
                         sourcesRef.current.clear();
                         nextStartTimeRef.current = 0;
                         setStatus('listening');
                     }
                },
                onclose: () => {
                    setStatus('idle');
                    onActiveChange(false);
                },
                onerror: (e) => {
                    console.error(e);
                    setStatus('idle');
                    onActiveChange(false);
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
                },
                systemInstruction: `You are TalkEast, a friendly and professional AI personal assistant for language learning. You speak naturally like a real person with natural voice and intonation.

CRITICAL FIRST INTERACTION PROTOCOL:
When the conversation begins (this is the FIRST thing you MUST say with audio immediately):
1. Greet warmly in ${profile.nativeLanguage === 'हिन्दी' || profile.nativeLanguage === 'Hindi' ? 'Hindi' : profile.nativeLanguage}: 
   - If native language is Hindi: "Hi! Main TalkEast hoon, aapki personal AI assistant. Kya aap Hindi mein baat karne mein sakham hain?"
   - If they say "haan" or "yes", IMMEDIATELY ask: "Main aapki kaise sahayta kar sakti hoon?"
   - If they say "nahi" or prefer ${profile.targetLanguage}, switch to that language and ask how you can help
2. Wait for their response and then begin the conversation naturally

IMPORTANT: 
- Always use natural, conversational tone like a real person
- Speak naturally with proper intonation and pauses
- Be warm, friendly, and approachable
- Use natural speech patterns, not robotic
- Sound like a real human assistant, not an AI

CONVERSATION STYLE:
- Speak clearly, naturally, and at a moderate pace
- Be warm, friendly, encouraging, and patient
- Keep responses concise (2-3 sentences) unless they ask for detailed explanations
- Use a conversational, approachable tone

LANGUAGE PRACTICE MODE:
- If they choose ${profile.targetLanguage}: Help them practice, correct mistakes gently, provide examples, give encouragement
- If they choose ${profile.nativeLanguage}: Have natural conversations about language learning, answer questions about ${profile.targetLanguage}, provide explanations

GENERAL BEHAVIOR:
- Adapt to their language level and learning needs
- Ask engaging follow-up questions
- Provide helpful, constructive feedback
- Be supportive and positive

Remember: You MUST start every new conversation with the greeting and language preference question. This is non-negotiable.`
            }
        });

        sessionRef.current = sessionPromise;
        activeSessionRef.current = sessionPromise;
        
        // Store session close function
        sessionPromise.then(session => {
            sessionRef.current = {
                close: () => {
                    stream.getTracks().forEach(t => t.stop());
                    activeSessionRef.current = null;
                }
            };
        });

    } catch (e) {
        console.error("Mic access denied or API error", e);
        setStatus('idle');
        onActiveChange(false);
    }
  };

  const stopSession = async () => {
      // Stop all audio sources
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      
      // Close session if exists
      if (activeSessionRef.current) {
          try {
              const session = await activeSessionRef.current;
              if (session && typeof session.close === 'function') {
                  session.close();
              }
          } catch (e) {
              console.warn('Error closing session:', e);
          }
          activeSessionRef.current = null;
      }
      
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
      }
      if (scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect();
          scriptProcessorRef.current = null;
      }
      if (inputAudioContextRef.current) {
          inputAudioContextRef.current.close();
          inputAudioContextRef.current = null;
      }
      if (outputAudioContextRef.current) {
          outputAudioContextRef.current.close();
          outputAudioContextRef.current = null;
      }
      setStatus('idle');
      onActiveChange(false);
      hasUserSpokenRef.current = false;
  };

  if (!isOpen) return null;

  const isActive = status !== 'idle';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" />
      
      {/* Save Toast Notification */}
      {showSaveToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Bookmark size={18} className="fill-white" />
            <span className="font-semibold">Conversation saved to Notes!</span>
          </div>
        </div>
      )}
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header - Clean Design */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 block">AI Assistant</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Voice Conversation</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <X size={18} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content - Professional Redesign */}
        <div className="flex flex-col items-center justify-center px-6 py-10 md:py-14 min-h-[500px]">
          {/* AI Circle with Glassmorphism Effect */}
          <div className="relative mb-10 flex items-center justify-center">
            {/* Multiple Glow Layers for Depth */}
            {isActive && (
              <>
                {/* Base Glow Layer */}
                <div 
                  className={`absolute inset-0 rounded-full bg-gradient-to-br ${statusColors.bgGlow} blur-3xl`}
                  style={{
                    width: '280px',
                    height: '280px',
                    margin: 'auto',
                    animation: status === 'listening' || status === 'speaking' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                  }}
                />
                
                {/* Animated Glow Rings - Listening (Purple) */}
                {(status === 'listening' || status === 'connecting') && (
                  <>
                    <div 
                      className="absolute rounded-full border-4 border-purple-500/50 blur-2xl"
                      style={{
                        width: '240px',
                        height: '240px',
                        margin: 'auto',
                        animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}
                    />
                    <div 
                      className="absolute rounded-full border-3 border-purple-400/70 blur-xl"
                      style={{
                        width: '260px',
                        height: '260px',
                        margin: 'auto',
                        animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.3s'
                      }}
                    />
                    <div 
                      className="absolute rounded-full border-2 border-purple-300/80 blur-lg"
                      style={{
                        width: '270px',
                        height: '270px',
                        margin: 'auto',
                        animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.6s'
                      }}
                    />
                  </>
                )}
                
                {/* Animated Glow Rings - Speaking (Orange) */}
                {status === 'speaking' && (
                  <>
                    <div 
                      className="absolute rounded-full border-4 border-orange-500/50 blur-2xl"
                      style={{
                        width: '240px',
                        height: '240px',
                        margin: 'auto',
                        animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}
                    />
                    <div 
                      className="absolute rounded-full border-3 border-orange-400/70 blur-xl"
                      style={{
                        width: '260px',
                        height: '260px',
                        margin: 'auto',
                        animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.3s'
                      }}
                    />
                    <div 
                      className="absolute rounded-full border-2 border-orange-300/80 blur-lg"
                      style={{
                        width: '270px',
                        height: '270px',
                        margin: 'auto',
                        animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.6s'
                      }}
                    />
                  </>
                )}
              </>
            )}
            
            {/* Main Glassmorphism Circle */}
            <div 
              className={`relative w-56 h-56 md:w-64 md:h-64 rounded-full flex items-center justify-center transition-all duration-500 ${
                isActive 
                  ? `bg-gradient-to-br ${statusColors.gradient}` 
                  : 'bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-600'
              }`}
              style={{
                boxShadow: isActive 
                  ? status === 'listening' 
                    ? '0 0 80px rgba(168, 85, 247, 0.7), 0 0 120px rgba(139, 92, 246, 0.5), 0 0 160px rgba(124, 58, 237, 0.3), inset 0 0 40px rgba(255, 255, 255, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
                    : status === 'speaking'
                    ? '0 0 80px rgba(249, 115, 22, 0.7), 0 0 120px rgba(251, 146, 60, 0.5), 0 0 160px rgba(234, 88, 12, 0.3), inset 0 0 40px rgba(255, 255, 255, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
                    : '0 0 60px rgba(99, 102, 241, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.1)'
                  : '0 0 60px rgba(168, 85, 247, 0.4), 0 0 100px rgba(139, 92, 246, 0.2), inset 0 0 30px rgba(255, 255, 255, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              {/* Glassmorphism Inner Glow */}
              <div 
                className={`absolute inset-2 rounded-full bg-gradient-to-br ${statusColors.bgGlow} opacity-30 blur-md`}
                style={{
                  backdropFilter: 'blur(10px)'
                }}
              />
              
              {/* Face Expression - Eyes and Mouth directly on glowing circle */}
              {renderFaceOnCircle()}
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-6 w-full max-w-sm">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
              {status === 'idle' && "Hi! I'm your AI language assistant"}
              {status === 'connecting' && "Connecting to TalkEast..."}
              {status === 'listening' && (isFirstInteraction ? "TalkEast is greeting you..." : "I'm listening...")}
              {status === 'processing' && "Processing..."}
              {status === 'speaking' && "Speaking..."}
            </h2>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mt-2">
              {status === 'idle' && "How can I help you today?"}
              {status === 'connecting' && "Setting up your conversation..."}
              {status === 'listening' && (isFirstInteraction ? "TalkEast will greet you and ask about your language preference" : "Speak naturally, I'm here to help")}
              {status === 'speaking' && "Let me respond..."}
              {status === 'processing' && "Understanding your request..."}
            </p>
            {transcription && (
              <div className="mt-4 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{transcription}</p>
              </div>
            )}
          </div>

          {/* Helper Text */}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            {status === 'idle' && "Simply start speaking to begin"}
            {status !== 'idle' && "Tap the button below to stop"}
          </p>

          {/* Bottom Action Button - Centered */}
          <div className="flex items-center justify-center w-full">
            {/* Main Control Button - Start/Stop Talk - Icon Only */}
            <button
              onClick={isActive ? stopSession : startSession}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                  : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
              }`}
              style={{
                boxShadow: isActive 
                  ? '0 0 40px rgba(239, 68, 68, 0.6), 0 8px 32px rgba(0, 0, 0, 0.2)'
                  : '0 0 40px rgba(168, 85, 247, 0.5), 0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* Button Glow Effect */}
              {isActive && (
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
              )}
              {isActive ? (
                <MicOff size={28} className="relative z-10" strokeWidth={2} />
              ) : (
                <Mic size={28} className="relative z-10" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

