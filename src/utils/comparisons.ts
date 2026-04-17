/**
 * Utility per comparazioni efficienti di dati
 * 
 * Ottimizzazioni per evitare JSON.stringify su oggetti grandi
 * che può essere costoso in performance e memoria
 */

/**
 * Comparazione shallow di due array
 * Usata per array di oggetti con ID
 */
export function shallowArrayEqual<T extends { id?: string | number }>(
  arr1: T[],
  arr2: T[]
): boolean {
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].id !== arr2[i].id) return false;
  }
  
  return true;
}

/**
 * Comparazione shallow di due oggetti
 * Controlla solo le chiavi e i valori primitivi
 */
export function shallowEqual<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T
): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

/**
 * Comparazione deep semplificata per oggetti annidati
 * Più efficiente di JSON.stringify per oggetti di media grandezza
 */
export function deepEqual<T>(obj1: T, obj2: T, maxDepth: number = 3): boolean {
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
    
    // Array comparison
    if (Array.isArray(val1) && Array.isArray(val2)) {
      return shallowArrayEqual(val1, val2);
    }
    
    // Object comparison (ricorsiva con depth limit)
    if (maxDepth > 0) {
      return deepEqual(val1 as object, val2 as object, maxDepth - 1);
    }
    
    return false;
  });
}

/**
 * Comparazione specifica per MealPlan objects
 * Ottimizzata per la struttura del meal planner
 */
export function mealPlanEqual(
  plan1: Record<string, Record<string, unknown[]>>,
  plan2: Record<string, Record<string, unknown[]>>
): boolean {
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
      
      // Comparazione basata su ID per gli entry
      for (let i = 0; i < arr1.length; i++) {
        const entry1 = arr1[i] as { id?: string };
        const entry2 = arr2[i] as { id?: string };
        
        if (entry1.id !== entry2.id) return false;
      }
    }
  }
  
  return true;
}
