import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/storage';
import { transcribeAudio } from '../services/gemini';
import { Note, UserProfile } from '../types';
import { Plus, Trash2, Edit3, Bold, Italic, Mic, Loader2, StopCircle, List, Tag, X, Filter, ChevronLeft, AlertTriangle, Check, MoreVertical, Pin, Palette, GripVertical } from 'lucide-react';

export default function NotesView({ profile }: { profile: UserProfile | null }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [initialNote, setInitialNote] = useState<Note | null>(null); // Track original state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Tagging State
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  
  // Menu State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Drag and Drop State
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId && !(e.target as HTMLElement).closest('.note-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

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
    try {
      // Ensure DB is initialized
      await db.init();
    const data = await db.getNotes();
      // Sort: pinned first, then by order, then by date
      const sorted = data.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return b.createdAt - a.createdAt;
      });
      setNotes(sorted);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
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
          try {
              // Ensure DB is initialized
              await db.init();
          // Ensure we capture the latest content from the editable div
          const currentContent = contentRef.current?.innerHTML || activeNote.content;
          const noteToSave = { ...activeNote, content: currentContent };
          
          await db.saveNote(noteToSave);
          loadNotes();
          setActiveNote(null);
          setInitialNote(null);
          setShowConfirmDialog(false);
          } catch (error) {
              console.error('Error saving note:', error);
              alert('Failed to save note. Please try again.');
          }
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
      // Check if already has 2 tags
      if (activeNote.tags && activeNote.tags.length >= 2) {
        return;
      }
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

  // Note Actions
  const deleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        // Ensure DB is initialized
        await db.init();
        await db.deleteNote(noteId);
        loadNotes();
        setOpenMenuId(null);
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note. Please try again.');
      }
    }
  };

  const togglePin = async (note: Note) => {
    try {
      // Ensure DB is initialized
      await db.init();
      const updatedNote = { ...note, pinned: !note.pinned };
      await db.saveNote(updatedNote);
      loadNotes();
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update note. Please try again.');
    }
  };

  const changeColor = async (note: Note, color: string) => {
    try {
      // Ensure DB is initialized
      await db.init();
      const updatedNote = { ...note, color };
      await db.saveNote(updatedNote);
      loadNotes();
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error changing color:', error);
      alert('Failed to update note color. Please try again.');
    }
  };

  const noteColors = [
    { name: 'Default', value: '', class: 'bg-white dark:bg-slate-800' },
    { name: 'Yellow', value: '#fef3c7', class: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { name: 'Green', value: '#d1fae5', class: 'bg-green-100 dark:bg-green-900/30' },
    { name: 'Blue', value: '#dbeafe', class: 'bg-blue-100 dark:bg-blue-900/30' },
    { name: 'Purple', value: '#e9d5ff', class: 'bg-purple-100 dark:bg-purple-900/30' },
    { name: 'Pink', value: '#fce7f3', class: 'bg-pink-100 dark:bg-pink-900/30' },
    { name: 'Orange', value: '#fed7aa', class: 'bg-orange-100 dark:bg-orange-900/30' },
  ];

  // Filter Logic
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || []))).sort();
  const filteredNotes = selectedTag 
    ? notes.filter(note => note.tags?.includes(selectedTag)) 
    : notes;
  
  // Sort notes: pinned first, then by custom order, then by date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // If both have order, sort by order
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // If only one has order, prioritize it
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return b.createdAt - a.createdAt;
  });

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    setDraggedNoteId(noteId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', noteId);
  };

  const handleDragOver = (e: React.DragEvent, noteId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedNoteId && draggedNoteId !== noteId) {
      setDragOverNoteId(noteId);
    }
  };

  const handleDragLeave = () => {
    setDragOverNoteId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetNoteId: string) => {
    e.preventDefault();
    setDragOverNoteId(null);
    
    if (!draggedNoteId || draggedNoteId === targetNoteId) {
      setDraggedNoteId(null);
      return;
    }

    try {
      await db.init();
      const draggedIndex = sortedNotes.findIndex(n => n.id === draggedNoteId);
      const targetIndex = sortedNotes.findIndex(n => n.id === targetNoteId);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedNoteId(null);
        return;
      }

      // Update order for all notes
      const updatedNotes = [...sortedNotes];
      const [draggedNote] = updatedNotes.splice(draggedIndex, 1);
      updatedNotes.splice(targetIndex, 0, draggedNote);

      // Save new order
      for (let i = 0; i < updatedNotes.length; i++) {
        if (updatedNotes[i].order !== i) {
          const noteToUpdate = { ...updatedNotes[i], order: i };
          await db.saveNote(noteToUpdate);
        }
      }

      loadNotes();
    } catch (error) {
      console.error('Error reordering notes:', error);
    } finally {
      setDraggedNoteId(null);
    }
  };

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
                  <button 
                    onClick={saveNote} 
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center"
                    title="Save"
                  >
                    <Check size={20} />
                  </button>
              </div>

              {/* Tag Input Area */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className={`flex items-center bg-white/40 dark:bg-slate-800/40 rounded-lg px-2 py-1 flex-1 max-w-xs border border-slate-200 dark:border-slate-700 ${(activeNote.tags && activeNote.tags.length >= 2) ? 'opacity-50' : ''}`}>
                  <Tag size={14} className={`mr-2 ${(activeNote.tags && activeNote.tags.length >= 2) ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`} />
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={(activeNote.tags && activeNote.tags.length >= 2) ? "Maximum 2 tags" : "Add tag..."}
                    disabled={(activeNote.tags && activeNote.tags.length >= 2)}
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
                  />
                  {tagInput && !(activeNote.tags && activeNote.tags.length >= 2) && (
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedNotes.map(note => {
            const noteColor = note.color || '';
            const selectedColor = noteColors.find(c => c.value === noteColor);
            const isDragging = draggedNoteId === note.id;
            const isDragOver = dragOverNoteId === note.id;
            
            return (
              <div 
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragOver={(e) => handleDragOver(e, note.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, note.id)}
                onClick={(e) => {
                  // Don't open note if clicking on menu
                  if ((e.target as HTMLElement).closest('.note-menu')) return;
                  openNote(note);
                }} 
                className={`relative group rounded-2xl cursor-pointer transition-all duration-300 border overflow-hidden backdrop-blur-xl
                  ${isDragging ? 'opacity-50 scale-95' : ''}
                  ${isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''}
                  ${noteColor ? '' : 'bg-white/90 dark:bg-slate-800/90 border-slate-200/60 dark:border-slate-700/60'}
                  hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]
                  shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50
                `}
                style={noteColor ? { 
                  backgroundColor: `${noteColor}dd`,
                  borderColor: `${noteColor}80`,
                  backdropFilter: 'blur(20px)',
                  boxShadow: `0 20px 25px -5px ${noteColor}20, 0 10px 10px -5px ${noteColor}10, inset 0 1px 0 ${noteColor}40`
                } : {
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                  {/* Left Color Accent */}
                  {noteColor && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                      style={{ 
                        backgroundColor: noteColor,
                        boxShadow: `0 0 10px ${noteColor}40`
                      }}
                    />
                  )}
                  
                  {/* Glass Overlay Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none rounded-2xl"></div>
                  
                  {/* Card Content */}
                  <div className="p-5 relative z-10">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {/* Drag Handle */}
                        <div 
                          className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors shrink-0 mt-0.5"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <GripVertical size={16} />
                        </div>
                        {note.pinned && (
                          <Pin size={16} className="text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          {/* Title - More Prominent */}
                          <h3 className="font-extrabold text-xl text-slate-900 dark:text-slate-50 leading-tight mb-2 line-clamp-2 tracking-tight">
                            {note.title}
                          </h3>
                    </div>
                  </div>
                  
                      {/* Menu Button - Always Visible */}
                      <div className="relative note-menu shrink-0 z-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === note.id ? null : note.id);
                          }}
                          className={`p-2 rounded-lg transition-all backdrop-blur-sm ${
                            openMenuId === note.id
                              ? 'bg-indigo-100/90 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shadow-lg'
                              : 'bg-white/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-700/80 shadow-md'
                          }`}
                        >
                          <MoreVertical size={18} strokeWidth={2.5} />
                        </button>
                        
                        {/* Compact Dropdown Menu */}
                        {openMenuId === note.id && (
                          <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-11 z-[101] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 p-2 w-[200px] max-w-[90vw] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                              {/* First Row: Pin and Delete */}
                              <div className="flex gap-1 mb-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePin(note);
                                  }}
                                  className="flex-1 px-2 py-2 text-center text-xs hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                  <Pin size={14} className={note.pinned ? 'fill-indigo-600 dark:fill-indigo-400 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                                  <span className="font-medium text-[10px]">{note.pinned ? 'Unpin' : 'Pin'}</span>
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNote(note.id);
                                  }}
                                  className="flex-1 px-2 py-2 text-center text-xs hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400 transition-colors"
                                >
                                  <Trash2 size={14} />
                                  <span className="font-medium text-[10px]">Delete</span>
                                </button>
                              </div>
                              
                              {/* Second Row: Color Selection */}
                              <div className="px-2 py-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
                                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1 justify-center">
                                  <Palette size={9} />
                                  <span>Color</span>
                                </div>
                                <div className="grid grid-cols-6 gap-1.5">
                                  {noteColors.map(color => (
                                    <button
                                      key={color.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        changeColor(note, color.value);
                                      }}
                                      className={`relative w-6 h-6 rounded-md transition-all ${
                                        noteColor === color.value 
                                          ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800 scale-110' 
                                          : 'hover:scale-110'
                                      } ${color.class}`}
                                      style={color.value ? { backgroundColor: color.value } : {}}
                                      title={color.name}
                                    >
                                      {noteColor === color.value && (
                                        <Check size={8} className="absolute inset-0 m-auto text-white drop-shadow-md" strokeWidth={3} />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Divider between Title and Content */}
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mb-3"></div>
                    
                    {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                      {note.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                    {/* Content Preview - More Distinct */}
                    <div className="mb-4">
                      <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                        Content
                      </div>
                      <div 
                        className="text-slate-700 dark:text-slate-200 line-clamp-3 text-sm leading-relaxed min-h-[3.5rem] prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: note.content || "<span class='text-slate-400 dark:text-slate-500 italic'>No content</span>" }}
                  />
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                      {selectedColor && (
                        <div 
                          className="w-2.5 h-2.5 rounded-full shadow-sm"
                          style={{ backgroundColor: selectedColor.value }}
                          title={selectedColor.name}
                        />
                      )}
                    </div>
                  </div>
              </div>
            );
          })}
          {sortedNotes.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                {selectedTag ? `No notes found with tag #${selectedTag}` : 'No notes yet. Start writing!'}
              </div>
          )}
      </div>
    </div>
  );
}