'use client';

import React from 'react';

interface Props {
  blowCounts: number[];
}

export default function DepthSoilChart({ blowCounts }: Props) {
  if (!blowCounts || blowCounts.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
        ยังไม่มีข้อมูล Blow count ต่อเมตร (กรอกข้อมูลด้านล่างเพื่อดูกราฟ)
      </div>
    );
  }

  const maxBlow = Math.max(...blowCounts, 50);
  const totalMeters = blowCounts.length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-700">
          Soil Resistance Profile (Blow Count ต่อความลึก)
        </span>
        <span className="text-[11px] text-slate-400">
          ความลึก: {totalMeters} ม. ({(totalMeters * 3.281).toFixed(1)} ft) | สูงสุด: {Math.max(...blowCounts)} blw/m ({Math.round(Math.max(...blowCounts) / 3.28084)} blw/ft)
        </span>
      </div>

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {blowCounts.map((blow, idx) => {
          const depth = idx + 1;
          const depthFt = (depth * 3.281).toFixed(0);
          const blowFt = Math.round(blow / 3.28084);
          const pct = Math.min(100, Math.round((blow / maxBlow) * 100));
          // Color code resistance: green (easy), yellow (medium), red/amber (hard/bearing stratum)
          const barColor =
            blow >= 50
              ? 'bg-amber-600'
              : blow >= 30
              ? 'bg-amber-400'
              : 'bg-emerald-400';

          return (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-slate-400 font-mono text-[10px] text-right">
                {depth}m <span className="text-slate-300">({depthFt}ft)</span>:
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${Math.max(5, pct)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-start pl-2 font-mono text-[10px] font-bold text-slate-800">
                  {blow} blw/m ({blowFt} blw/ft)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
