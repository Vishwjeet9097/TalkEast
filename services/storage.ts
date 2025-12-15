import { Course, Note, UserProfile, Chapter, ProcessingJob, ProcessedBatch, UserStats, PracticeHistory } from '../types';
import { SEED_COURSES } from './seedData';

const DB_NAME = 'LingoFlowDB';
const DB_VERSION = 4; // Incremented for new stores (practiceHistory)

export class StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // If already initialized, return
    if (this.db) return Promise.resolve();
    // If initialization is in progress, return the existing promise
    if (this.initPromise) return this.initPromise;
    
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      throw new Error('IndexedDB is not supported in this browser. Please use a modern browser.');
    }
    
    // Start initialization
    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
          this.initPromise = null; // Clear promise on error
          const error = (event.target as IDBOpenDBRequest).error;
          console.error('IndexedDB open error:', error);
          reject(new Error(`Database error: ${error?.message || 'Failed to open database'}`));
        };

        request.onsuccess = async (event) => {
          try {
            this.db = (event.target as IDBOpenDBRequest).result;
            // Check if we need to seed data
            await this.checkAndSeedData();
            this.initPromise = null; // Clear promise after successful init
            resolve();
          } catch (seedError: any) {
            this.initPromise = null;
            console.error('Error during database initialization:', seedError);
            reject(new Error(`Database initialization failed: ${seedError.message || 'Unknown error'}`));
          }
        };

        request.onupgradeneeded = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            const tx = (event.target as IDBOpenDBRequest).transaction;
            
            if (!tx) {
              throw new Error('Transaction not available during upgrade');
            }

        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chapters')) {
          const store = db.createObjectStore('chapters', { keyPath: 'id' });
          store.createIndex('courseId', 'courseId', { unique: false });
        }
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }

        // V2: Job Queues for Robust Uploads
        if (!db.objectStoreNames.contains('jobs')) {
            db.createObjectStore('jobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('job_batches')) {
             // Composite key manually managed as string "jobId_batchIndex"
            const store = db.createObjectStore('job_batches', { keyPath: 'id' });
            store.createIndex('jobId', 'jobId', { unique: false });
        }
        if (!db.objectStoreNames.contains('userStats')) {
            db.createObjectStore('userStats', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('practiceHistory')) {
            const store = db.createObjectStore('practiceHistory', { keyPath: 'id' });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
        }
          } catch (upgradeError: any) {
            console.error('Error during database upgrade:', upgradeError);
            reject(new Error(`Database upgrade failed: ${upgradeError.message || 'Unknown error'}`));
          }
        };
      } catch (initError: any) {
        this.initPromise = null;
        reject(new Error(`Failed to initialize database: ${initError.message || 'Unknown error'}`));
      }
    });
    
    return this.initPromise;
  }

  private async checkAndSeedData() {
      const courses = await this.getCourses();
      if (courses.length === 0) {
          console.log("Seeding initial courses...");
          for (const course of SEED_COURSES) {
              course.chapters.forEach(ch => ch.courseId = course.id);
              await this.saveCourse(course);
          }
      }
  }

  // --- JOB MANAGEMENT ---
  async saveJob(job: ProcessingJob): Promise<void> {
      return this.put('jobs', job);
  }

  async getJob(id: string): Promise<ProcessingJob | undefined> {
      return this.get('jobs', id);
  }

  async getAllJobs(): Promise<ProcessingJob[]> {
      return this.getAll('jobs') as Promise<ProcessingJob[]>;
  }

  async saveBatch(batch: ProcessedBatch): Promise<void> {
      const id = `${batch.jobId}_${batch.batchIndex}`;
      return this.put('job_batches', { ...batch, id });
  }

  async getBatchesForJob(jobId: string): Promise<ProcessedBatch[]> {
      return new Promise((resolve, reject) => {
          if (!this.db) return reject('DB not init');
          const tx = this.db.transaction('job_batches', 'readonly');
          const store = tx.objectStore('job_batches');
          const index = store.index('jobId');
          const req = index.getAll(jobId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
      });
  }
  
  async deleteJobAndBatches(jobId: string): Promise<void> {
      if (!this.db) return;
      const tx = this.db.transaction(['jobs', 'job_batches'], 'readwrite');
      
      // Delete Job
      tx.objectStore('jobs').delete(jobId);

      // Delete Batches (Index scan)
      const batchStore = tx.objectStore('job_batches');
      const index = batchStore.index('jobId');
      const req = index.openCursor(IDBKeyRange.only(jobId));
      
      req.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
              cursor.delete();
              cursor.continue();
          }
      };
      
      return new Promise(resolve => {
          tx.oncomplete = () => resolve();
      });
  }

  // --- USER DATA ---
  async saveProfile(profile: UserProfile): Promise<void> {
    return this.put('userProfile', { id: 'current', ...profile });
  }

  async getProfile(): Promise<UserProfile | null> {
    const result = await this.get('userProfile', 'current');
    return result as UserProfile | null;
  }

  async saveCourse(course: Course): Promise<void> {
    const { chapters, ...courseData } = course;
    await this.put('courses', courseData);
    
    if (chapters && chapters.length > 0) {
        const tx = this.db!.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        chapters.forEach(ch => store.put(ch));
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
  }

  async getCourses(): Promise<Course[]> {
    // Ensure DB is initialized
    if (!this.db) {
      await this.init();
    }
    
    const courses = await this.getAll('courses') as any[];
    console.log('getCourses: Found', courses.length, 'courses in DB');
    
    // Load chapters for each course
    for (const course of courses) {
        try {
            course.chapters = await this.getChaptersForCourse(course.id);
            console.log(`Course "${course.title}": ${course.chapters.length} chapters`);
        } catch (error) {
            console.error(`Error loading chapters for course ${course.id}:`, error);
            course.chapters = [];
        }
    }
    
    return courses;
  }
  
  async getChaptersForCourse(courseId: string): Promise<Chapter[]> {
      return new Promise((resolve, reject) => {
          if (!this.db) {
              reject('DB not init');
              return;
          }
          
          try {
              const tx = this.db.transaction(['chapters'], 'readonly');
              const store = tx.objectStore('chapters');
              
              // Check if index exists
              if (!store.indexNames.contains('courseId')) {
                  console.warn('courseId index not found, returning empty array');
                  resolve([]);
                  return;
              }
              
              const index = store.index('courseId');
              const request = index.getAll(courseId);
              
              request.onsuccess = () => {
                  const chapters = request.result || [];
                  console.log(`getChaptersForCourse(${courseId}): Found ${chapters.length} chapters`);
                  resolve(chapters);
              };
              
              request.onerror = () => {
                  console.error('Error getting chapters:', request.error);
                  reject(request.error);
              };
          } catch (error) {
              console.error('Exception in getChaptersForCourse:', error);
              reject(error);
          }
      })
  }

  async deleteCourse(courseId: string): Promise<void> {
      return new Promise((resolve, reject) => {
          if (!this.db) return reject('DB not initialized');
          
          // Start transaction for both courses and chapters
          const tx = this.db.transaction(['courses', 'chapters'], 'readwrite');
          const courseStore = tx.objectStore('courses');
          const chapterStore = tx.objectStore('chapters');
          
          // Delete the course
          const deleteCourseReq = courseStore.delete(courseId);
          
          // Delete all chapters for this course
          const index = chapterStore.index('courseId');
          const getChaptersReq = index.getAll(courseId);
          
          getChaptersReq.onsuccess = () => {
              const chapters = getChaptersReq.result;
              chapters.forEach((chapter: Chapter) => {
                  chapterStore.delete(chapter.id);
              });
          };
          
          deleteCourseReq.onsuccess = () => {
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
          };
          
          deleteCourseReq.onerror = () => reject(deleteCourseReq.error);
      });
  }

  async saveNote(note: Note): Promise<void> {
    return this.put('notes', note);
  }

  async getNotes(): Promise<Note[]> {
    return this.getAll('notes') as Promise<Note[]>;
  }

  async deleteNote(noteId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const tx = this.db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      const req = store.delete(noteId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- USER STATS ---
  async getStats(): Promise<UserStats> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.get('userStats', 'current') as UserStats | undefined;
    
    if (existing && existing.lastReviewDate === today) {
      return existing;
    }
    
    // Reset daily stats if new day
    const stats: UserStats = existing ? {
      ...existing,
      todayHighScore: existing.lastReviewDate === today ? existing.todayHighScore : 0,
      dailyReviewCompleted: existing.lastReviewDate === today ? existing.dailyReviewCompleted : false,
      lastReviewDate: today
    } : {
      id: 'current',
      todayHighScore: 0,
      dailyReviewCompleted: false,
      lastReviewDate: today,
      totalWordsReviewed: 0,
      streakDays: 0,
      lastActivity: Date.now()
    };
    
    await this.saveStats(stats);
    return stats;
  }

  async saveStats(stats: UserStats): Promise<void> {
    return this.put('userStats', stats);
  }

  // --- PRACTICE HISTORY ---
  async savePracticeHistory(history: PracticeHistory): Promise<void> {
    return this.put('practiceHistory', history);
  }

  async getPracticeHistory(limit?: number): Promise<PracticeHistory[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const tx = this.db.transaction('practiceHistory', 'readonly');
      const store = tx.objectStore('practiceHistory');
      const index = store.index('timestamp');
      const req = index.openCursor(null, 'prev'); // Descending order
      
      const results: PracticeHistory[] = [];
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor && (!limit || results.length < limit)) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getPracticeHistoryByDate(date: string): Promise<PracticeHistory[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const tx = this.db.transaction('practiceHistory', 'readonly');
      const store = tx.objectStore('practiceHistory');
      const index = store.index('date');
      const req = index.getAll(date);
      req.onsuccess = () => resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
      req.onerror = () => reject(req.error);
    });
  }

  // Generic Helpers
  private async put(storeName: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async get(storeName: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async getAll(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

export const db = new StorageService();
