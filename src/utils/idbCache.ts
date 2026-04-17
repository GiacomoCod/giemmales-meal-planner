/**
 * IndexedDB Cache per Meal Planner
 *
 * Strategia di cache:
 * - Cache-First: I dati vengono prima letti da IndexedDB
 * - Network Update: Firestore aggiorna la cache in background
 * - TTL: Cache valida per 24 ore (rinfrescata al primo accesso dopo scadenza)
 *
 * OTTIMIZZAZIONI SAFARI/iOS:
 * - TTL ridotti (6h invece di 24h) su iOS
 * - Limite max 500 item per collection su iOS
 * - Cleanup automatico LRU quando si supera il limite
 * - Max 30MB cache totale su iOS (100MB Safari desktop)
 *
 * Collezioni cached:
 * - shoppingList, recipes, tags, events, expenses, cleaningLogs, roomTasks, mealPlans
 */

import {
  isIOS,
  isSafari,
  MAX_ITEMS_PER_COLLECTION,
  MAX_CACHE_SIZE_MB,
  estimateArraySize,
  applyLRUCleanup,
  logMemoryWarning,
  needsUrgentCleanup,
  CLEANUP_INTERVAL_MINUTES
} from './safariOptimizations';

const DB_NAME = 'meal-planner-cache';
const DB_VERSION = 1;

// TTL base (verranno adattati per Safari/iOS tramite SAFARI_TTL_FACTOR)
const BASE_CACHE_TTL: Record<CollectionName, number> = {
  shoppingList: 24 * 60 * 60 * 1000,      // 24 ore
  recipes: 24 * 60 * 60 * 1000,           // 24 ore
  tags: 24 * 60 * 60 * 1000,              // 24 ore
  events: 24 * 60 * 60 * 1000,            // 24 ore
  expenses: 24 * 60 * 60 * 1000,          // 24 ore
  cleaningLogs: 24 * 60 * 60 * 1000,      // 24 ore
  roomTasks: 24 * 60 * 60 * 1000,         // 24 ore
  mealPlans: 7 * 24 * 60 * 60 * 1000,     // 7 giorni (cache mensile)
  notifications: 6 * 60 * 60 * 1000       // 6 ore (dati più "freschi")
};

// TTL adattati per la piattaforma (ridotti su iOS/Safari)
const CACHE_TTL: Record<CollectionName, number> = {
  shoppingList: Math.floor(BASE_CACHE_TTL.shoppingList * (isIOS() ? 0.25 : 1)),      // 6h su iOS
  recipes: Math.floor(BASE_CACHE_TTL.recipes * (isIOS() ? 0.25 : 1)),                // 6h su iOS
  tags: Math.floor(BASE_CACHE_TTL.tags * (isIOS() ? 0.25 : 1)),                      // 6h su iOS
  events: Math.floor(BASE_CACHE_TTL.events * (isIOS() ? 0.25 : 1)),                  // 6h su iOS
  expenses: Math.floor(BASE_CACHE_TTL.expenses * (isIOS() ? 0.25 : 1)),              // 6h su iOS
  cleaningLogs: Math.floor(BASE_CACHE_TTL.cleaningLogs * (isIOS() ? 0.25 : 1)),      // 6h su iOS
  roomTasks: Math.floor(BASE_CACHE_TTL.roomTasks * (isIOS() ? 0.25 : 1)),            // 6h su iOS
  mealPlans: Math.floor(BASE_CACHE_TTL.mealPlans * (isIOS() ? 0.5 : 1)),             // 3.5gg su iOS
  notifications: Math.floor(BASE_CACHE_TTL.notifications * (isIOS() ? 0.5 : 1))      // 3h su iOS
};

export interface CachedData<T> {
  data: T[];
  timestamp: number;
  profileId: string;
}

// Mappatura delle collection supportate
export type CollectionName = 
  | 'shoppingList'
  | 'recipes'
  | 'tags'
  | 'events'
  | 'expenses'
  | 'cleaningLogs'
  | 'roomTasks'
  | 'mealPlans'
  | 'notifications';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Apre/crea il database IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Crea gli object store per ogni collection
      const collections: CollectionName[] = [
        'shoppingList', 'recipes', 'tags', 'events', 
        'expenses', 'cleaningLogs', 'roomTasks', 'mealPlans', 'notifications'
      ];

      collections.forEach(collection => {
        if (!db.objectStoreNames.contains(collection)) {
          const store = db.createObjectStore(collection, { keyPath: 'id' });
          store.createIndex('profileId', 'profileId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      });

      // Store per metadata (timestamp ultimo sync, ecc.)
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

/**
 * Salva i dati nella cache IndexedDB con ottimizzazioni Safari/iOS
 * - Applica limite max item per collection
 * - Esegue cleanup LRU se necessario
 * - Monitora dimensione cache
 */
export async function saveToCache<T extends { id: string }>(
  collection: CollectionName,
  profileId: string,
  data: T[]
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(collection, 'readwrite');
    const store = tx.objectStore(collection);

    // 1. Applica rimozione item scaduti (TTL enforcement)
    // Nota: i dati in ingresso non hanno timestamp, saltiamo questo step
    // Il TTL viene applicato ai dati già in cache con timestamp
    let limited = data;

    // 2. Applica limite max item (più stringente su iOS)
    if (data.length > MAX_ITEMS_PER_COLLECTION) {
      // Aggiungi timestamp temporaneo per LRU
      const withTimestamp = data.map((item, idx) => ({
        ...item,
        timestamp: Date.now() - (data.length - idx) * 1000 // Timestamp scalati
      }));
      const cleaned = applyLRUCleanup(withTimestamp, MAX_ITEMS_PER_COLLECTION);
      limited = cleaned.map(({ timestamp: _t, ...rest }) => rest as unknown as T);
    }

    // 3. Clear existing data for this profile
    const clearRequest = store.clear();

    await new Promise<void>((resolve, reject) => {
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // 4. Insert new data with metadata
    const timestamp = Date.now();
    const itemsWithMeta = limited.map(item => ({
      ...item,
      profileId,
      timestamp
    }));

    itemsWithMeta.forEach(item => {
      store.put(item);
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // 5. Update metadata
    await updateMetadata(`${collection}_last_sync`, timestamp);
    await updateMetadata(`${collection}_count`, limited.length);

    // 6. Log ottimizzazioni (solo se abbiamo ridotto dati)
    if (limited.length < data.length) {
      const reduction = ((data.length - limited.length) / data.length * 100).toFixed(1);
      console.log(
        `[IDB][Safari Opt] ${collection}: ottimizzato ${data.length} -> ${limited.length} ` +
        `item (-${reduction}%)`
      );
    }

  } catch (error) {
    console.error(`[IDB] Error saving to cache (${collection}):`, error);
  }
}

/**
 * Legge i dati dalla cache IndexedDB
 */
export async function getFromCache<T extends { id: string }>(
  collection: CollectionName,
  profileId: string
): Promise<T[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(collection, 'readonly');
    const store = tx.objectStore(collection);
    const index = store.index('profileId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(profileId);
      
      request.onsuccess = () => {
        const results = request.result as (T & { profileId: string; timestamp: number })[];
        // Rimuovi metadata interni mantenendo il tipo T
        const data = results.map(({ profileId: _p, timestamp: _t, ...rest }) => rest as unknown as T);
        resolve(data);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`[IDB] Error reading from cache (${collection}):`, error);
    return [];
  }
}

/**
 * Verifica se la cache è valida (entro TTL)
 */
export async function isCacheValid(collection: CollectionName): Promise<boolean> {
  try {
    const lastSync = await getMetadata<number>(`${collection}_last_sync`);
    if (!lastSync) return false;

    const now = Date.now();
    const ttl = CACHE_TTL[collection] || CACHE_TTL.shoppingList;
    return (now - lastSync) < ttl;
  } catch (error) {
    console.error(`[IDB] Error checking cache validity (${collection}):`, error);
    return false;
  }
}

/**
 * Ottieni il timestamp dell'ultimo sync
 */
export async function getLastSyncTime(collection: CollectionName): Promise<number | null> {
  return getMetadata(`${collection}_last_sync`);
}

/**
 * Aggiorna un metadata
 */
async function updateMetadata<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    store.put({ key, value });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error(`[IDB] Error updating metadata (${key}):`, error);
  }
}

/**
 * Legge un metadata
 */
async function getMetadata<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result?.value ?? null);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`[IDB] Error reading metadata (${key}):`, error);
    return null;
  }
}

/**
 * Elimina la cache per un profilo specifico
 */
export async function clearProfileCache(profileId: string): Promise<void> {
  try {
    const db = await openDB();
    const collections: CollectionName[] = [
      'shoppingList', 'recipes', 'tags', 'events', 
      'expenses', 'cleaningLogs', 'roomTasks', 'mealPlans', 'notifications'
    ];

    for (const collection of collections) {
      const tx = db.transaction(collection, 'readwrite');
      const store = tx.objectStore(collection);
      const index = store.index('profileId');

      await new Promise<void>((resolve, reject) => {
        const request = index.getAllKeys(profileId);
        request.onsuccess = async () => {
          const keys = request.result as string[];
          for (const key of keys) {
            await new Promise<void>((delResolve, delReject) => {
              const delRequest = store.delete(key);
              delRequest.onsuccess = () => delResolve();
              delRequest.onerror = () => delReject(delRequest.error);
            });
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }

    console.log(`[IDB] Cleared cache for profile: ${profileId}`);
  } catch (error) {
    console.error('[IDB] Error clearing profile cache:', error);
  }
}

/**
 * Elimina tutta la cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    dbPromise = null; // Reset connection
    const request = indexedDB.deleteDatabase(DB_NAME);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IDB] Error clearing all cache:', error);
  }
}

// ============================================================================
// FUNZIONI PER MONITORAGGIO E CLEANUP PROATTIVO (SAFARI OPTIMIZATIONS)
// ============================================================================

// Cache interna per tracking dimensioni (in-memory, leggera)
let cachedSizes: Record<CollectionName, number> = {
  shoppingList: 0,
  recipes: 0,
  tags: 0,
  events: 0,
  expenses: 0,
  cleaningLogs: 0,
  roomTasks: 0,
  mealPlans: 0,
  notifications: 0
};

/**
 * Stima la dimensione corrente della cache per una collection
 */
export async function estimateCacheSize(collection: CollectionName): Promise<number> {
  try {
    const data = await getFromCache(collection, 'current');
    const sizeBytes = estimateArraySize(data);
    cachedSizes[collection] = sizeBytes;
    return sizeBytes;
  } catch {
    return 0;
  }
}

/**
 * Calcola la dimensione totale stimata di tutte le cache
 */
export async function getTotalCacheSize(): Promise<{
  totalBytes: number;
  totalMB: string;
  usagePercent: number;
  isNearLimit: boolean;
}> {
  const collections: CollectionName[] = [
    'shoppingList', 'recipes', 'tags', 'events',
    'expenses', 'cleaningLogs', 'roomTasks', 'mealPlans', 'notifications'
  ];

  let totalBytes = 0;
  
  for (const collection of collections) {
    const size = await estimateCacheSize(collection);
    totalBytes += size;
  }

  const totalMB = totalBytes / (1024 * 1024);
  const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
  const usagePercent = (totalBytes / maxBytes) * 100;
  const isNearLimit = usagePercent > 80;

  return {
    totalBytes,
    totalMB: totalMB.toFixed(2),
    usagePercent: parseFloat(usagePercent.toFixed(1)),
    isNearLimit
  };
}

/**
 * Esegue cleanup proattivo su tutte le collection
 * Chiama quando la cache si avvicina al limite
 */
export async function performProactiveCleanup(): Promise<void> {
  try {
    const usage = await getTotalCacheSize();
    
    console.log(
      `[IDB][Safari Opt] Cache usage: ${usage.totalMB}MB ` +
      `(${usage.usagePercent}% of ${MAX_CACHE_SIZE_MB}MB) ` +
      `${isIOS() ? '(iOS)' : isSafari() ? '(Safari)' : '(Other)'}`
    );

    if (!usage.isNearLimit && !needsUrgentCleanup({
      estimatedCacheSizeMB: parseFloat(usage.totalMB),
      isNearLimit: usage.isNearLimit,
      usagePercent: usage.usagePercent,
      platform: isIOS() ? 'iOS' : isSafari() ? 'Safari' : 'Other'
    })) {
      return; // Non serve cleanup
    }

    logMemoryWarning({
      estimatedCacheSizeMB: parseFloat(usage.totalMB),
      isNearLimit: usage.isNearLimit,
      usagePercent: usage.usagePercent,
      platform: isIOS() ? 'iOS' : isSafari() ? 'Safari' : 'Other'
    });

    // Cleanup aggressivo: riduci TTL e max items per tutte le collection
    const collections: CollectionName[] = [
      'shoppingList', 'recipes', 'tags', 'events',
      'expenses', 'cleaningLogs', 'roomTasks', 'mealPlans', 'notifications'
    ];

    for (const collection of collections) {
      const data = await getFromCache(collection, 'current');
      
      if (data.length === 0) continue;

      // Filtra item scaduti basandosi sul timestamp salvato in cache
      const now = Date.now();
      const aggressiveTTL = Math.floor(CACHE_TTL[collection] * 0.5);
      const cutoff = now - aggressiveTTL;
      const notExpired = data.filter(item => {
        const itemTime = (item as any).timestamp ?? 0;
        return itemTime >= cutoff;
      });

      // Applica limite item più stringente
      const strictLimit = Math.floor(MAX_ITEMS_PER_COLLECTION * 0.7);
      let limited = notExpired;
      
      if (notExpired.length > strictLimit) {
        // Ordina per timestamp e prendi i più recenti
        const sorted = [...notExpired].sort((a, b) => {
          const timeA = (a as any).timestamp ?? 0;
          const timeB = (b as any).timestamp ?? 0;
          return timeB - timeA;
        });
        limited = sorted.slice(0, strictLimit);
      }

      if (limited.length < data.length) {
        // Rimuovi i metadati interni prima di salvare
        const cleaned = limited.map(item => {
          const { timestamp: _t, profileId: _p, ...rest } = item as any;
          return rest;
        });
        // Riscrivi cache pulita
        await saveToCache(collection, 'current', cleaned);
        console.log(
          `[IDB][Cleanup] ${collection}: ${data.length} -> ${limited.length} items`
        );
      }
    }

    console.log('[IDB][Safari Opt] Proactive cleanup completed');

  } catch (error) {
    console.error('[IDB] Error during proactive cleanup:', error);
  }
}

/**
 * Inizia il cleanup automatico periodico
 * Da chiamare all'avvio dell'app
 */
export function startAutoCleanup(): () => void {
  const intervalMs = CLEANUP_INTERVAL_MINUTES * 60 * 1000;
  
  console.log(
    `[IDB][Safari Opt] Starting auto-cleanup every ${CLEANUP_INTERVAL_MINUTES}m ` +
    `(max ${MAX_CACHE_SIZE_MB}MB)`
  );

  const intervalId = setInterval(() => {
    performProactiveCleanup();
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Ottiene una cache key per mealPlans basata sul mese
 * (permette di cached diversi mesi separatamente)
 */
export function getMealPlanCacheKey(yearMonth: string): string {
  return `mealPlans_${yearMonth}`;
}

/**
 * Salva meal plan per un specifico mese
 */
export async function saveMealPlansToCache<T>(
  profileId: string,
  yearMonth: string,
  data: T
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('mealPlans', 'readwrite');
    const store = tx.objectStore('mealPlans');
    
    const key = getMealPlanCacheKey(yearMonth);
    const timestamp = Date.now();
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: key,
        profileId,
        timestamp,
        yearMonth,
        data
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await updateMetadata(`mealPlans_${yearMonth}_last_sync`, timestamp);
    console.log(`[IDB] Cached mealPlans for ${yearMonth}`);
  } catch (error) {
    console.error('[IDB] Error saving mealPlans cache:', error);
  }
}

/**
 * Legge meal plan per un specifico mese
 */
export async function getMealPlansFromCache<T>(
  profileId: string,
  yearMonth: string
): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('mealPlans', 'readonly');
    const store = tx.objectStore('mealPlans');
    
    const key = getMealPlanCacheKey(yearMonth);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.profileId === profileId) {
          resolve(result.data as T);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IDB] Error reading mealPlans cache:', error);
    return null;
  }
}

/**
 * Verifica se cache mealPlans è valida per un mese specifico
 */
export async function isMealPlansCacheValid(yearMonth: string): Promise<boolean> {
  try {
    const lastSync = await getMetadata<number>(`mealPlans_${yearMonth}_last_sync`);
    if (!lastSync) return false;

    const now = Date.now();
    const ttl = CACHE_TTL.mealPlans;
    return (now - lastSync) < ttl;
  } catch (error) {
    console.error(`[IDB] Error checking mealPlans cache validity:`, error);
    return false;
  }
}

/**
 * Hook React per usare la cache IndexedDB con Firestore
 */
export function useIndexedDBCache() {
  return {
    saveToCache,
    getFromCache,
    isCacheValid,
    getLastSyncTime,
    clearProfileCache,
    clearAllCache
  };
}
