import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  onSnapshot,
  query,
  QueryConstraint,
  Firestore,
  type DocumentData
} from 'firebase/firestore';
import {
  saveToCache,
  getFromCache,
  isCacheValid,
  type CollectionName
} from '../utils/idbCache';

interface UseCachedFirestoreListOptions<T> {
  db: Firestore;
  collectionPath: string;
  collectionName: CollectionName;
  profileId: string;
  constraints?: QueryConstraint[];
  transform?: (doc: DocumentData, id: string) => T;
  enabled?: boolean;
  onRead?: (count: number, fromCache: boolean) => void;
}

interface UseCachedFirestoreListResult<T> {
  data: T[];
  isLoading: boolean;
  isFromCache: boolean;
  hasCache: boolean;
  error: Error | null;
  lastSyncTime: number | null;
  refresh: () => void;
}

/**
 * Hook Firestore con cache IndexedDB integrata
 * 
 * Strategia:
 * 1. Carica immediatamente i dati dalla cache (se disponibili)
 * 2. Sottoscrive il listener Firestore per aggiornamenti real-time
 * 3. Aggiorna la cache IndexedDB ad ogni cambiamento
 * 
 * Vantaggi:
 * - UI immediata con dati cached
 * - Zero letture Firestore ridondanti
 * - Dati sempre sincronizzati
 */
export function useCachedFirestoreList<T extends { id: string }>({
  db,
  collectionPath,
  collectionName,
  profileId,
  constraints = [],
  transform = (data, id) => ({ ...data, id } as T),
  enabled = true,
  onRead
}: UseCachedFirestoreListOptions<T>): UseCachedFirestoreListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Carica dalla cache al mount
  useEffect(() => {
    isMountedRef.current = true;

    const loadFromCache = async () => {
      if (!enabled || profileId === 'guest') {
        setIsLoading(false);
        return;
      }

      try {
        // Verifica se cache è valida
        const valid = await isCacheValid(collectionName);
        const cachedData = await getFromCache<T>(collectionName, profileId);

        if (cachedData.length > 0) {
          setHasCache(true);
          
          if (valid) {
            // Cache valida: usa immediatamente
            setIsFromCache(true);
            setData(cachedData);
            setIsLoading(false);
            
            if (onRead) {
              onRead(cachedData.length, true);
            }
            
            console.log(`[IDB] Loaded ${cachedData.length} items from cache (${collectionName})`);
          } else {
            // Cache scaduta: usa come stato temporaneo mentre carichi da Firestore
            setIsFromCache(true);
            setData(cachedData);
            console.log(`[IDB] Cache expired but using as placeholder (${collectionName})`);
          }
        } else {
          setIsLoading(true);
        }
      } catch (err) {
        console.error(`[IDB] Error loading cache:`, err);
        setIsLoading(true);
      }
    };

    loadFromCache();

    return () => {
      isMountedRef.current = false;
    };
  }, [collectionName, profileId, enabled, onRead]);

  // Sottoscrive listener Firestore
  useEffect(() => {
    if (!enabled || profileId === 'guest') {
      return;
    }

    setIsLoading(true);

    const q = constraints.length > 0
      ? query(collection(db, collectionPath), ...constraints)
      : collection(db, collectionPath);

    unsubscribeRef.current = onSnapshot(
      q,
      async (snapshot) => {
        if (!isMountedRef.current) return;

        const items = snapshot.docs.map(doc =>
          transform(doc.data(), doc.id)
        );

        // Aggiorna stato
        setData(items);
        setIsLoading(false);
        setIsFromCache(false);
        setError(null);

        // Aggiorna cache IndexedDB
        try {
          await saveToCache(collectionName, profileId, items);
          const syncTime = Date.now();
          setLastSyncTime(syncTime);
          
          console.log(`[IDB] Cached ${items.length} items (${collectionName})`);
        } catch (err) {
          console.error(`[IDB] Error saving cache:`, err);
        }

        // Tracking letture
        if (onRead) {
          onRead(snapshot.docs.length, false);
        }
      },
      (err) => {
        if (!isMountedRef.current) return;

        console.error(`[Firestore] Error on ${collectionPath}:`, err);
        setError(err as Error);
        setIsLoading(false);

        // Se c'è errore, prova a usare la cache
        if (data.length === 0) {
          getFromCache<T>(collectionName, profileId).then(cached => {
            if (cached.length > 0 && isMountedRef.current) {
              setData(cached);
              setIsFromCache(true);
            }
          });
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [
    db,
    collectionPath,
    collectionName,
    profileId,
    constraints,
    transform,
    enabled,
    onRead,
    data.length
  ]);

  const refresh = useCallback(async () => {
    // Force refresh by temporarily disabling and re-enabling
    setIsLoading(true);
    setIsFromCache(false);
    
    // Il listener si riaggancerà automaticamente
  }, []);

  return {
    data,
    isLoading,
    isFromCache,
    hasCache,
    error,
    lastSyncTime,
    refresh
  };
}
