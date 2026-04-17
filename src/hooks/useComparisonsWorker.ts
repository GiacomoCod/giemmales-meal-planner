import { useCallback, useEffect } from 'react';
import { useWorker } from '../hooks/useWorker';

/**
 * Hook per comparazioni dati tramite Web Worker
 * Non blocca il thread principale durante comparazioni di oggetti grandi
 */
export function useComparisonsWorker() {
  const { initWorker, execute, terminate, isReady } = useWorker<Worker>();

  // Inizializza il worker
  useEffect(() => {
    const workerFactory = () => new Worker(
      new URL('../workers/comparisons.worker.ts', import.meta.url),
      { type: 'module' }
    );
    initWorker(workerFactory);
  }, [initWorker]);

  // Comparazione deep
  const deepEqual = useCallback(async <T>(obj1: T, obj2: T, maxDepth: number = 3): Promise<boolean> => {
    if (!isReady) {
      // Fallback sincrono se worker non pronto
      const shallowArrayEqual = <U extends { id?: string | number }>(arr1: U[], arr2: U[]): boolean => {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
          if (arr1[i].id !== arr2[i].id) return false;
        }
        return true;
      };

      const deepEqualSync = <U>(o1: U, o2: U, depth: number): boolean => {
        if (o1 === o2) return true;
        if (typeof o1 !== 'object' || typeof o2 !== 'object' || o1 === null || o2 === null) return false;
        
        const keys1 = Object.keys(o1) as Array<keyof U>;
        const keys2 = Object.keys(o2) as Array<keyof U>;
        if (keys1.length !== keys2.length) return false;
        
        return keys1.every(key => {
          const v1 = o1[key];
          const v2 = o2[key];
          if (v1 === v2) return true;
          if (typeof v1 !== 'object' || typeof v2 !== 'object') return false;
          if (v1 === null || v2 === null) return false;
          if (Array.isArray(v1) && Array.isArray(v2)) return shallowArrayEqual(v1, v2);
          if (depth > 0) return deepEqualSync(v1 as object, v2 as object, depth - 1);
          return false;
        });
      };
      
      return deepEqualSync(obj1, obj2, maxDepth);
    }

    return execute<boolean>('deepEqual', [obj1, obj2, maxDepth]);
  }, [execute, isReady]);

  // Comparazione MealPlan
  const mealPlanEqual = useCallback(async (
    plan1: Record<string, Record<string, unknown[]>>,
    plan2: Record<string, Record<string, unknown[]>>
  ): Promise<boolean> => {
    if (!isReady) {
      // Fallback sincrono se worker non pronto
      const keys1 = Object.keys(plan1);
      const keys2 = Object.keys(plan2);
      if (keys1.length !== keys2.length) return false;

      for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        const entries1 = plan1[key];
        const entries2 = plan2[key];
        const mealKeys1 = Object.keys(entries1);
        const mealKeys2 = Object.keys(entries2);
        if (mealKeys1.length !== mealKeys2.length) return false;

        for (const mealKey of mealKeys1) {
          const arr1 = entries1[mealKey];
          const arr2 = entries2[mealKey];
          if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
          for (let i = 0; i < arr1.length; i++) {
            if ((arr1[i] as { id?: string }).id !== (arr2[i] as { id?: string }).id) return false;
          }
        }
      }
      return true;
    }

    return execute<boolean>('mealPlanEqual', [plan1, plan2]);
  }, [execute, isReady]);

  return {
    deepEqual,
    mealPlanEqual,
    isReady,
    terminate
  };
}
