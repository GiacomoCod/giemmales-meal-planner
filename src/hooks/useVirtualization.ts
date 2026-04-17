/**
 * Hook per determinare se usare virtualizzazione
 *
 * @param items - Array di elementi da controllare
 * @param threshold - Soglia per abilitare virtualizzazione (default: 50)
 * @returns true se gli elementi superano la soglia
 */
export function useVirtualization<T>(
  items: T[],
  threshold: number = 50
): boolean {
  return items.length >= threshold;
}
