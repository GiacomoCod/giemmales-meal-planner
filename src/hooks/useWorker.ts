/**
 * Hook React per utilizzare Web Workers in modo semplice
 * Gestisce creazione, comunicazione e cleanup del worker
 */
import { useEffect, useCallback, useRef, useState } from 'react';

interface WorkerMessage<T> {
  type: 'result' | 'error';
  data?: T;
  error?: string;
  jobId: string;
}

export function useWorker<WorkerType extends Worker>() {
  const workerRef = useRef<WorkerType | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingCallbacks = useRef<Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }>>(new Map());

  // Inizializza il worker
  const initWorker = useCallback((workerFactory: () => WorkerType) => {
    if (workerRef.current) return;

    try {
      const worker = workerFactory();
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<WorkerMessage<any>>) => {
        const { type, data, error, jobId } = event.data;
        const callback = pendingCallbacks.current.get(jobId);

        if (callback) {
          pendingCallbacks.current.delete(jobId);
          
          if (type === 'result') {
            callback.resolve(data);
          } else if (type === 'error') {
            callback.reject(new Error(error));
          }
        }
      };

      worker.onerror = (error) => {
        console.error('[Worker] Error:', error);
        pendingCallbacks.current.forEach((callback) => {
          callback.reject(new Error(error.message));
        });
        pendingCallbacks.current.clear();
      };

      setIsReady(true);
    } catch (error) {
      console.error('[Worker] Failed to initialize:', error);
      setIsReady(false);
    }
  }, []);

  // Esegui un calcolo nel worker
  const execute = useCallback(<T,>(method: string, params: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const jobId = `${method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      pendingCallbacks.current.set(jobId, { resolve, reject });

      workerRef.current.postMessage({
        method,
        params,
        jobId
      });
    });
  }, []);

  // Termina il worker
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsReady(false);
      pendingCallbacks.current.clear();
    }
  }, []);

  // Cleanup automatico
  useEffect(() => {
    return () => terminate();
  }, [terminate]);

  return {
    initWorker,
    execute,
    terminate,
    isReady
  };
}
