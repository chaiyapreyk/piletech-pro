'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Complete progress on route change
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Intercept click on internal links to trigger instant loading indicator
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      // Ignore external links, new tabs, download links, hash links
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('#') ||
        targetAttr === '_blank' ||
        target.hasAttribute('download')
      ) {
        return;
      }

      // If clicking the current path, no navigation needed
      if (href === pathname) return;

      setLoading(true);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[9999] overflow-hidden bg-slate-900/10">
      <div className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 animate-pulse w-full origin-left" />
      <style jsx>{`
        @keyframes topBarSlide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(-10%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        div > div {
          animation: topBarSlide 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
