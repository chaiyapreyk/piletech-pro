'use client';

import React, { useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface RollingWheelProps {
  items: (number | string)[];
  value: number | string;
  onChange: (val: any) => void;
  label?: string;
  itemHeight?: number; // in pixels, default 40
}

export default function RollingWheel({
  items,
  value,
  onChange,
  label,
  itemHeight = 40,
}: RollingWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const selectedIndex = items.findIndex((item) => String(item) === String(value));
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  // Scroll to active item on mount or value change
  useEffect(() => {
    if (containerRef.current && !isUserScrolling.current) {
      const targetScroll = activeIndex * itemHeight;
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [activeIndex, itemHeight]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    isUserScrolling.current = true;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

      if (items[clampedIndex] !== undefined && items[clampedIndex] !== value) {
        onChange(items[clampedIndex]);
      }
      isUserScrolling.current = false;
    }, 120);
  };

  const handleStep = (direction: -1 | 1) => {
    const nextIdx = Math.max(0, Math.min(items.length - 1, activeIndex + direction));
    onChange(items[nextIdx]);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {label && <span className="text-[11px] font-bold text-slate-500 mb-1">{label}</span>}

      {/* Up Nudge Button */}
      <button
        type="button"
        onClick={() => handleStep(-1)}
        className="w-full py-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-t flex justify-center transition"
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      {/* Rolling Cylinder Container */}
      <div className="relative w-full h-[120px] overflow-hidden bg-slate-900 text-white rounded-xl shadow-inner border border-slate-700">
        {/* Top Fade Gradient */}
        <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-slate-900 via-slate-900/70 to-transparent z-10 pointer-events-none" />

        {/* Center Selection Indicator / Highlight Bar */}
        <div
          className="absolute inset-x-1 top-[40px] h-[40px] bg-amber-500/20 border-y-2 border-amber-400 rounded-md z-0 pointer-events-none"
        />

        {/* Bottom Fade Gradient */}
        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent z-10 pointer-events-none" />

        {/* Scrollable Column */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[40px]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <div
                key={idx}
                onClick={() => onChange(item)}
                className={`h-[40px] flex items-center justify-center font-mono text-base font-extrabold snap-center cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'text-amber-400 scale-110'
                    : 'text-slate-500 hover:text-slate-300 scale-95 opacity-50'
                }`}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>

      {/* Down Nudge Button */}
      <button
        type="button"
        onClick={() => handleStep(1)}
        className="w-full py-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-b flex justify-center transition"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}
