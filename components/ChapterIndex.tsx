import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../services/storage';
import { Course, Chapter, UserProfile } from '../types';
import { ArrowLeft, BookOpen, Layers, Loader2, Sparkles } from 'lucide-react';

type ChapterIndexProps = {
    profile: UserProfile | null;
};

const getChapterMeta = (chapter: Chapter) => ({
    hasDialogue: (chapter.shortDialogue && chapter.shortDialogue.length > 0) || (chapter.longDialogue && chapter.longDialogue.length > 0),
    vocabCount: chapter.vocab.length,
    grammarCount: chapter.grammar.length,
});

export default function ChapterIndex({ profile }: ChapterIndexProps) {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!courseId) return;
            const courses = await db.getCourses();
            const found = courses.find(c => c.id === courseId) || null;
            setCourse(found);
        };
        load();
    }, [courseId]);

    const sortedChapters = useMemo(() => {
        if (!course) return [];
        return [...course.chapters].sort((a, b) => a.order - b.order);
    }, [course]);

    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16">
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <p className="text-[11px] uppercase font-bold tracking-[0.2em] text-slate-400">Index</p>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{course.title}</h2>
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="px-3 py-2 text-xs font-bold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 hover:scale-[1.02] transition-transform"
                >
                    Go to lesson
                </button>
            </div>

            <div className="glass-panel rounded-[2rem] border border-white/70 dark:border-slate-700 shadow-lg p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] uppercase font-bold tracking-[0.2em] text-slate-400">Book Index</p>
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">All chapters</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Chapters {sortedChapters.length}</span>
                        <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <Sparkles size={14} /> {course.level}
                        </span>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {sortedChapters.map((ch, idx) => {
                        const meta = getChapterMeta(ch);
                        return (
                            <button
                                key={ch.id}
                                onClick={() => navigate(`/course/${course.id}/chapter/${ch.id}`)}
                                className="text-left rounded-2xl border border-slate-100 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 hover:border-indigo-100 dark:hover:border-indigo-700/70 transition-all card-hover relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-70"></div>
                                <div className="p-4 pl-5 flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-indigo-600 text-white shadow-sm">
                                            {idx + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Chapter {ch.order + 1}</p>
                                            <h4 className="font-extrabold truncate text-slate-900 dark:text-white">{ch.title}</h4>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pl-12">
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.hasDialogue ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'}`}>
                                            Dialogue
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                                            <Layers size={12} /> {meta.vocabCount} words
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1">
                                            <BookOpen size={12} /> {meta.grammarCount} grammar
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {sortedChapters.length === 0 && (
                <div className="glass-panel rounded-3xl p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <Loader2 size={28} className="animate-spin text-indigo-500" />
                    </div>
                    <p className="font-bold text-slate-700 dark:text-slate-300">No chapters found</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Import content to generate chapters.</p>
                </div>
            )}
        </div>
    );
}

