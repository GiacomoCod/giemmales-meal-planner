/**
 * Web Worker per comparazioni efficienti di dati
 * Esegue in un thread separato per non bloccare la UI
 */

/**
 * Comparazione shallow di due array
 */
const shallowArrayEqual = <T extends { id?: string | number }>(arr1: T[], arr2: T[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].id !== arr2[i].id) return false;
  }
  return true;
};

/**
 * Comparazione deep semplificata per oggetti annidati
 * Più efficiente di JSON.stringify per oggetti di media grandezza
 */
const deepEqual = <T>(obj1: T, obj2: T, maxDepth: number = 3): boolean => {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1) as Array<keyof T>;
  const keys2 = Object.keys(obj2) as Array<keyof T>;

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (val1 === val2) return true;
    if (typeof val1 !== 'object' || typeof val2 !== 'object') return false;
    if (val1 === null || val2 === null) return false;

    if (Array.isArray(val1) && Array.isArray(val2)) {
      return shallowArrayEqual(val1, val2);
    }

    if (maxDepth > 0) {
      return deepEqual(val1 as object, val2 as object, maxDepth - 1);
    }

    return false;
  });
};

/**
 * Comparazione specifica per MealPlan objects
 */
const mealPlanEqual = (
  plan1: Record<string, Record<string, unknown[]>>,
  plan2: Record<string, Record<string, unknown[]>>
): boolean => {
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
        const entry1 = arr1[i] as { id?: string };
        const entry2 = arr2[i] as { id?: string };

        if (entry1.id !== entry2.id) return false;
      }
    }
  }

  return true;
};

/**
 * Handler messaggi dal thread principale
 */
self.onmessage = (event: MessageEvent<{
  method: string;
  params: any[];
  jobId: string;
}>) => {
  const { method, params, jobId } = event.data;

  try {
    let result: any;

    switch (method) {
      case 'deepEqual':
        result = deepEqual(params[0], params[1], params[2]);
        break;
      
      case 'mealPlanEqual':
        result = mealPlanEqual(params[0], params[1]);
        break;
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }

    self.postMessage({
      type: 'result',
      data: result,
      jobId
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId
    });
  }
};

export default null as unknown as Worker;
