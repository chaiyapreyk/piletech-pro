'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      if (/^\/piles\/[^/]+\/drive\/?$/.test(pathname)) {
        const ready = await navigator.serviceWorker.ready;
        const worker = ready.active || registration.active;
        const assets = Array.from(document.querySelectorAll('script[src],link[href]'))
          .map((element) => element.getAttribute('src') || element.getAttribute('href'))
          .filter((value): value is string => Boolean(value));
        worker?.postMessage({ type: 'CACHE_DRIVE_PAGE', url: window.location.href, assets });
      }
    });
  }, [pathname]);

  return null;
}
