/**
 * Performance Monitoring Utilities for LegalEase Frontend
 */

export interface PageLoadMetric {
  url: string;
  loadTimeMs: number;
  domContentMs: number;
  timestamp: string;
}

/**
 * Measures initial page load timing metrics using Navigation Timing API
 */
export function measurePageLoad(): PageLoadMetric | null {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries && navEntries.length > 0) {
      const nav = navEntries[0];
      const metric: PageLoadMetric = {
        url: window.location.href,
        loadTimeMs: Math.round(nav.loadEventEnd - nav.startTime),
        domContentMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        timestamp: new Date().toISOString(),
      };

      console.info(
        `[Performance Monitor] Page Load: ${metric.loadTimeMs}ms | DOM Content: ${metric.domContentMs}ms (${metric.url})`
      );
      return metric;
    }
  } catch (err) {
    console.warn('[Performance Monitor] Navigation timing error:', err);
  }

  return null;
}

/**
 * Measures custom operation execution duration
 */
export function measureExecution<T>(name: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.info(`[Performance Measure] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
}
