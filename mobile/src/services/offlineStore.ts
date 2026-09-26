/**
 * Offline-first storage layer with background sync queue.
 * Uses IndexedDB for web and SQLite for native,
 * with automatic background synchronization when connectivity returns.
 */

import { SyncOperation, SyncResult, SyncStatus } from "../types";

const DB_NAME = "KrishiVisionDB";
const DB_VERSION = 1;

export class CacheManager {
  private db: IDBDatabase | null = null;
  private isNative: boolean = false; // Set to true if using SQLite natively

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("diagnostics_cache")) {
          db.createObjectStore("diagnostics_cache");
        }
        if (!db.objectStoreNames.contains("advisory_cache")) {
          db.createObjectStore("advisory_cache");
        }
        if (!db.objectStoreNames.contains("satellite_cache")) {
          db.createObjectStore("satellite_cache");
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("user_preferences")) {
          db.createObjectStore("user_preferences");
        }
        if (!db.objectStoreNames.contains("media_cache")) {
          db.createObjectStore("media_cache");
        }
      };

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event: Event) => {
        console.error("IndexedDB initialization error:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    return this.db!;
  }

  public async set<T>(storeName: string, key: string, value: T, ttl?: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const data = {
        value,
        timestamp: Date.now(),
        ttl: ttl || null,
      };
      const request = store.put(data, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        if (result.ttl && Date.now() - result.timestamp > result.ttl) {
          this.invalidate(storeName, key).then(() => resolve(null));
        } else {
          resolve(result.value as T);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async invalidate(storeName: string, key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async clearStore(storeName: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getCacheSize(): Promise<number> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }
}

export class SyncQueue {
  private cacheManager: CacheManager;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  public async enqueue(operation: SyncOperation): Promise<void> {
    const db = await (this.cacheManager as any).getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("sync_queue", "readwrite");
      const store = transaction.objectStore("sync_queue");
      const request = store.put(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async dequeue(): Promise<SyncOperation | null> {
    const db = await (this.cacheManager as any).getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("sync_queue", "readwrite");
      const store = transaction.objectStore("sync_queue");
      const request = store.openCursor();

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.status === SyncStatus.PENDING || cursor.value.status === SyncStatus.FAILED) {
            resolve(cursor.value as SyncOperation);
            return;
          }
          cursor.continue();
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async processQueue(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    let op = await this.dequeue();
    while (op) {
      try {
        const response = await fetch(op.endpoint, {
          method: op.method,
          headers: op.headers,
          body: op.payload ? JSON.stringify(op.payload) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Sync request failed");
        }

        op.status = SyncStatus.COMPLETED;
        results.push({ operation_id: op.id, success: true, response: data });
      } catch (error: any) {
        op.retry_count += 1;
        op.status = SyncStatus.FAILED;
        results.push({ operation_id: op.id, success: false, error: error.message });
      }

      await this.enqueue(op); // Update the state
      op = await this.dequeue();
    }
    await this.clearCompleted();
    return results;
  }

  public async getQueueLength(): Promise<number> {
    const db = await (this.cacheManager as any).getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("sync_queue", "readonly");
      const store = transaction.objectStore("sync_queue");
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async clearCompleted(): Promise<void> {
    const db = await (this.cacheManager as any).getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("sync_queue", "readwrite");
      const store = transaction.objectStore("sync_queue");
      const request = store.openCursor();

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.status === SyncStatus.COMPLETED) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export class BackgroundSyncService {
  private syncQueue: SyncQueue;
  private isSyncing: boolean = false;

  constructor(syncQueue: SyncQueue) {
    this.syncQueue = syncQueue;
    this.setupListeners();
  }

  private setupListeners(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.onConnectivityChange(true));
      window.addEventListener("offline", () => this.onConnectivityChange(false));
    }
  }

  public startSync(): void {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready.then((registration: any) => {
        return registration.sync.register("krishi-vision-sync");
      }).catch(() => {
        // Fallback to manual sync trigger if service worker sync fails
        this.triggerSync();
      });
    } else {
      this.triggerSync();
    }
  }

  public async onConnectivityChange(isOnline: boolean): Promise<void> {
    if (isOnline) {
      await this.triggerSync();
    }
  }

  private async triggerSync(): Promise<void> {
    if (this.isSyncing) return;
    
    // Check network using navigator + ping
    const isOnline = navigator.onLine;
    if (!isOnline) return;

    try {
      // Ping check
      const ping = await fetch("https://1.1.1.1/cdn-cgi/trace", { mode: "no-cors", cache: "no-store" });
      if (ping.type === "error") return;
    } catch {
      return;
    }

    this.isSyncing = true;
    try {
      await this.syncWithRetry(3);
    } finally {
      this.isSyncing = false;
    }
  }

  public async syncWithRetry(maxRetries: number): Promise<void> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const results = await this.syncQueue.processQueue();
        const hasFailures = results.some((r) => !r.success);
        
        if (!hasFailures) break;
        
        retries++;
        if (retries < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
  }
}

export const offlineStore = new CacheManager();
export const syncQueue = new SyncQueue(offlineStore);
export const backgroundSync = new BackgroundSyncService(syncQueue);
