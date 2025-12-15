import { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../types';

type TTSState = 'IDLE' | 'LOADING' | 'PLAYING' | 'ERROR';

interface UseTTSProps {
  text: string;
  targetLanguage: Language | undefined;
  onEnd?: () => void;
  autoPlay?: boolean;
}

export const useTTS = () => {
  const [state, setState] = useState<TTSState>('IDLE');
  const [currentText, setCurrentText] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    setState('IDLE');
    setCurrentText(null);
  }, []);

  const cleanTextForTTS = (text: string, lang: Language | undefined) => {
    // Standardize cleanup logic
    let clean = text.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (lang === Language.KOREAN) {
        const hangulOnly = clean.match(/[가-힣0-9\s.?!,]+/g);
        if (hangulOnly) clean = hangulOnly.join(' ').trim();
    } else if (lang === Language.JAPANESE) {
        const jpOnly = clean.match(/[ぁ-んァ-ン一-龯0-9\s.?!,]+/g);
        if (jpOnly) clean = jpOnly.join(' ').trim();
    } else if (lang === Language.CHINESE) {
        const cnOnly = clean.match(/[\u4E00-\u9FA50-9\uff0c\u3002\uff1f\uff01]+/g);
        if (cnOnly) clean = cnOnly.join('').trim();
    }
    return clean;
  };

  const speak = useCallback((text: string, lang: Language | undefined, onComplete?: () => void) => {
    // 1. Cancel existing
    window.speechSynthesis.cancel();
    
    const cleanText = cleanTextForTTS(text, lang);
    if (!cleanText) {
        setState('ERROR');
        return;
    }

    setCurrentText(text); // Track what is playing
    setState('LOADING');

    // 2. Setup Utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    // 3. Voice Selection Logic
    const voices = window.speechSynthesis.getVoices();
    let targetLangCode = '';
    
    if (lang === Language.JAPANESE) targetLangCode = 'ja-JP';
    else if (lang === Language.KOREAN) targetLangCode = 'ko-KR';
    else if (lang === Language.CHINESE) targetLangCode = 'zh-CN';
    else targetLangCode = 'en-US';

    if (targetLangCode) {
        utterance.lang = targetLangCode;
        // Prefer Google voices or high quality voices
        const preferredVoice = voices.find(v => v.lang === targetLangCode && v.name.includes('Google')) ||
                               voices.find(v => v.lang === targetLangCode);
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
    }

    // 4. Korean specific tuning
    if (lang === Language.KOREAN) {
        utterance.rate = 0.85; 
        utterance.pitch = 1.0;
    } else {
        utterance.rate = 0.9;
    }

    // 5. Event Handlers
    utterance.onstart = () => {
        setState('PLAYING');
    };

    utterance.onend = () => {
        setState('IDLE');
        setCurrentText(null);
        if (onComplete) onComplete();
    };

    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        setState('ERROR');
        setCurrentText(null);
        // Fallback or retry logic could go here
    };

    // 6. Execute (Wait a tick to ensure UI shows loading state)
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 50);

  }, []);

  return { speak, cancel, state, currentText };
};