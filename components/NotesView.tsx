import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/storage';
import { transcribeAudio } from '../services/gemini';
import { Note, UserProfile } from '../types';
import { Plus, Trash2, Edit3, Bold, Italic, Mic, Loader2, StopCircle, List, Tag, X, Filter, ChevronLeft, AlertTriangle } from 'lucide-react';

export default function NotesView({ profile }: { profile: UserProfile | null }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [initialNote, setInitialNote] = useState<Note | null>(null); // Track original state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Tagging State
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Rich Text Editor Ref
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  // Sync content when switching notes (only when ID changes)
  useEffect(() => {
      if (contentRef.current && activeNote) {
          // We only set the innerHTML from state when the note ID changes
          // This prevents overwriting the DOM while the user is typing
          if (contentRef.current.getAttribute('data-note-id') !== activeNote.id) {
              contentRef.current.innerHTML = activeNote.content || '';
              contentRef.current.setAttribute('data-note-id', activeNote.id);
          }
      }
  }, [activeNote?.id]);

  const loadNotes = async () => {
    const data = await db.getNotes();
    setNotes(data.sort((a, b) => b.createdAt - a.createdAt));
  };

  const createNote = () => {
    const newNote: Note = {
        id: crypto.randomUUID(),
        title: 'New Note',
        content: '',
        createdAt: Date.now(),
        tags: []
    };
    setActiveNote(newNote);
    setInitialNote(JSON.parse(JSON.stringify(newNote)));
    setTagInput('');
  };

  const openNote = (note: Note) => {
      setActiveNote(note);
      setInitialNote(JSON.parse(JSON.stringify(note)));
      setTagInput('');
  };

  const saveNote = async () => {
      if (activeNote) {
          // Ensure we capture the latest content from the editable div
          const currentContent = contentRef.current?.innerHTML || activeNote.content;
          const noteToSave = { ...activeNote, content: currentContent };
          
          await db.saveNote(noteToSave);
          loadNotes();
          setActiveNote(null);
          setInitialNote(null);
          setShowConfirmDialog(false);
      }
  };

  const handleClose = () => {
      if (!activeNote || !initialNote) {
          setActiveNote(null);
          return;
      }

      const currentContent = contentRef.current?.innerHTML || '';
      // Simple dirty check
      const hasChanges = 
        activeNote.title !== initialNote.title ||
        currentContent !== initialNote.content ||
        JSON.stringify(activeNote.tags.sort()) !== JSON.stringify(initialNote.tags.sort());

      if (hasChanges) {
          setShowConfirmDialog(true);
      } else {
          setActiveNote(null);
          setInitialNote(null);
      }
  };

  const discardChanges = () => {
      setActiveNote(null);
      setInitialNote(null);
      setShowConfirmDialog(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      let mimeType = 'audio/webm'; // Default
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        handleTranscription(audioBlob);
        
        // Stop all tracks to release mic
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async (audioBlob: Blob) => {
    if (!activeNote) return;
    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(audioBlob, profile || undefined);
      // Append text to note as a paragraph
      const currentHtml = contentRef.current?.innerHTML || '';
      const newHtml = currentHtml + `<p>${text}</p>`;
      
      // Update DOM immediately
      if (contentRef.current) {
          contentRef.current.innerHTML = newHtml;
      }
      
      // Update State
      setActiveNote(prev => prev ? {
        ...prev,
        content: newHtml
      } : null);
    } catch (error) {
      console.error("Transcription failed", error);
      alert("Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const applyFormat = (command: string) => {
      document.execCommand(command, false, undefined);
      contentRef.current?.focus();
      // Update state after formatting
      if (contentRef.current && activeNote) {
           setActiveNote({ ...activeNote, content: contentRef.current.innerHTML });
      }
  };

  // Tag Helpers
  const addTag = () => {
    if (tagInput.trim() && activeNote) {
      const newTag = tagInput.trim();
      if (!activeNote.tags.includes(newTag)) {
        setActiveNote({
          ...activeNote,
          tags: [...activeNote.tags, newTag]
        });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (activeNote) {
      setActiveNote({
        ...activeNote,
        tags: activeNote.tags.filter(t => t !== tagToRemove)
      });
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Filter Logic
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || []))).sort();
  const filteredNotes = selectedTag 
    ? notes.filter(note => note.tags?.includes(selectedTag)) 
    : notes;

  if (activeNote) {
      return (
          <div className="glass-panel min-h-[70vh] rounded-2xl flex flex-col p-4 relative">
              {/* Unsaved Changes Dialog */}
              {showConfirmDialog && (
                  <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl p-4">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col items-center text-center gap-4">
                              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600">
                                  <AlertTriangle size={32} />
                              </div>
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Unsaved Changes</h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                      You have unsaved changes. Are you sure you want to discard them?
                                  </p>
                              </div>
                              <div className="flex gap-3 w-full mt-2">
                                  <button 
                                    onClick={() => setShowConfirmDialog(false)}
                                    className="flex-1 py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                  >
                                      Keep Editing
                                  </button>
                                  <button 
                                    onClick={discardChanges}
                                    className="flex-1 py-2 px-4 rounded-xl bg-red-100 dark:bg-red-900/30 font-medium text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                  >
                                      Discard
                                  </button>
                              </div>
                              <button onClick={saveNote} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">
                                  Save and Close
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {isTranscribing && (
                <div className="absolute inset-0 z-40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl flex items-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600" />
                        <span className="font-medium text-slate-800 dark:text-slate-100">Transcribing audio...</span>
                    </div>
                </div>
              )}

              {/* Header with Back Button */}
              <div className="flex items-center gap-2 mb-2">
                  <button onClick={handleClose} className="p-1 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                      <ChevronLeft size={24} />
                  </button>
                  <input 
                    type="text" 
                    value={activeNote.title}
                    onChange={(e) => setActiveNote({...activeNote, title: e.target.value})}
                    className="flex-1 text-xl font-bold bg-transparent border-none outline-none placeholder-slate-400 text-slate-800 dark:text-slate-100"
                    placeholder="Note Title"
                  />
              </div>

              {/* Tag Input Area */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex items-center bg-white/40 dark:bg-slate-800/40 rounded-lg px-2 py-1 flex-1 max-w-xs border border-slate-200 dark:border-slate-700">
                  <Tag size={14} className="text-slate-400 mr-2" />
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag..."
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400"
                  />
                  {tagInput && (
                    <button onClick={addTag} className="ml-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                
                {/* Active Tags */}
                {activeNote.tags && activeNote.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full text-xs font-medium border border-transparent dark:border-indigo-800">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              
              {/* Toolbar */}
              <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 items-center flex-wrap">
                  <button 
                    onClick={() => applyFormat('bold')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
                    title="Bold"
                  >
                    <Bold size={18}/>
                  </button>
                  <button 
                    onClick={() => applyFormat('italic')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
                    title="Italic"
                  >
                    <Italic size={18}/>
                  </button>
                   <button 
                    onClick={() => applyFormat('insertUnorderedList')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
                    title="Bullet List"
                  >
                    <List size={18}/>
                  </button>
                  
                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
                  
                  <button 
                    onClick={toggleRecording}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isRecording 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' 
                        : 'hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
                    {isRecording ? 'Recording...' : 'Dictate'}
                  </button>

                  <div className="flex-1"></div>
                  <button onClick={saveNote} className="text-indigo-600 dark:text-indigo-400 font-bold px-4 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg py-1 transition-colors">Done</button>
              </div>

              {/* Rich Text Editor */}
              <div 
                ref={contentRef}
                contentEditable
                className="flex-1 w-full bg-transparent outline-none font-sans text-lg leading-relaxed p-2 overflow-y-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 text-slate-800 dark:text-slate-100 caret-indigo-500"
                onInput={() => {
                   if (contentRef.current && activeNote) {
                       setActiveNote({ ...activeNote, content: contentRef.current.innerHTML });
                   }
                }}
                data-placeholder="Start typing or record audio..."
              />
          </div>
      )
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Notes</h2>
          <button onClick={createNote} className="p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors">
              <Plus size={24} />
          </button>
      </div>

      {/* Filter Bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedTag === null
                ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white/50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-transparent hover:border-indigo-200 dark:hover:border-slate-600'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4">
          {filteredNotes.map(note => (
              <div key={note.id} onClick={() => openNote(note)} className="glass-panel p-4 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors group relative border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{note.title}</h3>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 size={18} className="text-indigo-500" />
                    </div>
                  </div>
                  
                  {/* Tags on Card */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div 
                    className="text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 text-sm"
                    dangerouslySetInnerHTML={{ __html: note.content || "<span class='italic opacity-50'>No content</span>" }}
                  />
                  <span className="text-xs text-slate-400 mt-2 block">
                      {new Date(note.createdAt).toLocaleDateString()}
                  </span>
              </div>
          ))}
          {filteredNotes.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                {selectedTag ? `No notes found with tag #${selectedTag}` : 'No notes yet. Start writing!'}
              </div>
          )}
      </div>
    </div>
  );
}