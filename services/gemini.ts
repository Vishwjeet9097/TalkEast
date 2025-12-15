
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SearchResult, Chapter, DialogueLine, VocabWord, GrammarPoint, PracticeItem, PracticeType, UserProfile } from "../types";
import { PDFPageContent } from "./pdfProcessor";

const ENV_API_KEY = process.env.API_KEY || '';

export const getApiKeyForProfile = (profile?: UserProfile): string => {
    if (!profile || profile.useEnvKey !== false) {
        return ENV_API_KEY;
    }
    return (profile.apiKey || '').trim();
};

const getAI = (profile?: UserProfile) => {
    const apiKey = getApiKeyForProfile(profile);
    if(!apiKey) throw new Error("API Key missing. Add it in Profile or .env.local.");
    return new GoogleGenAI({ apiKey });
}

// Retry logic wrapper
const generateWithRetry = async (model: any, params: any, retries = 3): Promise<GenerateContentResponse> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await model.generateContent(params);
        } catch (error: any) {
            const statusCode = error.status || error.code;
            const message = error.message || '';
            
            // Handle Resource Exhausted specifically
            if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
                console.warn("Quota exceeded. Waiting longer...");
                // Exponential backoff: 5s, 10s, 20s
                const delay = Math.pow(2, i + 1) * 5000; 
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // If this is the last retry, allow the error to bubble up so we can pause the job
                if (i === retries - 1) throw error;
                continue;
            }

            if ((statusCode === 503) && i < retries - 1) {
                const delay = Math.pow(2, i + 1) * 2000;
                console.warn(`Gemini API busy (Attempt ${i + 1}). Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Failed after retries");
};

export const analyzeContentBatch = async (
    pages: PDFPageContent[], 
    targetLang: string,
    profile?: UserProfile
): Promise<Chapter[]> => {
    const ai = getAI(profile);
    
    // Construct Prompt Parts
    const contentParts = [];
    
    contentParts.push({ 
        text: `Analyze the following ${pages.length} pages of a language learning textbook (Target: ${targetLang}).
        
        CRITICAL RULES FOR CJK (Chinese/Japanese/Korean):
        1. Preserve full sentences. Do not split sentences mid-way between JSON fields.
        2. Identify headers accurately (e.g., 第1课, Lesson 1, Chapter 1).
        3. For Vocabulary tables:
           - Extract the original characters (Hanzi/Kanji/Hangul) exactly.
           - Extract Pinyin/Furigana if visible.
           - Extract the definition.
        4. If a page is an image, perform OCR to extract the structure.
        
        Output a JSON array of 'Chapter' objects found in this batch. If a chapter starts in a previous batch, treat this as a continuation (or new sections).
        ` 
    });

    for (const page of pages) {
        if (page.isScanned && page.image) {
            contentParts.push({ text: `--- Page ${page.pageNumber} (Image Source) ---` });
            contentParts.push({ 
                inlineData: { mimeType: 'image/jpeg', data: page.image } 
            });
        } else {
            contentParts.push({ text: `--- Page ${page.pageNumber} (Text Source) --- \n${page.text}` });
        }
    }

    // Schema Definition
    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                culturalTip: { type: Type.STRING },
                shortDialogue: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            speaker: { type: Type.STRING },
                            text: { type: Type.STRING },
                            translation: { type: Type.STRING }
                        }
                    }
                },
                longDialogue: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            speaker: { type: Type.STRING },
                            text: { type: Type.STRING },
                            translation: { type: Type.STRING }
                        }
                    }
                },
                vocab: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            meaning: { type: Type.STRING },
                            romanization: { type: Type.STRING },
                            partOfSpeech: { type: Type.STRING },
                            exampleSentence: { type: Type.STRING }
                        }
                    }
                },
                grammar: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            example: { type: Type.STRING }
                        }
                    }
                },
                pronunciationTips: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            rule: { type: Type.STRING },
                            examples: { type: Type.ARRAY, items: { type: Type.STRING }}
                        }
                    }
                }
            }
        }
    };

    try {
        const response = await generateWithRetry(ai.models, {
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        if (response.text) {
             const data = JSON.parse(response.text);
             // Post-process to ensure IDs and stability
             return data.map((unit: any, idx: number) => ({
                id: crypto.randomUUID(),
                title: unit.title || `Section ${idx + 1}`,
                courseId: '',
                order: idx,
                culturalTip: unit.culturalTip,
                shortDialogue: unit.shortDialogue || [],
                longDialogue: unit.longDialogue || [],
                pronunciationTips: unit.pronunciationTips || [],
                vocab: (unit.vocab || []).map((v: any) => ({
                    id: crypto.randomUUID(), 
                    original: v.word || '?',
                    reading: v.romanization || '',
                    meaning: v.meaning || '',
                    partOfSpeech: v.partOfSpeech,
                    exampleSentence: v.exampleSentence,
                    masteryLevel: 0
                })),
                grammar: (unit.grammar || []).map((g: any) => ({
                    id: crypto.randomUUID(),
                    title: g.title || 'Grammar Point',
                    structure: g.title || '',
                    explanation: g.explanation || '',
                    examples: g.example ? [{ sentence: g.example, translation: '' }] : []
                }))
            }));
        }
        return [];

    } catch (e) {
        console.error("Batch Analysis Error:", e);
        throw e;
    }
}

export const generateMissingSection = async (
    chapter: Chapter,
    sectionType: 'dialogue' | 'grammar' | 'vocab',
    targetLang: string,
    nativeLang: string = 'English',
    profile?: UserProfile
): Promise<any> => {
    const ai = getAI(profile);
    let prompt = "";
    let schema: any = {};

    const vocabList = chapter.vocab.map(v => `${v.original} (${v.meaning})`).join(", ");
    const isHindi = nativeLang.toLowerCase() === 'hindi';
    const translationInstruction = isHindi 
        ? `Provide the translation in ${nativeLang} (written in Devanagari script).` 
        : `Provide the translation in ${nativeLang}.`;

    if (sectionType === 'dialogue') {
        prompt = `Generate a realistic conversation (dialogue) between two people in ${targetLang} suitable for a lesson titled "${chapter.title}".
        Use as many of these vocabulary words as possible: ${vocabList}.
        The conversation should have 4-6 exchanges. ${translationInstruction}`;
        
        schema = {
            type: Type.OBJECT,
            properties: {
                dialogue: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            speaker: { type: Type.STRING },
                            text: { type: Type.STRING },
                            translation: { type: Type.STRING }
                        }
                    }
                }
            }
        };
    } else if (sectionType === 'grammar') {
        prompt = `Generate 2 key grammar points for a ${targetLang} lesson titled "${chapter.title}". 
        Context vocabulary: ${vocabList}.
        Explain the structure clearly in ${nativeLang} and provide an example sentence with ${nativeLang} translation.`;

        schema = {
            type: Type.OBJECT,
            properties: {
                grammar: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            structure: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            example: { type: Type.STRING },
                            exampleTranslation: { type: Type.STRING }
                        }
                    }
                }
            }
        };
    } else if (sectionType === 'vocab') {
        prompt = `Generate 10 essential vocabulary words for a ${targetLang} lesson titled "${chapter.title}".
        Provide the original script, romanization (if applicable), and meaning in ${nativeLang}.`;

        schema = {
            type: Type.OBJECT,
            properties: {
                vocab: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            meaning: { type: Type.STRING },
                            romanization: { type: Type.STRING },
                            partOfSpeech: { type: Type.STRING },
                            exampleSentence: { type: Type.STRING }
                        }
                    }
                }
            }
        };
    }

    const response = await generateWithRetry(ai.models, {
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    return JSON.parse(response.text || "{}");
}

export const searchWordMeaning = async (word: string, nativeLang: string, targetLang: string, profile?: UserProfile): Promise<SearchResult> => {
     try {
    const ai = getAI(profile);
    const isEnglishNative = nativeLang.toLowerCase() === 'english';
    
    // Construct Prompt
    let prompt = `Translate and explain the word "${word}". 
    Target Language: ${targetLang}. 
    User's Native Language: ${nativeLang}.

    Requirements:
    1. Provide the meaning in ${nativeLang}.
    2. Provide the Part of Speech.
    3. Provide 2 example sentences in ${targetLang} with translations in ${nativeLang}.
    `;

    if (!isEnglishNative) {
        prompt += `4. ALSO provide the meaning in English for better understanding (multi-lingual support).`;
    }

    if (targetLang === 'Chinese') {
        prompt += `5. You MUST provide the Pinyin with tone marks.`;
    }

    const response = await generateWithRetry(ai.models, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            meaning: { type: Type.STRING, description: `The meaning of the word in ${nativeLang}` },
            englishMeaning: { type: Type.STRING, description: "Meaning in English (if native is not English)" },
            pinyinWithTones: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: { 
                  type: Type.OBJECT,
                  properties: {
                      sentence: { type: Type.STRING },
                      translation: { type: Type.STRING }
                  }
               }
            }
          }
        }
      }
    });

    let text = response.text;
    if (text) {
        text = text.trim();
        if (text.startsWith("```")) text = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
        return JSON.parse(text) as SearchResult;
    }
    throw new Error("Empty response");
  } catch (error) {
    return {
        word: word,
        partOfSpeech: "unknown",
        meaning: "Definition currently unavailable.",
        examples: []
    };
  }
};

export const transcribeAudio = async (audioBlob: Blob, profile?: UserProfile): Promise<string> => {
    try {
        const ai = getAI(profile);
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                try {
                    const response = await generateWithRetry(ai.models, {
                        model: 'gemini-2.5-flash',
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    { text: "Transcribe this audio exactly as spoken. Return only the text." },
                                    { 
                                        inlineData: { 
                                            mimeType: audioBlob.type.includes('mp4') ? 'audio/mp4' : 'audio/webm',
                                            data: base64data 
                                        } 
                                    }
                                ]
                            }
                        ]
                    }, 5); 
                    resolve(response.text || "");
                } catch (e) {
                    reject(e);
                }
            };
            reader.readAsDataURL(audioBlob);
        });
    } catch (e) {
        throw e;
    }
}

// --- PRACTICE GENERATION ---
export const generatePracticeSession = async (
    type: PracticeType,
    targetLang: string,
    nativeLang: string,
    context?: string, // e.g., "Food", "Travel", or list of words
    profile?: UserProfile
): Promise<PracticeItem[]> => {
    const ai = getAI(profile);
    let prompt = "";
    
    // Construct Prompt based on type
    if (type === 'vocab') {
        prompt = `Generate 5 multiple-choice vocabulary questions for a ${targetLang} learner (${nativeLang} speaker).
        Topic/Context: ${context || 'General Beginner'}.
        For each question, provide a word in ${targetLang} and ask for the meaning in ${nativeLang}, OR vice versa.`;
    } else if (type === 'grammar') {
        prompt = `Generate 3 grammar translation challenges for a ${targetLang} learner.
        Topic: ${context || 'Basic Sentence Structure'}.
        Prompt: "Translate this sentence to ${targetLang}".
        Provide the source sentence in ${nativeLang} and the correct answer in ${targetLang}.`;
    } else if (type === 'reading') {
        prompt = `Generate a short reading comprehension passage (2-3 sentences) in ${targetLang} about ${context || 'Daily Life'}.
        Then ask 2 questions about it in ${nativeLang}.`;
    } else if (type === 'listening') {
        prompt = `Generate 3 listening dictation challenges.
        Provide a sentence in ${targetLang} (audioText) and ask the user to type exactly what they hear.`;
    }

    const response = await generateWithRetry(ai.models, {
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING, description: "The question displayed to user" },
                                correctAnswer: { type: Type.STRING, description: "The correct answer string" },
                                possibleAnswers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "For multiple choice only" },
                                explanation: { type: Type.STRING, description: "Short explanation of why answer is correct" },
                                audioText: { type: Type.STRING, description: "Text to be spoken by TTS (for listening/reading)" }
                            }
                        }
                    }
                }
            }
        }
    });

    const data = JSON.parse(response.text || "{}");
    return (data.items || []).map((item: any) => ({
        id: crypto.randomUUID(),
        type,
        ...item
    }));
};

export const explainGrammarMistake = async (
    question: string,
    userAnswer: string,
    correctAnswer: string,
    targetLang: string,
    nativeLang: string,
    profile?: UserProfile
): Promise<string> => {
    const ai = getAI(profile);
    const prompt = `
        Context: Language Learning (${targetLang}).
        Task: Translate "${question}" to ${targetLang}.
        Correct Answer: "${correctAnswer}".
        User Answer: "${userAnswer}".
        
        Explain concisely in ${nativeLang} why the user's answer is wrong or how it differs from the correct one. Focus on grammar particles, word order, or conjugation. Keep it under 2 sentences.
    `;
    
    const response = await generateWithRetry(ai.models, {
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    return response.text || "Explanation unavailable.";
}
