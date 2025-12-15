import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { UserProfile } from '../types';
import { getApiKeyForProfile } from '../services/gemini';
import { X, Mic, MicOff, MessageSquare, Sparkles } from 'lucide-react';

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
    }
  }, [isOpen]);

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
                },
                onmessage: async (message: LiveServerMessage) => {
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
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                },
                systemInstruction: `You are a conversation partner teaching ${profile.targetLanguage}. 
                The user speaks ${profile.nativeLanguage}. 
                Speak clearly. Correct them if they make mistakes. 
                Keep the conversation engaging and simple.`
            }
        });

        sessionRef.current = {
            close: () => {
                stream.getTracks().forEach(t => t.stop());
            }
        };

    } catch (e) {
        console.error("Mic access denied or API error", e);
        setStatus('idle');
        onActiveChange(false);
    }
  };

  const stopSession = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect();
      }
      if (inputAudioContextRef.current) {
          inputAudioContextRef.current.close();
      }
      if (outputAudioContextRef.current) {
          outputAudioContextRef.current.close();
      }
      setStatus('idle');
      onActiveChange(false);
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

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your Assistant</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center px-6 py-12 min-h-[400px]">
          {/* Voice Visualizer */}
          <div className="relative mb-6">
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full bg-gradient-to-br from-indigo-400/20 via-blue-400/20 to-yellow-400/20 blur-3xl animate-pulse" />
              </div>
            )}
            <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
              isActive 
                ? 'bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-2 border-indigo-400/30' 
                : 'bg-slate-100 dark:bg-slate-800'
            }`}>
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
                  {[...Array(7)].map((_, i) => (
                    <div 
                      key={i} 
                      className="bar bg-indigo-500/40" 
                      style={{ 
                        animationDelay: `${i * 0.1}s`,
                        height: '40%'
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {status === 'idle' && "Hey, what can I do for you today?"}
              {status === 'connecting' && "Connecting..."}
              {status === 'listening' && "Listening..."}
              {status === 'processing' && "Processing..."}
              {status === 'speaking' && "Speaking..."}
            </h2>
            {transcription && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{transcription}</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {/* Switch to chat */}}
              className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <MessageSquare size={20} className="text-slate-600 dark:text-slate-400" />
            </button>

            <button
              onClick={isActive ? stopSession : startSession}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                isActive
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              }`}
            >
              {isActive ? <MicOff size={32} /> : <Mic size={32} />}
            </button>

            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

