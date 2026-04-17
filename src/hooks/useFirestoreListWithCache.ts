import { useEffect, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  QueryConstraint,
  Firestore
} from 'firebase/firestore';
import {
  getFromCache,
  isCacheValid,
  type CollectionName
} from '../utils/idbCache';

interface UseFirestoreListWithCacheOptions<T> {
  db: Firestore;
  collectionPath: string;
  collectionName: CollectionName;
  profileId: string;
  constraints?: readonly QueryConstraint[];
  enabled?: boolean;
  onDataChange?: (data: T[], fromFirestore: boolean) => void;
}

/**
 * Hook Firestore con cache IndexedDB - Versione per integrazione graduale
 * 
 * Questo hook mantiene la stessa interfaccia dei listener esistenti,
 * aggiungendo transparentemente la cache IndexedDB.
 * 
 * @deprecated Usare useCachedFirestoreList per nuovi sviluppi
 */
export function useFirestoreListWithCache<T extends { id: string }>({
  db,
  collectionPath,
  collectionName,
  profileId,
  constraints = [],
  enabled = true,
  onDataChange
}: UseFirestoreListWithCacheOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // Carica dalla cache al mount
  useEffect(() => {
    isMountedRef.current = true;

    const loadFromCache = async () => {
      if (!enabled || profileId === 'guest') {
        setIsLoading(false);
        return;
      }

      try {
        const valid = await isCacheValid(collectionName);
        const cachedData = await getFromCache<T>(collectionName, profileId);

        if (cachedData.length > 0 && isMountedRef.current) {
          setData(cachedData);
          setIsLoading(false);
          setHasInitialized(true);
          
          if (valid) {
            console.log(`[IDB] Loaded ${cachedData.length} items from valid cache (${collectionName})`);
          } else {
            console.log(`[IDB] Loaded ${cachedData.length} items from expired cache (placeholder) (${collectionName})`);
          }
          
          if (onDataChange) {
            onDataChange(cachedData, false);
          }
        }
      } catch (err) {
        console.error(`[IDB] Error loading cache:`, err);
      }
    };

    loadFromCache();

    return () => {
      isMountedRef.current = false;
    };
  }, [collectionName, profileId, enabled, onDataChange]);

  // Sottoscrive listener Firestore
  useEffect(() => {
    if (!enabled || profileId === 'guest') {
      return;
    }

    setIsLoading(true);

    const q = constraints && constraints.length > 0
      ? query(collection(db, collectionPath), ...constraints)
      : collection(db, collectionPath);

    unsubscribeRef.current = onSnapshot(
      q,
      async (snapshot) => {
        if (!isMountedRef.current) return;

        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as T));

        // Aggiorna stato
        setData(items);
        setIsLoading(false);
        setHasInitialized(true);

        // CACHE DISABILITATA TEMPORANEAMENTE - causa memory leak
        // Le scritture IndexedDB in background si accumulano e non vengono pulite
        // TODO: Implementare cache con cleanup corretto e debounce
        /*
        try {
          await saveToCache(collectionName, profileId, items);
          console.log(`[IDB] Cached ${items.length} items (${collectionName})`);
        } catch (err) {
          console.error(`[IDB] Error saving cache:`, err);
        }
        */

        // Callback opzionale per tracking
        if (onDataChange) {
          onDataChange(items, true);
        }
      },
      (err) => {
        if (!isMountedRef.current) return;

        console.error(`[Firestore] Error on ${collectionPath}:`, err);
        setIsLoading(false);
        setHasInitialized(true);

        // Fallback: usa cache se disponibile
        if (data.length === 0) {
          getFromCache<T>(collectionName, profileId).then(cached => {
            if (cached.length > 0 && isMountedRef.current) {
              setData(cached);
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
    enabled,
    onDataChange,
    data.length
  ]);

  return { data, isLoading, hasInitialized };
}
