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

  // Check if speechSynthesis is available
  const isSpeechSynthesisAvailable = typeof window !== 'undefined' && 
    'speechSynthesis' in window && 
    window.speechSynthesis !== undefined;

  const cancel = useCallback(() => {
    if (isSpeechSynthesisAvailable && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (error) {
        console.warn('Error canceling speech synthesis:', error);
      }
    }
    setState('IDLE');
    setCurrentText(null);
  }, [isSpeechSynthesisAvailable]);

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
    // Check if speechSynthesis is available
    if (!isSpeechSynthesisAvailable || !window.speechSynthesis) {
      console.warn('Speech synthesis is not available in this environment');
      setState('ERROR');
      if (onComplete) onComplete();
      return;
    }

    // 1. Cancel existing
    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      console.warn('Error canceling previous speech:', error);
    }
    
    const cleanText = cleanTextForTTS(text, lang);
    if (!cleanText) {
        setState('ERROR');
        if (onComplete) onComplete();
        return;
    }

    setCurrentText(text); // Track what is playing
    setState('LOADING');

    // 2. Setup Utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    // 3. Voice Selection Logic
    let voices: SpeechSynthesisVoice[] = [];
    try {
      voices = window.speechSynthesis.getVoices();
    } catch (error) {
      console.warn('Error getting voices:', error);
    }
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
      try {
        if (isSpeechSynthesisAvailable && window.speechSynthesis) {
          window.speechSynthesis.speak(utterance);
        } else {
          setState('ERROR');
          setCurrentText(null);
          if (onComplete) onComplete();
        }
      } catch (error) {
        console.error('Error speaking:', error);
        setState('ERROR');
        setCurrentText(null);
        if (onComplete) onComplete();
      }
    }, 50);

  }, [isSpeechSynthesisAvailable]);

  return { speak, cancel, state, currentText };
};