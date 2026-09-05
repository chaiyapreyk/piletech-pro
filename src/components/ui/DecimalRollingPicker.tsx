'use client';

import React from 'react';
import RollingWheel from './RollingWheel';

interface DecimalRollingPickerProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
}

export default function DecimalRollingPicker({
  value,
  onChange,
  min = 0,
  max = 25,
  unit = 'cm',
  label,
}: DecimalRollingPickerProps) {
  const integerPart = Math.floor(value);
  const decimalPart = Math.round((value - integerPart) * 10);

  // Generate integer options [min, min+1, ... max]
  const integerItems = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  // Generate decimal options [0, 1, 2, ... 9]
  const decimalItems = Array.from({ length: 10 }, (_, i) => i);

  const handleIntegerChange = (newInt: number) => {
    const combined = Number(`${newInt}.${decimalPart}`);
    onChange(combined);
  };

  const handleDecimalChange = (newDec: number) => {
    const combined = Number(`${integerPart}.${newDec}`);
    onChange(combined);
  };

  return (
    <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-4 shadow-sm">
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700">{label}</span>
          <span className="text-xs font-mono font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
            {value.toFixed(1)} {unit}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {/* Integer Wheel */}
        <div className="w-full">
          <RollingWheel
            items={integerItems}
            value={integerPart}
            onChange={handleIntegerChange}
            label={`จำนวนเต็ม (${unit})`}
          />
        </div>

        {/* Decimal Wheel */}
        <div className="w-full">
          <RollingWheel
            items={decimalItems}
            value={decimalPart}
            onChange={handleDecimalChange}
            label="ทศนิยม (.x)"
          />
        </div>
      </div>
    </div>
  );
}
