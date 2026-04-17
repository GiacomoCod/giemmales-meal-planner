import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  QueryConstraint,
  Firestore,
  limit
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

interface UseFirestoreListOptions<T> {
  db: Firestore;
  collectionPath: string;
  constraints?: QueryConstraint[];
  transform?: (doc: DocumentData, id: string) => T;
  /**
   * Limit per la query Firestore.
   * Se specificato, viene aggiunto automaticamente alle constraints.
   * Priorità: questo parametro overridea eventuali limit() già presenti in constraints.
   */
  limit?: number;
  enabled?: boolean;
  onRead?: (count: number) => void;
}

interface UseFirestoreListResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook ottimizzato per liste Firestore con:
 * - Cleanup automatico della sottoscrizione
 * - Loading state gestito correttamente
 * - Error handling
 * - Callback per tracking letture
 * - Memoizzazione del risultato
 * - **Limit applicato lato server (Firestore)** per query ottimizzate
 */
export function useFirestoreList<T extends { id?: string }>({
  db,
  collectionPath,
  constraints = [],
  transform = (data, id) => ({ ...data, id } as T),
  limit: maxLimit,
  enabled = true,
  onRead
}: UseFirestoreListOptions<T>): UseFirestoreListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Validate inputs
  useEffect(() => {
    if (!collectionPath || typeof collectionPath !== 'string') {
      setError(new Error('Invalid collection path provided'));
      setIsLoading(false);
    }
  }, [collectionPath]);

  // Memoize the transform function to prevent unnecessary re-renders
  const memoizedTransform = useMemo(() => transform, [transform]);

  const refresh = useCallback(async () => {
    // Force refresh by toggling enabled
    setIsLoading(true);
    setError(null);
  }, []);

  // Build constraints con limit applicato lato server
  const finalConstraints = useMemo(() => {
    const baseConstraints = [...constraints];
    
    // Se è specificato un limit, aggiungilo alle constraints (lato server)
    // Rimuovi eventuali limit() già presenti per evitare duplicati
    const filteredConstraints = baseConstraints.filter(c => {
      const type = (c as any).type;
      return type !== 'limit';
    });
    
    if (maxLimit && maxLimit > 0) {
      return [...filteredConstraints, limit(maxLimit)];
    }
    
    return filteredConstraints;
  }, [constraints, maxLimit]);

  useEffect(() => {
    if (!enabled || !collectionPath || typeof collectionPath !== 'string') {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    // Query con constraints ottimizzate (limit applicato lato Firestore)
    const q = query(collection(db, collectionPath), ...finalConstraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted) return;

        const items = snapshot.docs.map(doc =>
          memoizedTransform(doc.data(), doc.id)
        );

        setData(items);
        setIsLoading(false);
        setError(null);

        if (onRead) {
          onRead(snapshot.docs.length);
        }
      },
      (err) => {
        if (!isMounted) return;

        console.error(`[useFirestoreList] Error on ${collectionPath}:`, err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, collectionPath, finalConstraints, onRead, memoizedTransform, enabled]);

  return { data, isLoading, error, refresh };
}