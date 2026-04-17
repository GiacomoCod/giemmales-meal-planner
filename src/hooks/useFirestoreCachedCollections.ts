import { useEffect, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  QueryConstraint,
  Firestore,
  orderBy,
  where,
  documentId
} from 'firebase/firestore';
import {
  getFromCache,
  isCacheValid,
  getMealPlansFromCache,
  isMealPlansCacheValid
} from '../utils/idbCache';

/**
 * Hook specifico per notifications con cache IndexedDB
 * 
 * Le notifications hanno ordinamento timestamp desc, quindi:
 * - Cache le ultime N notifiche
 * - Ordina sempre localmente dopo il caricamento
 * - TTL più breve (6 ore) per dati "freschi"
 */
export function useNotificationsWithCache<T extends { id: string; timestamp?: number }>({
  db,
  collectionPath,
  profileId,
  constraints = [],
  enabled = true,
  onDataChange
}: {
  db: Firestore;
  collectionPath: string;
  profileId: string;
  constraints?: readonly QueryConstraint[];
  enabled?: boolean;
  onDataChange?: (data: T[], fromFirestore: boolean) => void;
}) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        const cachedData = await getFromCache<T>('notifications', profileId);

        if (cachedData.length > 0 && isMountedRef.current) {
          // Ordina per timestamp (decrescente)
          const sorted = [...cachedData].sort((a, b) => 
            (b.timestamp || 0) - (a.timestamp || 0)
          );
          setData(sorted);
          setIsLoading(false);
          
          const valid = await isCacheValid('notifications');
          console.log(`[IDB] Loaded ${sorted.length} notifications from ${valid ? 'valid' : 'expired'} cache`);
        }
      } catch (err) {
        console.error(`[IDB] Error loading notifications cache:`, err);
      }
    };

    loadFromCache();

    return () => {
      isMountedRef.current = false;
    };
  }, [collectionPath, profileId, enabled]);

  // Sottoscrive listener Firestore
  useEffect(() => {
    if (!enabled || profileId === 'guest') {
      return;
    }

    setIsLoading(true);

    // Aggiungi ordinamento timestamp se non presente
    const hasOrderBy = constraints.some(c => {
      const type = (c as any).type;
      return type === 'orderBy';
    });

    const finalConstraints = hasOrderBy
      ? constraints
      : [...constraints, orderBy('timestamp', 'desc')];

    const q = query(collection(db, collectionPath), ...finalConstraints);

    unsubscribeRef.current = onSnapshot(
      q,
      async (snapshot) => {
        if (!isMountedRef.current) return;

        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as T));

        // Ordina sempre localmente
        const sorted = [...items].sort((a, b) => 
          (b.timestamp || 0) - (a.timestamp || 0)
        );

        setData(sorted);
        setIsLoading(false);

        // CACHE DISABILITATA TEMPORANEAMENTE - causa memory leak
        // TODO: Riabilitare con debounce e cleanup corretto
        /*
        try {
          await saveToCache('notifications', profileId, sorted);
          console.log(`[IDB] Cached ${sorted.length} notifications`);
        } catch (err) {
          console.error(`[IDB] Error saving notifications cache:`, err);
        }
        */

        if (onDataChange) {
          onDataChange(sorted, true);
        }
      },
      (err) => {
        if (!isMountedRef.current) return;
        console.error(`[Firestore] Error on notifications:`, err);
        setIsLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [db, collectionPath, profileId, constraints, enabled, onDataChange]);

  return { data, isLoading };
}

/**
 * Hook specifico per mealPlans con cache IndexedDB per mese
 * 
 * I mealPlans sono queryati per intervallo date, quindi:
 * - Cache separata per ogni mese (mealPlans_2026-04)
 * - TTL di 7 giorni (cache "quasi permanente")
 * - Cache il mese corrente e adiacenti
 */
export function useMealPlansWithCache({
  db,
  collectionPath,
  profileId,
  yearMonth,
  startDate,
  endDate,
  enabled = true,
  onDataChange
}: {
  db: Firestore;
  collectionPath: string;
  profileId: string;
  yearMonth: string; // es. "2026-04"
  startDate: string; // es. "2026-03-01"
  endDate: string;   // es. "2026-05-31"
  enabled?: boolean;
  onDataChange?: (data: Record<string, any>, fromFirestore: boolean) => void;
}) {
  const [data, setData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
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
        const valid = await isMealPlansCacheValid(yearMonth);
        const cached = await getMealPlansFromCache<Record<string, any>>(profileId, yearMonth);

        if (cached && Object.keys(cached).length > 0) {
          setData(cached);
          setIsLoading(false);
          console.log(`[IDB] Loaded mealPlans for ${yearMonth} from ${valid ? 'valid' : 'expired'} cache`);
          
          if (onDataChange) {
            onDataChange(cached, false);
          }
        }
      } catch (err) {
        console.error(`[IDB] Error loading mealPlans cache:`, err);
      }
    };

    loadFromCache();

    return () => {
      isMountedRef.current = false;
    };
  }, [profileId, yearMonth, enabled, onDataChange]);

  // Sottoscrive listener Firestore
  useEffect(() => {
    if (!enabled || profileId === 'guest') {
      return;
    }

    setIsLoading(true);

    const q = query(
      collection(db, collectionPath),
      orderBy(documentId()),
      where(documentId(), '>=', startDate),
      where(documentId(), '<=', endDate)
    );

    unsubscribeRef.current = onSnapshot(
      q,
      async (snapshot) => {
        if (!isMountedRef.current) return;

        const newPlan: Record<string, any> = {};
        snapshot.forEach(d => { 
          newPlan[d.id] = d.data(); 
        });

        setData(newPlan);
        setIsLoading(false);

        // CACHE DISABILITATA TEMPORANEAMENTE - causa memory leak
        // TODO: Riabilitare con debounce e cleanup corretto
        /*
        try {
          await saveMealPlansToCache(profileId, yearMonth, newPlan);
          console.log(`[IDB] Cached mealPlans for ${yearMonth}`);
        } catch (err) {
          console.error(`[IDB] Error saving mealPlans cache:`, err);
        }
        */

        if (onDataChange) {
          onDataChange(newPlan, true);
        }
      },
      (err) => {
        if (!isMountedRef.current) return;
        console.error(`[Firestore] Error on mealPlans:`, err);
        setIsLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [db, collectionPath, profileId, yearMonth, startDate, endDate, enabled, onDataChange]);

  return { data, isLoading };
}
