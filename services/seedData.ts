import { Course, Chapter, VocabWord, Language, GrammarPoint } from '../types';

const createVocab = (original: string, reading: string, meaning: string, example?: string): VocabWord => ({
    id: crypto.randomUUID(),
    original,
    reading,
    meaning,
    exampleSentence: example,
    masteryLevel: 0
});

const createGrammar = (title: string, structure: string, explanation: string, examples: { sentence: string, translation: string }[]): GrammarPoint => ({
    id: crypto.randomUUID(),
    title,
    structure,
    explanation,
    examples
});

const createChapter = (title: string, order: number, vocab: VocabWord[], grammar: GrammarPoint[] = []): Chapter => ({
    id: crypto.randomUUID(),
    title,
    order,
    vocab,
    grammar,
    courseId: '' // Assigned later
});

// --- JAPANESE CONTENT ---
const jp_hiragana_1 = createChapter("Hiragana Part 1 (A-To)", 0, [
    createVocab("あ", "a", "Sound 'a' (ah)", "あおい (aoi) - Blue"),
    createVocab("い", "i", "Sound 'i' (ee)", "いえ (ie) - House"),
    createVocab("う", "u", "Sound 'u' (oo)", "うえ (ue) - Up"),
    createVocab("え", "e", "Sound 'e' (eh)", "え (e) - Picture"),
    createVocab("お", "o", "Sound 'o' (oh)", "おかお (okao) - Face"),
    createVocab("か", "ka", "Sound 'ka'", "かさ (kasa) - Umbrella"),
    createVocab("き", "ki", "Sound 'ki'", "き (ki) - Tree"),
    createVocab("く", "ku", "Sound 'ku'", "くつ (kutsu) - Shoes"),
    createVocab("け", "ke", "Sound 'ke'", "け (ke) - Hair"),
    createVocab("こ", "ko", "Sound 'ko'", "こども (kodomo) - Child"),
    createVocab("さ", "sa", "Sound 'sa'", "さかな (sakana) - Fish"),
    createVocab("し", "shi", "Sound 'shi'", "しお (shio) - Salt"),
    createVocab("す", "su", "Sound 'su'", "すし (sushi) - Sushi"),
    createVocab("せ", "se", "Sound 'se'", "せんせい (sensei) - Teacher"),
    createVocab("そ", "so", "Sound 'so'", "そら (sora) - Sky"),
    createVocab("た", "ta", "Sound 'ta'", "たこ (tako) - Octopus"),
    createVocab("ち", "chi", "Sound 'chi'", "ちず (chizu) - Map"),
    createVocab("つ", "tsu", "Sound 'tsu'", "つくえ (tsukue) - Desk"),
    createVocab("て", "te", "Sound 'te'", "て (te) - Hand"),
    createVocab("と", "to", "Sound 'to'", "とけい (tokei) - Clock")
]);

const jp_hiragana_2 = createChapter("Hiragana Part 2 (Na-N)", 1, [
    createVocab("な", "na", "Sound 'na'", "なつ (natsu) - Summer"),
    createVocab("に", "ni", "Sound 'ni'", "にく (niku) - Meat"),
    createVocab("ぬ", "nu", "Sound 'nu'", "ぬの (nuno) - Cloth"),
    createVocab("ね", "ne", "Sound 'ne'", "ねこ (neko) - Cat"),
    createVocab("の", "no", "Sound 'no'", "のみもの (nomimono) - Drink"),
    createVocab("は", "ha", "Sound 'ha'", "はな (hana) - Flower"),
    createVocab("ひ", "hi", "Sound 'hi'", "ひと (hito) - Person"),
    createVocab("ふ", "fu", "Sound 'fu'", "ふね (fune) - Ship"),
    createVocab("へ", "he", "Sound 'he'", "へや (heya) - Room"),
    createVocab("ほ", "ho", "Sound 'ho'", "ほし (hoshi) - Star"),
    createVocab("ま", "ma", "Sound 'ma'", "まち (machi) - Town"),
    createVocab("み", "mi", "Sound 'mi'", "みせ (mise) - Shop"),
    createVocab("む", "mu", "Sound 'mu'", "むし (mushi) - Insect"),
    createVocab("め", "me", "Sound 'me'", "め (me) - Eye"),
    createVocab("も", "mo", "Sound 'mo'", "もの (mono) - Thing"),
    createVocab("や", "ya", "Sound 'ya'", "やま (yama) - Mountain"),
    createVocab("ゆ", "yu", "Sound 'yu'", "ゆき (yuki) - Snow"),
    createVocab("よ", "yo", "Sound 'yo'", "よる (yoru) - Night"),
    createVocab("ら", "ra", "Sound 'ra'", "らいげつ (raigetsu) - Next month"),
    createVocab("り", "ri", "Sound 'ri'", "りんご (ringo) - Apple"),
    createVocab("る", "ru", "Sound 'ru'", "くるま (kuruma) - Car"),
    createVocab("れ", "re", "Sound 're'", "れい (rei) - Zero"),
    createVocab("ろ", "ro", "Sound 'ro'", "ろく (roku) - Six"),
    createVocab("わ", "wa", "Sound 'wa'", "わたし (watashi) - I"),
    createVocab("を", "wo", "Sound 'wo'", "Used as particle"),
    createVocab("ん", "n", "Sound 'n'", "ほん (hon) - Book")
]);

const jp_grammar_basics = createChapter("Essential Grammar", 3, [
    createVocab("学生", "gakusei", "Student", "Watashi wa gakusei desu."),
    createVocab("先生", "sensei", "Teacher", "Tanaka-san wa sensei desu.")
], [
    createGrammar(
        "X wa Y desu (Topic Marker)",
        "A は B です",
        "The particle 'wa' marks the topic. 'Desu' acts as 'to be'. This structure is flexible for various tenses.",
        [
            { sentence: "私は学生です (Watashi wa gakusei desu)", translation: "I am a student." },
            { sentence: "これはペンではありません (Kore wa pen dewa arimasen)", translation: "This is not a pen. (Negative)" },
            { sentence: "昨日は雨でした (Kinou wa ame deshita)", translation: "Yesterday was rainy. (Past)" }
        ]
    ),
    createGrammar(
        "Ka (Question Particle)",
        "Sentence + か",
        "Adding 'ka' creates a question. It works with past tense and negative forms as well.",
        [
            { sentence: "元気ですか (Genki desu ka)", translation: "How are you?" },
            { sentence: "何を食べましたか (Nani o tabemashita ka)", translation: "What did you eat? (Past)" },
            { sentence: "明日、行きますか (Ashita, ikimasu ka)", translation: "Will you go tomorrow? (Future/Present)" }
        ]
    )
]);

const jpCourse: Course = {
    id: 'jp-foundation',
    title: 'Japanese Foundation: Complete Kana',
    type: 'Textbook',
    level: 'Beginner',
    isCustom: false,
    targetLanguage: Language.JAPANESE,
    chapters: [jp_hiragana_1, jp_hiragana_2, jp_grammar_basics]
};

// --- KOREAN CONTENT ---
const kr_vowels = createChapter("Basic Vowels", 0, [
    createVocab("ㅏ", "a", "Sound 'a' like father", "아이 (ai) - Child"),
    createVocab("ㅑ", "ya", "Sound 'ya' like yacht", "야구 (yagu) - Baseball"),
    createVocab("ㅓ", "eo", "Sound 'eo' like cup", "어머니 (eomeoni) - Mother"),
    createVocab("ㅕ", "yeo", "Sound 'yeo' like young", "여자 (yeoja) - Woman"),
    createVocab("ㅗ", "o", "Sound 'o' like home", "오이 (oi) - Cucumber"),
    createVocab("ㅛ", "yo", "Sound 'yo' like yoga", "요리 (yori) - Cooking"),
    createVocab("ㅜ", "u", "Sound 'u' like moon", "우유 (uyu) - Milk"),
    createVocab("ㅠ", "yu", "Sound 'yu' like you", "유리 (yuri) - Glass"),
    createVocab("ㅡ", "eu", "Sound 'eu' like brook", "으뜸 (eutteum) - Best"),
    createVocab("ㅣ", "i", "Sound 'i' like see", "이 (i) - Tooth")
]);

const kr_consonants = createChapter("Consonants (Complete)", 1, [
    createVocab("ㄱ", "g/k", "G as in gun", "가방 (gabang) - Bag"),
    createVocab("ㄴ", "n", "N as in nose", "나비 (nabi) - Butterfly"),
    createVocab("ㄷ", "d/t", "D as in door", "다리 (dari) - Leg/Bridge"),
    createVocab("ㄹ", "r/l", "R/L sound", "라디오 (radio) - Radio"),
    createVocab("ㅁ", "m", "M as in mom", "모자 (moja) - Hat"),
    createVocab("ㅂ", "b/p", "B as in bed", "바지 (baji) - Pants"),
    createVocab("ㅅ", "s", "S as in sun", "사자 (saja) - Lion"),
    createVocab("ㅇ", "ng", "Silent/NG sound", "아이 (ai) - Child"),
    createVocab("ㅈ", "j", "J as in joy", "지도 (jido) - Map"),
    createVocab("ㅎ", "h", "H as in hat", "하늘 (haneul) - Sky"),
    createVocab("ㅊ", "ch", "Ch as in cheese", "치마 (chima) - Skirt"),
    createVocab("ㅋ", "k", "K as in kite (aspirated)", "코 (ko) - Nose"),
    createVocab("ㅌ", "t", "T as in table (aspirated)", "토끼 (tokki) - Rabbit"),
    createVocab("ㅍ", "p", "P as in pen (aspirated)", "파 (pa) - Green onion")
]);

const kr_grammar_basics = createChapter("Basic Korean Grammar", 2, [], [
    createGrammar(
        "Imnida (Formal Polite Ending)",
        "Noun + 입니다",
        "Used for formal statements. The question form is 'Imnikka?' (입니까?).",
        [
            { sentence: "저는 학생입니다 (Jeoneun haksaeng imnida)", translation: "I am a student." },
            { sentence: "이것은 무엇입니까? (Igeoseun mueosimnikka?)", translation: "What is this? (Question)" },
            { sentence: "오늘 날씨가 좋습니다 (Oneul nalssiga joseumnida)", translation: "The weather is good today." }
        ]
    ),
    createGrammar(
        "Eun/Neun (Topic Particle)",
        "Noun + 은/는",
        "Marks the topic. 'Eun' (은) follows consonants, 'Neun' (는) follows vowels.",
        [
            { sentence: "저는 미국 사람입니다 (Jeoneun Miguk saram imnida)", translation: "I am an American." },
            { sentence: "선생님은 친절합니다 (Seonsaengnimeun chinjeolhamnida)", translation: "The teacher is kind." },
            { sentence: "이름은 무엇입니까? (Ireumeun mueosimnikka?)", translation: "What is your name?" }
        ]
    )
]);

const krCourse: Course = {
    id: 'kr-foundation',
    title: 'Korean Foundation: Hangul Master',
    type: 'Textbook',
    level: 'Beginner',
    isCustom: false,
    targetLanguage: Language.KOREAN,
    chapters: [kr_vowels, kr_consonants, kr_grammar_basics]
};

// --- CHINESE CONTENT ---
const cn_basics = createChapter("Numbers & People", 0, [
    createVocab("一", "yī", "One", "一个 (yī gè) - One item"),
    createVocab("二", "èr", "Two", "十二 (shí èr) - Twelve"),
    createVocab("三", "sān", "Three", "三月 (sān yuè) - March"),
    createVocab("四", "sì", "Four", "星期四 (xīng qī sì) - Thursday"),
    createVocab("五", "wǔ", "Five", "五天 (wǔ tiān) - Five days"),
    createVocab("六", "liù", "Six", "星期六 (xīng qī liù) - Saturday"),
    createVocab("七", "qī", "Seven", "七月 (qī yuè) - July"),
    createVocab("八", "bā", "Eight", "八个 (bā gè) - Eight items"),
    createVocab("九", "jiǔ", "Nine", "九月 (jiǔ yuè) - September"),
    createVocab("十", "shí", "Ten", "十月 (shí yuè) - October"),
    createVocab("人", "rén", "Person", "中国人 (zhōng guó rén) - Chinese person"),
    createVocab("口", "kǒu", "Mouth", "人口 (rén kǒu) - Population")
]);

const cn_grammar_basics = createChapter("Basic Chinese Grammar", 1, [], [
    createGrammar(
        "Shì (To be)",
        "Subj + 是 + Noun",
        "Links two nouns. Use 'Bu shì' (不是) for negation.",
        [
            { sentence: "我是学生 (Wǒ shì xuésheng)", translation: "I am a student." },
            { sentence: "他不是老师 (Tā bú shì lǎoshī)", translation: "He is not a teacher. (Negative)" },
            { sentence: "這是我的书 (Zhè shì wǒ de shū)", translation: "This is my book." }
        ]
    ),
    createGrammar(
        "Ma (Question Particle)",
        "Statement + 吗?",
        "Turns a statement into a Yes/No question. It applies to any tense.",
        [
            { sentence: "你好吗? (Nǐ hǎo ma?)", translation: "How are you?" },
            { sentence: "你吃了吗? (Nǐ chī le ma?)", translation: "Have you eaten? (Completed)" },
            { sentence: "你忙吗? (Nǐ máng ma?)", translation: "Are you busy?" }
        ]
    )
]);

const cn_greetings = createChapter("Essential Greetings", 2, [
    createVocab("你好", "nǐ hǎo", "Hello", "你好吗? (Nǐ hǎo ma?) - How are you?"),
    createVocab("谢谢", "xiè xie", "Thank you", "谢谢你 (Xiè xie nǐ) - Thank you"),
    createVocab("再见", "zài jiàn", "Goodbye", ""),
    createVocab("对不起", "duì bu qǐ", "Sorry", ""),
    createVocab("没关系", "méi guān xi", "It's okay", "")
]);

const cnCourse: Course = {
    id: 'cn-foundation',
    title: 'Chinese Foundation: HSK 1 Basics',
    type: 'Textbook',
    level: 'Beginner',
    isCustom: false,
    targetLanguage: Language.CHINESE,
    chapters: [cn_basics, cn_grammar_basics, cn_greetings]
};

export const SEED_COURSES = [jpCourse, krCourse, cnCourse];