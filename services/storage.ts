import { Course, Note, UserProfile, Chapter, ProcessingJob, ProcessedBatch } from '../types';
import { SEED_COURSES } from './seedData';

const DB_NAME = 'LingoFlowDB';
const DB_VERSION = 2; // Incremented for new stores

export class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject('Error opening database');

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        // Check if we need to seed data
        await this.checkAndSeedData();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = (event.target as IDBOpenDBRequest).transaction;

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
      };
    });
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
    const courses = await this.getAll('courses') as any[];
    for (const course of courses) {
        course.chapters = await this.getChaptersForCourse(course.id);
    }
    return courses;
  }
  
  async getChaptersForCourse(courseId: string): Promise<Chapter[]> {
      return new Promise((resolve, reject) => {
          if (!this.db) return reject('DB not init');
          const tx = this.db.transaction(['chapters'], 'readonly');
          const store = tx.objectStore('chapters');
          const index = store.index('courseId');
          const request = index.getAll(courseId);
          
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      })
  }

  async saveNote(note: Note): Promise<void> {
    return this.put('notes', note);
  }

  async getNotes(): Promise<Note[]> {
    return this.getAll('notes') as Promise<Note[]>;
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
