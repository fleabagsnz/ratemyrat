import { useEffect } from 'react';

export function useFrameworkReady() {
  useEffect(() => {
    try {
      // Use globalThis instead of window, and guard hard
      const g: any = globalThis;

      if (
        g &&
        typeof g === 'object' &&
        typeof g.frameworkReady === 'function'
      ) {
        g.frameworkReady();
      }
    } catch (e) {
      // Swallow any weirdness; this hook is purely optional
      console.log('[frameworkReady] Ignored error:', e);
    }
  }, []);
}
