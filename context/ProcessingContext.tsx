
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { analyzeContentBatch } from '../services/gemini';
import { db } from '../services/storage';
import { PDFProcessor } from '../services/pdfProcessor';
import { Course, UserProfile, ProcessingJob, ProcessedBatch, Chapter, JobStatus } from '../types';
import { NotificationService } from '../services/notifications';

interface ProcessingContextType {
  state: JobStatus | 'IDLE';
  progress: number;
  statusMessage: string;
  error: string | null;
  activeTaskName: string | null;
  activeJobId: string | null;
  startJob: (file: File, profile: UserProfile, title: string, type: string, level: string) => Promise<void>;
  resumeJob: (jobId: string) => Promise<void>;
  pauseJob: (jobId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  resetJob: () => void;
  refreshJobs: () => Promise<void>;
}

// Default/fallback context value
const defaultContextValue: ProcessingContextType = {
  state: 'IDLE',
  progress: 0,
  statusMessage: '',
  error: null,
  activeTaskName: null,
  activeJobId: null,
  startJob: async () => { throw new Error('ProcessingProvider not initialized'); },
  resumeJob: async () => { throw new Error('ProcessingProvider not initialized'); },
  pauseJob: async () => { throw new Error('ProcessingProvider not initialized'); },
  deleteJob: async () => { throw new Error('ProcessingProvider not initialized'); },
  resetJob: () => {},
  refreshJobs: async () => {}
};

const ProcessingContext = createContext<ProcessingContextType>(defaultContextValue);

export const useProcessing = () => {
  const context = useContext(ProcessingContext);
  // Always return context (will be default if provider not available)
  return context;
};

export const ProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<JobStatus | 'IDLE'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTaskName, setActiveTaskName] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [shouldStop, setShouldStop] = useState(false);
  const profileRef = useRef<UserProfile | null>(null);

  // Helper to wait
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processJobQueue = async (job: ProcessingJob, processor: PDFProcessor) => {
      try {
        setShouldStop(false);
        const batchGenerator = processor.getBatches(2); // Reduced batch size
        
        for await (const batch of batchGenerator) {
            // 1. Check stop signal (Pause)
            if (shouldStop) {
                console.log("Job paused by user or system.");
                break;
            }

            // 2. Refresh job from DB
            const currentJob = await db.getJob(job.id);
            if (!currentJob || currentJob.status === 'paused' || currentJob.status === 'failed') {
                break;
            }

            // 3. Skip if already processed
            if (currentJob.processedBatches.includes(batch.index)) {
                continue;
            }

            setStatusMessage(`Analyzing Batch ${batch.index + 1}/${currentJob.totalBatches}...`);
            
            // 4. Rate Limiting Delay
            await delay(4000); 

            try {
                // 5. Analyze
                const rawChapters = await analyzeContentBatch(batch.pages, job.courseMetadata.targetLanguage, profileRef.current || undefined);
                
                // 6. Fix Chapter Metadata (Order, CourseID)
                // We need to determine the correct order offset based on existing chapters
                // Simple approach: batchIndex * 10 + internal index (allows spacing)
                const processedChapters = rawChapters.map((ch, idx) => ({
                    ...ch,
                    courseId: job.courseId,
                    order: (batch.index * 10) + idx
                }));

                // 7. Save Chunk to History
                await db.saveBatch({
                    jobId: currentJob.id,
                    batchIndex: batch.index,
                    chapters: processedChapters
                });

                // 8. UPDATE LIVE COURSE (Incremental Availability)
                // We construct a "partial" course object. 
                // db.saveCourse iterates through chapters and upserts them.
                const partialCourse: Course = {
                    id: job.courseId,
                    title: job.courseMetadata.title,
                    type: job.courseMetadata.type as any,
                    level: job.courseMetadata.level,
                    targetLanguage: job.courseMetadata.targetLanguage as any,
                    isCustom: true,
                    processingJobId: job.id,
                    chapters: processedChapters // These will be merged/upserted into the chapter store
                };
                await db.saveCourse(partialCourse);

                // 9. Update Job Progress
                currentJob.processedBatches.push(batch.index);
                currentJob.updatedAt = Date.now();
                currentJob.progress = Math.floor((currentJob.processedBatches.length / currentJob.totalBatches) * 100);
                await db.saveJob(currentJob);
                
                // Update UI
                setProgress(currentJob.progress);

            } catch (batchError: any) {
                console.error(`Batch ${batch.index} failed:`, batchError);
                
                // Handle 429 / Quota specifically
                if (batchError.message?.includes('429') || batchError.message?.includes('RESOURCE_EXHAUSTED')) {
                    setError("Daily quota limit reached. Job paused.");
                    setStatusMessage("Paused due to rate limit. You can resume later.");
                    currentJob.status = 'paused';
                    currentJob.errorMessage = "Quota exceeded (429). Resume later.";
                    await db.saveJob(currentJob);
                    setState('paused');
                    NotificationService.sendNotification('Job Paused', `Quota limit reached for ${activeTaskName}`);
                    return; // EXIT LOOP
                } else {
                    setError(`Batch ${batch.index} failed. Job paused.`);
                    currentJob.status = 'paused';
                    currentJob.errorMessage = batchError.message;
                    await db.saveJob(currentJob);
                    setState('paused');
                    return; // EXIT LOOP
                }
            }
        }

        // 10. Finalize if all done
        const finalJob = await db.getJob(job.id);
        if (finalJob && finalJob.processedBatches.length >= finalJob.totalBatches) {
             finalizeJob(finalJob);
        }

      } catch (err: any) {
          setError(err.message);
          setState('failed');
      }
  };

  const finalizeJob = async (job: ProcessingJob) => {
        setStatusMessage('Finalizing course...');
        
        // Remove processing flag from course
        const courses = await db.getCourses();
        const existingCourse = courses.find(c => c.id === job.courseId);
        
        if (existingCourse) {
            existingCourse.processingJobId = undefined; // Clear job ID to remove "Processing" badge
            // We pass empty chapters array because chapters are already saved incrementally. 
            // We just want to update the course metadata.
            // Note: Our types require chapters, but saveCourse ignores empty arrays for overwriting.
            // Actually, getCourses returns chapters. We should pass them back or handle it in storage.
            // Safe bet: Pass existing chapters.
            await db.saveCourse(existingCourse);
        }
        
        job.status = 'completed';
        job.progress = 100;
        await db.saveJob(job);
        
        setState('completed');
        setStatusMessage('Course ready!');
        NotificationService.sendNotification('Success', `${job.courseMetadata.title} is ready.`);
  };

  const startJob = useCallback(async (
    file: File, 
    profile: UserProfile, 
    courseTitle: string, 
    bookType: string, 
    level: string
  ) => {
    if (state === 'processing') return;

    const jobId = PDFProcessor.generateJobId(file);
    const courseId = crypto.randomUUID(); // Create ID immediately

    profileRef.current = profile;

    // Create Initial "Empty" Course so it appears in Library immediately
    const initialCourse: Course = {
        id: courseId,
        title: courseTitle,
        type: bookType as any,
        level: level,
        targetLanguage: profile.targetLanguage,
        isCustom: true,
        processingJobId: jobId,
        chapters: []
    };
    await db.saveCourse(initialCourse);

    let job: ProcessingJob = {
        id: jobId,
        courseId: courseId, // Link!
        fileName: file.name,
        fileType: file.type,
        fileBlob: file,
        totalPages: 0, // Will update after load
        totalBatches: 0,
        processedBatches: [],
        status: 'processing',
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        courseMetadata: {
            title: courseTitle,
            type: bookType,
            level: level,
            targetLanguage: profile.targetLanguage
        }
    };
    await db.saveJob(job);

    setActiveJobId(jobId);
    setActiveTaskName(courseTitle);
    setState('processing');
    setProgress(0);
    setError(null);
    setStatusMessage('Analyzing structure...');

    // Load PDF
    const processor = new PDFProcessor();
    const totalPages = await processor.load(file);
    
    // Update Job stats
    job.totalPages = totalPages;
    job.totalBatches = Math.ceil(totalPages / 2);
    await db.saveJob(job);

    processJobQueue(job, processor);

  }, [state]);

  const resumeJob = useCallback(async (jobId: string) => {
      const job = await db.getJob(jobId);
      if (!job) return;

      // Attempt to reuse last known profile; if not available, fall back to env
      if (!profileRef.current) {
          const profile = await db.getProfile();
          profileRef.current = profile;
      }

      setActiveJobId(job.id);
      setActiveTaskName(job.courseMetadata.title);
      setState('processing');
      setProgress(job.progress);
      setError(null);
      setStatusMessage('Resuming...');

      const processor = new PDFProcessor();
      await processor.load(job.fileBlob);

      job.status = 'processing';
      job.errorMessage = undefined;
      await db.saveJob(job);

      processJobQueue(job, processor);
  }, []);

  const pauseJob = useCallback(async (jobId: string) => {
      setShouldStop(true);
      const job = await db.getJob(jobId);
      if (job) {
          job.status = 'paused';
          await db.saveJob(job);
          setState('paused');
          setStatusMessage('Job paused.');
      }
  }, []);

  const deleteJob = useCallback(async (jobId: string) => {
      await db.deleteJobAndBatches(jobId);
      if (activeJobId === jobId) {
          resetJob();
      }
      // Note: We deliberately do NOT delete the course here. 
      // User might want to keep the partial data. 
      // They can delete the course from the library if they want.
  }, [activeJobId]);

  const resetJob = useCallback(() => {
    setState('IDLE');
    setProgress(0);
    setStatusMessage('');
    setError(null);
    setActiveTaskName(null);
    setActiveJobId(null);
    setShouldStop(false);
  }, []);
  
  const refreshJobs = async () => {
      // Logic handled via DB polling in components usually
  };

  return (
    <ProcessingContext.Provider value={{
      state,
      progress,
      statusMessage,
      error,
      activeTaskName,
      activeJobId,
      startJob,
      resumeJob,
      pauseJob,
      deleteJob,
      resetJob,
      refreshJobs
    }}>
      {children}
    </ProcessingContext.Provider>
  );
};
