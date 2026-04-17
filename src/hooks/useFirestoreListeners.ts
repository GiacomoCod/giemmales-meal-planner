import { useEffect, useRef, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  query,
  QueryConstraint,
  doc,
  DocumentReference,
  CollectionReference,
  Firestore
} from 'firebase/firestore';
import type { DocumentData, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore';

interface ListenerConfig {
  path: string;
  type: 'collection' | 'document';
  constraints?: QueryConstraint[];
  idField?: string;
  transform?: (data: DocumentData, id?: string) => unknown;
  sort?: (a: unknown, b: unknown) => number;
  enabled?: boolean;
  onRead?: (count: number) => void;
}

interface UseFirestoreListenersOptions {
  db: Firestore;
  profileId: string;
  colPath: (name: string) => string;
  configs: ListenerConfig[];
  setSessionReads?: (updater: (prev: number) => number) => void;
  enabled?: boolean;
}

/**
 * Hook ottimizzato per gestire multipli listener Firestore con:
 * - Cleanup centralizzato
 * - Sottoscrizioni condizionali
 * - Tracking letture
 * - Error handling uniforme
 */
export function useFirestoreListeners({
  db,
  profileId,
  colPath,
  configs,
  setSessionReads,
  enabled = true
}: UseFirestoreListenersOptions) {
  const cleanupRef = useRef<(() => void)[]>([]);

  const unsubscribeAll = useCallback(() => {
    cleanupRef.current.forEach(unsub => unsub());
    cleanupRef.current = [];
  }, []);

  useEffect(() => {
    if (!enabled || profileId === 'guest') {
      unsubscribeAll();
      return;
    }

    console.log("[FIREBASE] Sottoscrizione listeners globali per:", profileId);

    // Esegui cleanup precedente
    unsubscribeAll();

    // Sottoscrivi tutti i listener configurati
    configs.forEach(config => {
      if (!config.enabled) return;

      const fullPath = config.path.startsWith('profiles/')
        ? config.path
        : colPath(config.path);

      if (config.type === 'document') {
        const ref = doc(db, fullPath) as DocumentReference;
        const unsubscribe = onSnapshot(
          ref,
          (snapshot: DocumentSnapshot) => {
            const count = snapshot.exists() ? 1 : 0;
            if (setSessionReads) {
              setSessionReads(prev => prev + count);
            }
            if (config.onRead) {
              config.onRead(count);
            }
          },
          (error: Error) => {
            console.error(`[FIREBASE] Error on ${fullPath}:`, error);
          }
        );
        cleanupRef.current.push(unsubscribe);
      } else {
        const ref = collection(db, fullPath) as CollectionReference;
        const q = config.constraints?.length
          ? query(ref, ...config.constraints)
          : ref;
        
        const unsubscribe = onSnapshot(
          q,
          (snapshot: QuerySnapshot) => {
            const count = snapshot.docs.length;
            if (setSessionReads) {
              setSessionReads(prev => prev + count);
            }
            if (config.onRead) {
              config.onRead(count);
            }
          },
          (error: Error) => {
            console.error(`[FIREBASE] Error on ${fullPath}:`, error);
          }
        );
        cleanupRef.current.push(unsubscribe);
      }
    });

    return () => {
      console.log("[FIREBASE] Pulizia listeners globali per:", profileId);
      unsubscribeAll();
    };
  }, [db, profileId, colPath, enabled, setSessionReads, configs, unsubscribeAll]);

  return { unsubscribeAll };
}

/**
 * Hook specifico per listener singolo con state management
 */
export function useFirestoreListener(
  subscribe: () => () => void,
  options: {
    enabled?: boolean;
  } = {}
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe();

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe]);
}
