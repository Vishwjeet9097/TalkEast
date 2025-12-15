
import React, { useState } from 'react';
import { Course, UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, UploadCloud, AlertCircle, BookOpen, Clock, File, CheckCircle2 } from 'lucide-react';
import { useProcessing } from '../context/ProcessingContext';

interface PDFUploaderProps {
    profile: UserProfile | null;
}

export default function PDFUploader({ profile }: PDFUploaderProps) {
    const navigate = useNavigate();
    const { startJob, state, activeTaskName } = useProcessing();

    const [courseTitle, setCourseTitle] = useState('');
    const [bookType, setBookType] = useState<Course['type']>('Textbook');
    const [level, setLevel] = useState('');
    
    // UI Local State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    const isProcessing = state === 'processing' || state === 'paused';

    const handleFileSelect = (file: File | undefined) => {
        if (!file) return;

        setErrorMessage(null);
        setSelectedFile(file);

        const isPdf = file.type === 'application/pdf';
        const isImage = file.type.startsWith('image/');

        if (!isPdf && !isImage) {
            setErrorMessage("Please upload a PDF or an Image file.");
            return;
        }

        // Set default title from filename if empty
        if (!courseTitle) {
            setCourseTitle(file.name.replace(/\.[^/.]+$/, ""));
        }

        if (isImage) {
            const reader = new FileReader();
            reader.onload = () => setPreviewImage(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreviewImage(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        handleFileSelect(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !profile || !courseTitle) return;
        
        // Dispatch job to global context
        startJob(selectedFile, profile, courseTitle, bookType, level);
        
        // Navigate away immediately to show the "Background" capability
        navigate('/dashboard');
    };

    if (!profile) return null;

    // If there is already a task running when we visit this page
    if (isProcessing && activeTaskName) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center animate-pulse mb-6 relative">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/40 rounded-full animate-ping opacity-20"></div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Analyzing Content</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
                        "<span className="font-bold text-indigo-600 dark:text-indigo-400">{activeTaskName}</span>" is processing in the background. Feel free to explore other lessons.
                    </p>
                </div>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="mt-8 px-8 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xl hover:scale-105 transition-transform"
                >
                    View Progress
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 shadow-sm">
                    <BookOpen size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Import Material</h2>
                    <p className="text-slate-500 text-sm">Convert PDFs (Textbooks) or Images into lessons</p>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl space-y-8">
                
                {/* Book Metadata */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide pl-1">Course Title</label>
                        <input 
                            className="w-full text-lg font-bold bg-white/50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-slate-400"
                            placeholder="e.g. Minna no Nihongo"
                            value={courseTitle}
                            onChange={(e) => setCourseTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide pl-1">Type</label>
                            <div className="relative">
                                <select 
                                    className="w-full bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-medium"
                                    value={bookType}
                                    onChange={(e) => setBookType(e.target.value as any)}
                                >
                                    <option value="Textbook">Textbook</option>
                                    <option value="Workbook">Workbook</option>
                                    <option value="GrammarReference">Grammar Guide</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <BookOpen size={16} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide pl-1">Level</label>
                            <input 
                                className="w-full bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder-slate-400"
                                placeholder="e.g. N5, Beginner"
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Upload Area */}
                <div className="space-y-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide pl-1">File Upload</label>
                        <div 
                            className={`relative group border-3 border-dashed rounded-2xl h-56 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer overflow-hidden ${
                                errorMessage 
                                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                                    : isDragging 
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 scale-[1.02]'
                                        : selectedFile
                                            ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10'
                                            : 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-slate-800/50'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                        <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            onChange={(e) => handleFileSelect(e.target.files?.[0])} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        
                        {errorMessage ? (
                            <div className="text-center px-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                </div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Unsupported File</p>
                                <p className="text-xs text-red-500 mt-1 leading-tight">{errorMessage}</p>
                            </div>
                        ) : selectedFile ? (
                                <div className="text-center px-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="font-bold text-slate-800 dark:text-white text-lg truncate max-w-[250px]">{selectedFile.name}</p>
                                <p className="text-sm text-slate-500 font-medium">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300">
                                    <UploadCloud size={32} />
                                </div>
                                <div className="text-center px-6">
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-lg">Tap or Drop File</p>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">
                                        PDF Textbooks or Images (max 50MB)
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Start Button */}
                    <button 
                        onClick={handleUpload}
                        disabled={!selectedFile}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 ${
                            selectedFile 
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]' 
                            : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
                        }`}
                    >
                        Start Analysis & Save
                    </button>
                </div>
            </div>
        </div>
    );
}
