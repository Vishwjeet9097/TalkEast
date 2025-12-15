
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { UserProfile } from '../types';
import { getApiKeyForProfile } from '../services/gemini';
import { Mic, MicOff, Save, StopCircle, User, Activity } from 'lucide-react';
import { db } from '../services/storage';

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


export default function LiveAssistant({ profile }: { profile: UserProfile | null }) {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Ready to chat');
  const [transcription, setTranscription] = useState('');
  
  // Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); 
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSession = async () => {
    if (!profile) return;
    const apiKey = getApiKeyForProfile(profile);
    if (!apiKey) {
        setStatus('Missing API key');
        alert("API key नहीं मिला। प्रोफ़ाइल में जोड़ें या env.local सेट करें।");
        return;
    }
    const ai = new GoogleGenAI({ apiKey });
    setIsActive(true);
    setStatus('Connecting...');
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
                    setStatus('Listening...');
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
                     }
                },
                onclose: () => {
                    setStatus('Disconnected');
                    setIsActive(false);
                },
                onerror: (e) => {
                    console.error(e);
                    setStatus('Error connecting');
                    setIsActive(false);
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
        setStatus('Permission Error');
        setIsActive(false);
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
      setIsActive(false);
      setStatus('Session Ended');
  };
  
  const saveNote = async () => {
      const newNote = {
          id: crypto.randomUUID(),
          title: `Conversation Session ${new Date().toLocaleDateString()}`,
          content: "Practiced basic greetings. Key vocab: Konnichiwa, Genki desu ka.",
          createdAt: Date.now(),
          tags: ['Conversation', 'AI']
      };
      await db.saveNote(newNote);
      alert("Session summary saved to Notes!");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12 px-4 relative">
       
       {/* Background Visuals */}
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {isActive && <div className="w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse"></div>}
       </div>

       {/* Status Pill */}
       <div className={`px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm transition-all flex items-center gap-2 ${
           isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400'
       }`}>
           {isActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
           {status}
       </div>

       {/* Main Visualizer / Button */}
       <div className="relative group">
            {isActive && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 flex items-center justify-center gap-2 pointer-events-none">
                     {[...Array(7)].map((_, i) => (
                         <div key={i} className="bar bg-indigo-500/30 w-3 rounded-full" style={{ animationDelay: `-${i * 0.15}s`, height: '40%' }}></div>
                     ))}
                </div>
            )}

            <button 
                onClick={isActive ? stopSession : startSession}
                className={`relative z-10 w-40 h-40 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                    isActive 
                    ? 'bg-white dark:bg-slate-800 text-red-500 ring-4 ring-red-100 dark:ring-red-900/30' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/40'
                }`}
            >
                {isActive ? <StopCircle size={56} strokeWidth={1.5} /> : <Mic size={56} strokeWidth={1.5} />}
            </button>
            
            {/* Ripple Effect when active */}
            {isActive && (
                 <>
                    <div className="absolute top-0 left-0 w-full h-full rounded-[2.5rem] border border-indigo-500 opacity-20 animate-ping"></div>
                    <div className="absolute -inset-6 rounded-[3rem] border border-indigo-500 opacity-10 animate-pulse"></div>
                 </>
            )}
       </div>

       <div className="text-center space-y-4 max-w-sm mx-auto relative z-10">
           {isActive ? (
               <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-lg">
                   <p className="text-slate-600 dark:text-slate-300 font-medium text-lg leading-relaxed italic">
                       "Ask me anything in {profile?.targetLanguage}, or try: 'How do I order coffee?'"
                   </p>
               </div>
           ) : (
               <>
                 <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">AI Tutor</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-lg">Tap to start a realistic conversation practice session.</p>
               </>
           )}
       </div>

       {/* Quick Action */}
       {!isActive && status === 'Session Ended' && (
           <button 
            onClick={saveNote} 
            className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 border border-indigo-100 dark:border-slate-700"
           >
               <Save size={18} /> Save Conversation
           </button>
       )}
    </div>
  );
}
