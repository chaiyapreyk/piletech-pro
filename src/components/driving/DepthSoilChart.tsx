'use client';

import React from 'react';

interface Props {
  blowCounts: number[];
  recordUnit?: 'METER' | 'FEET';
  recordScope?: 'FULL' | 'WINDOW';
  windowLength?: number;
}

export default function DepthSoilChart({
  blowCounts,
  recordUnit = 'METER',
  recordScope = 'FULL',
  windowLength = 20,
}: Props) {
  const isFeet = recordUnit === 'FEET';
  const unitLabel = isFeet ? 'ft' : 'ม.';
  const blowUnitLabel = isFeet ? 'blw/ft' : 'blw/m';

  if (!blowCounts || blowCounts.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs text-center p-4">
        ยังไม่มีข้อมูล Penetration Log ({isFeet ? 'Blows/ft' : 'Blows/m'})
        <br />
        <span className="text-[11px] text-slate-400 mt-1 block">
          กรอกข้อมูลด้านซ้ายเพื่อพล็อตกราฟชั้นดินแบบ Real-time
        </span>
      </div>
    );
  }

  const maxBlow = Math.max(...blowCounts, 50);
  const totalCount = blowCounts.length;

  const totalDepthStr = isFeet
    ? `${totalCount} ft (${(totalCount * 0.3048).toFixed(1)} ม.)`
    : `${totalCount} ม. (${(totalCount * 3.28084).toFixed(1)} ft)`;

  const maxBlowStr = isFeet
    ? `${Math.max(...blowCounts)} blw/ft (${Math.round(Math.max(...blowCounts) * 3.28084)} blw/m)`
    : `${Math.max(...blowCounts)} blw/m (${Math.round(Math.max(...blowCounts) / 3.28084)} blw/ft)`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800">
              Soil Resistance Profile ({isFeet ? 'Blows / ft' : 'Blows / m'})
            </span>
            {recordScope === 'WINDOW' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                {windowLength} {unitLabel} สุดท้าย
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400">
            กราฟแสดงความต้านทานของชั้นดินตามความลึก
          </span>
        </div>
        <div className="text-right text-[11px] text-slate-500 font-medium">
          <div>บันทึก: <strong className="text-slate-800">{totalDepthStr}</strong></div>
          <div>แรงต้านสูงสุด: <strong className="text-amber-600">{maxBlowStr}</strong></div>
        </div>
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {blowCounts.map((blow, idx) => {
          const step = idx + 1;
          const altDepth = isFeet
            ? `${(step * 0.3048).toFixed(1)}m`
            : `${(step * 3.28084).toFixed(0)}ft`;

          const altBlow = isFeet
            ? `${Math.round(blow * 3.28084)} blw/m`
            : `${Math.round(blow / 3.28084)} blw/ft`;

          const pct = Math.min(100, Math.round((blow / maxBlow) * 100));

          // Color code resistance
          const barColor =
            blow >= 50
              ? 'bg-amber-600'
              : blow >= 30
              ? 'bg-amber-400'
              : 'bg-emerald-400';

          return (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="w-20 text-slate-400 font-mono text-[10px] text-right whitespace-nowrap">
                {step} {unitLabel} <span className="text-slate-300">({altDepth})</span>:
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${Math.max(6, pct)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-start pl-2 font-mono text-[10px] font-bold text-slate-800">
                  {blow} {blowUnitLabel} <span className="text-slate-500 font-normal ml-1">({altBlow})</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
