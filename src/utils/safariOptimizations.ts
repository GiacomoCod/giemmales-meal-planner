/**
 * Ottimizzazioni specifiche per Safari/iOS
 * 
 * Safari ha limiti di memoria più aggressivi:
 * - IndexedDB: ~50-80% dello spazio libero (vs 50GB+ Chrome)
 * - Compressione tab in background: scarica memoria aggressivamente
 * - LRU cache più stretto, especially su iOS
 * 
 * Queste ottimizzazioni prevengono crash da OOM (Out Of Memory)
 */

// ============================================================================
// RILEVAMENTO PIATTAFORMA
// ============================================================================

/**
 * Rileva se siamo su Safari (desktop o iOS)
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent;
  const vendor = window.navigator.vendor || '';
  
  // Safari desktop
  const isSafariDesktop = /^((?!chrome|android).)*safari/i.test(ua);
  
  // Safari iOS (iPhone, iPad, iPod)
  const isSafariIOS = /iP(ad|hone|od)/.test(ua) && 
    (vendor.includes('Apple') || ua.includes('Safari'));
  
  return isSafariDesktop || isSafariIOS;
}

/**
 * Rileva se siamo su iOS (iPhone, iPad, iPod)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent;
  return /iP(ad|hone|od)/.test(ua);
}

/**
 * Rileva se siamo su mobile (iOS o Android)
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
}

// ============================================================================
// CONFIGURAZIONI OTTIMIZZATE PER SAFARI
// ============================================================================

/**
 * Fattore di riduzione per TTL su Safari/iOS
 * Su iOS usiamo TTL 4x più brevi (6h invece di 24h)
 */
export const SAFARI_TTL_FACTOR = isIOS() ? 0.25 : 1;

/**
 * Limite massimo di item per collection su Safari/iOS
 * Previene accumulo eccessivo di dati in memoria
 */
export const MAX_ITEMS_PER_COLLECTION = isIOS() ? 500 : 2000;

/**
 * Limite massimo dimensione cache stimata (in MB)
 * Safari iOS: 30MB (conservativo, limite reale ~50-80MB)
 * Safari desktop: 100MB
 * Altri browser: 500MB
 */
export const MAX_CACHE_SIZE_MB = isIOS() 
  ? 30 
  : isSafari() 
    ? 100 
    : 500;

/**
 * Intervallo di cleanup automatico (in minuti)
 * Su iOS: ogni 15 minuti
 * Su Safari desktop: ogni 30 minuti
 * Altri: ogni 60 minuti
 */
export const CLEANUP_INTERVAL_MINUTES = isIOS()
  ? 15
  : isSafari()
    ? 30
    : 60;

// ============================================================================
// STIMA DIMENSIONE DATI
// ============================================================================

/**
 * Stima la dimensione in byte di un oggetto JavaScript
 * Usa una stima conservativa basata sulla serializzazione JSON
 */
export function estimateObjectSize(obj: unknown): number {
  try {
    const str = JSON.stringify(obj);
    // Ogni carattere UTF-16 occupa 2 byte
    return str.length * 2;
  } catch {
    return 0;
  }
}

/**
 * Stima la dimensione totale di un array di oggetti
 */
export function estimateArraySize<T>(arr: T[]): number {
  return arr.reduce((total, item) => total + estimateObjectSize(item), 0);
}

/**
 * Converte byte in MB leggibili
 */
export function bytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

// ============================================================================
// STRATEGIE DI CLEANUP
// ============================================================================

/**
 * Strategia LRU (Least Recently Used) per cleanup cache
 * Mantiene solo gli item più recenti quando si supera il limite
 */
export function applyLRUCleanup<T extends { id: string; timestamp?: number }>(
  items: T[],
  maxItems: number
): T[] {
  if (items.length <= maxItems) {
    return items;
  }

  // Ordina per timestamp (decrescente) e prendi i più recenti
  const sorted = [...items].sort((a, b) => {
    const timeA = a.timestamp ?? 0;
    const timeB = b.timestamp ?? 0;
    return timeB - timeA;
  });

  console.log(`[Safari Opt] LRU cleanup: ${items.length} -> ${maxItems} items (removed ${items.length - maxItems})`);
  
  return sorted.slice(0, maxItems);
}

/**
 * Rimuovi item scaduti (oltre TTL) da una lista
 */
export function removeExpiredItems<T extends { timestamp?: number }>(
  items: T[],
  ttlMs: number
): T[] {
  const now = Date.now();
  const cutoff = now - ttlMs;
  
  const filtered = items.filter(item => {
    const itemTime = item.timestamp ?? 0;
    return itemTime >= cutoff;
  });

  if (filtered.length < items.length) {
    console.log(
      `[Safari Opt] Removed ${items.length - filtered.length} expired items ` +
      `(TTL: ${(ttlMs / (60 * 60 * 1000)).toFixed(1)}h)`
    );
  }

  return filtered;
}

// ============================================================================
// MONITORAGGIO
// ============================================================================

/**
 * Monitora l'uso di memoria (se supportato dal browser)
 * Safari non espone performance.memory, ma teniamo il tracking interno
 */
export interface MemoryUsage {
  estimatedCacheSizeMB: number;
  isNearLimit: boolean;
  usagePercent: number;
  platform: 'iOS' | 'Safari' | 'Other';
}

/**
 * Calcola l'uso corrente di memoria della cache
 */
export function getMemoryUsage(
  cachedCollections: Record<string, unknown>
): MemoryUsage {
  let totalBytes = 0;
  
  for (const collection of Object.values(cachedCollections)) {
    if (Array.isArray(collection)) {
      totalBytes += estimateArraySize(collection);
    } else {
      totalBytes += estimateObjectSize(collection);
    }
  }

  const totalMB = totalBytes / (1024 * 1024);
  const maxMB = MAX_CACHE_SIZE_MB;
  const usagePercent = (totalMB / maxMB) * 100;
  const isNearLimit = usagePercent > 80;

  return {
    estimatedCacheSizeMB: parseFloat(totalMB.toFixed(2)),
    isNearLimit,
    usagePercent: parseFloat(usagePercent.toFixed(1)),
    platform: isIOS() ? 'iOS' : isSafari() ? 'Safari' : 'Other'
  };
}

/**
 * Logga warning se ci stiamo avvicinando al limite
 */
export function logMemoryWarning(usage: MemoryUsage): void {
  if (usage.isNearLimit) {
    console.warn(
      `[Safari Opt] ⚠️ CACHE NEAR LIMIT: ${usage.usagePercent}% ` +
      `(${usage.estimatedCacheSizeMB}MB / ${MAX_CACHE_SIZE_MB}MB) ` +
      `on ${usage.platform}`
    );
  }
}

// ============================================================================
// UTILITY PER CLEANUP PROATTIVO
// ============================================================================

/**
 * Determina se è necessario un cleanup urgente
 */
export function needsUrgentCleanup(usage: MemoryUsage): boolean {
  // Su iOS, cleanup urgente al 70% (più conservativi)
  const threshold = isIOS() ? 70 : 85;
  return usage.usagePercent > threshold;
}

/**
 * Calcola quanti item rimuovere per tornare sotto la soglia di sicurezza
 */
export function calculateItemsToRemove<T>(
  items: T[],
  currentSizeMB: number,
  targetUsagePercent: number
): number {
  const maxMB = MAX_CACHE_SIZE_MB;
  const targetMB = (targetUsagePercent / 100) * maxMB;
  
  if (currentSizeMB <= targetMB) {
    return 0;
  }

  // Stima: rimuovi proporzionalmente per tornare al target
  const excessMB = currentSizeMB - targetMB;
  const avgItemSizeMB = currentSizeMB / items.length;
  const itemsToRemove = Math.ceil(excessMB / avgItemSizeMB);

  return Math.min(itemsToRemove, Math.floor(items.length * 0.5)); // Max 50% alla volta
}

// ============================================================================
// HOOK REACT PER MONITORAGGIO (opzionale, per debug)
// ============================================================================

/**
 * Hook per monitorare l'uso di memoria in tempo reale
 * Utile per debug e testing delle ottimizzazioni
 */
export function useSafariMemoryMonitor(
  cachedCollections: Record<string, unknown>
): MemoryUsage {
  // Nota: questo è un wrapper semplice, il vero monitoring
  // avviene tramite le funzioni sopra
  return getMemoryUsage(cachedCollections);
}
