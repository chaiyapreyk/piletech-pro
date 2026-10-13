'use client';

import React, { useRef } from 'react';
import {
  Table as TableIcon,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import {
  clampEqualizerBlowValue,
  applyPresetCurve,
} from '@/lib/calculations/drivingEqualizer';
import {
  appendDrivingInterval,
  updateDrivingInterval,
} from '@/lib/drivingIntervals';
import type { DrivingCriteriaInput } from '@/lib/calculations/drivingLoadProfile';
import { calculateBearingCapacityFromSet, type HileyInput } from '@/lib/calculations/hiley';

interface ExcelBlowTableViewProps {
  blowCounts: (number | null)[];
  onChange: (counts: (number | null)[]) => void;
  unit: 'METER' | 'FEET';
  scope: 'FULL' | 'WINDOW';
  windowLength: number;
  criteria?: DrivingCriteriaInput | null;
}

export default function ExcelBlowTableView({
  blowCounts,
  onChange,
  unit,
  scope,
  windowLength,
  criteria,
}: ExcelBlowTableViewProps) {
  const unitShort = unit === 'FEET' ? 'ft' : 'ม.';
  const currentCount = blowCounts.length;
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Memoize Hiley parameters to compute dynamic Ra on each row
  const hileyInput: HileyInput | null = React.useMemo(() => {
    if (!criteria || !criteria.safeWorkingLoadT || !criteria.hammerWeightT || !criteria.dropHeightCm) {
      return null;
    }
    return {
      safeWorkingLoadTons: criteria.safeWorkingLoadT,
      safetyFactor: criteria.safetyFactor || 2.5,
      hammerWeightTons: criteria.hammerWeightT,
      dropHeightCm: criteria.dropHeightCm,
      pileWeightTons: criteria.pileWeightT || 1.8,
      restitutionCoeff: criteria.cushionCoeffE ?? 0.25,
      tempCompressionCm: criteria.tempCompressionC ?? 1.2,
      hammerEfficiency: criteria.hammerEfficiency ?? undefined,
      concreteStrengthKsc: criteria.concreteStrengthKsc ?? undefined,
      elasticModulusKsc: criteria.elasticModulusKsc ?? undefined,
      pileSectionAreaCm2: criteria.pileSectionAreaCm2 ?? undefined,
      pileLengthM: criteria.pileLengthM ?? undefined,
    };
  }, [criteria]);

  const getRaForRow = (blow: number | null): number | null => {
    if (!hileyInput || blow === null || blow <= 0) return null;
    const stepCm = unit === 'FEET' ? 30.48 : 100.0;
    const setCmPerBlow = stepCm / blow;
    const res = calculateBearingCapacityFromSet(hileyInput, setCmPerBlow * 10);
    return res.safeWorkingLoadTons > 0 && isFinite(res.safeWorkingLoadTons)
      ? Number(res.safeWorkingLoadTons.toFixed(1))
      : null;
  };

  const handleCellChange = (index: number, rawVal: string) => {
    const trimmed = rawVal.trim();
    if (trimmed === '' || trimmed === '0') {
      onChange(updateDrivingInterval(blowCounts, index, null));
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed)) return;
    const clamped = clampEqualizerBlowValue(parsed);
    onChange(updateDrivingInterval(blowCounts, index, clamped));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      if (index + 1 < blowCounts.length) {
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.select();
      } else {
        // Add next interval if pressing Enter at the end
        handleAddInterval(null);
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
          inputRefs.current[index + 1]?.select();
        }, 50);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      }
    }
  };

  const handleAddInterval = (initialValue: number | null = null) => {
    onChange(appendDrivingInterval(blowCounts, initialValue));
  };

  const handleDeleteInterval = (index: number) => {
    const next = blowCounts.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleResetAllToZero = () => {
    const targetLength = Math.max(currentCount, 20);
    onChange(new Array(targetLength).fill(null));
  };

  const handleApplyPreset = (preset: 'FLAT_20' | 'FLAT_30' | 'STEP_UP') => {
    const targetLength = Math.max(
      scope === 'WINDOW' ? windowLength : 20,
      blowCounts.length || 20
    );

    if (preset === 'FLAT_20') {
      onChange(applyPresetCurve('FLAT', targetLength, 20));
    } else if (preset === 'FLAT_30') {
      onChange(applyPresetCurve('FLAT', targetLength, 30));
    } else if (preset === 'STEP_UP') {
      onChange(applyPresetCurve('STEP_UP', targetLength, 15, 45));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      {/* Excel Sheet Header & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                DATA TABLE WITH ADJUSTABLE BARS
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                {currentCount} แถว ({unitShort})
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              คลิกหรือลากที่แท่งบาร์ในแต่ละแถวเพื่อปรับระดับ Blow Count หรือกดปุ่ม - / + เพื่อปรับละเอียด
            </p>
          </div>
        </div>

        {/* Action Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetAllToZero}
            className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="รีเซ็ตทุกแถวเป็น 0 (N/A)"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset 0</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('FLAT_20')}
            className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            Flat 20
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('STEP_UP')}
            className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <TrendingUp className="w-3 h-3" />
            <span>Step-Up</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddInterval(null)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มแถว</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        {/* Table Head (Excel Column Header Style) */}
        <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none items-center">
          <div className="col-span-1 text-center font-mono">#</div>
          <div className="col-span-2 text-center">ความลึก ({unitShort})</div>
          <div className="col-span-6 text-center">Adjustable Blow Count (0 - 50)</div>
          <div className="col-span-2 text-center">Actual Ra</div>
          <div className="col-span-1 text-center">จัดการ</div>
        </div>

        {/* Scrollable Table Rows */}
        <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
          {blowCounts.map((val, idx) => {
            const blowVal = typeof val === 'number' ? val : 0;
            const isZeroOrNull = val === null || val === 0;
            const ra = getRaForRow(val);

            // Dynamic scale: 50 standard, or higher if value exceeds 50
            const maxScale = Math.max(50, Math.ceil(blowVal / 10) * 10);
            const pct = Math.min(100, Math.round((blowVal / maxScale) * 100));

            const barColor =
              blowVal >= 50
                ? 'bg-rose-500'
                : blowVal >= 30
                ? 'bg-amber-500'
                : blowVal > 0
                ? 'bg-emerald-500'
                : 'bg-slate-300';

            const handleBarInteraction = (clientX: number, target: HTMLDivElement) => {
              const rect = target.getBoundingClientRect();
              const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
              const ratio = offsetX / rect.width;
              const calculated = Math.round(ratio * maxScale);
              const clamped = clampEqualizerBlowValue(Math.max(0, Math.min(100, calculated)));
              const nextVal = clamped === null || clamped <= 0 ? null : clamped;
              onChange(updateDrivingInterval(blowCounts, idx, nextVal));
            };

            const handleNudge = (delta: number) => {
              const base = typeof val === 'number' && val > 0 ? val : 0;
              const nextVal = base + delta;
              const clamped = nextVal <= 0 ? null : clampEqualizerBlowValue(nextVal);
              onChange(updateDrivingInterval(blowCounts, idx, clamped));
            };

            return (
              <div
                key={idx}
                className="grid grid-cols-12 gap-1 px-3 py-1.5 items-center hover:bg-amber-50/40 transition group"
              >
                {/* Col 1: Row Number */}
                <div className="col-span-1 text-center font-mono text-xs font-semibold text-slate-400">
                  {idx + 1}
                </div>

                {/* Col 2: Depth Badge */}
                <div className="col-span-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200">
                    #{idx + 1} {unitShort}
                  </span>
                </div>

                {/* Col 3: Interactive Adjustable Bar with Nudge Controls */}
                <div className="col-span-6 flex items-center gap-1 px-1">
                  {/* Nudge Minus Button */}
                  <button
                    type="button"
                    onClick={() => handleNudge(-1)}
                    disabled={blowVal <= 0}
                    className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-20 font-bold flex items-center justify-center cursor-pointer text-xs shrink-0 transition active:scale-95"
                    title="-1 Blow"
                  >
                    -
                  </button>

                  {/* Horizontal Bar Track */}
                  <div
                    onClick={(e) => handleBarInteraction(e.clientX, e.currentTarget)}
                    onMouseDown={(e) => {
                      if (e.buttons === 1) handleBarInteraction(e.clientX, e.currentTarget);
                    }}
                    onMouseMove={(e) => {
                      if (e.buttons === 1) handleBarInteraction(e.clientX, e.currentTarget);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200/80 rounded-lg h-6 overflow-hidden relative cursor-pointer select-none transition border border-slate-200 shadow-2xs"
                    title={`คลิกหรือลากเพื่อปรับค่า #${idx + 1} ${unitShort}`}
                  >
                    {/* Progress Bar Fill */}
                    <div
                      className={`h-full rounded-md transition-all duration-75 ${
                        isZeroOrNull ? 'bg-transparent' : barColor
                      }`}
                      style={{ width: `${Math.max(0, pct)}%` }}
                    />

                    {/* Inside Text Label */}
                    <div className="absolute inset-0 flex items-center justify-between px-2 font-mono text-[10px] font-bold pointer-events-none">
                      <span className={isZeroOrNull ? 'text-slate-400 font-normal italic' : 'text-slate-900 font-black'}>
                        {isZeroOrNull ? '0 (N/A / ข้าม)' : `${blowVal} ${unit === 'FEET' ? 'blw/ft' : 'blw/m'}`}
                      </span>
                      {!isZeroOrNull && (
                        <span className="text-slate-500 font-medium text-[9px]">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nudge Plus Button */}
                  <button
                    type="button"
                    onClick={() => handleNudge(1)}
                    disabled={blowVal >= 100}
                    className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-20 font-bold flex items-center justify-center cursor-pointer text-xs shrink-0 transition active:scale-95"
                    title="+1 Blow"
                  >
                    +
                  </button>
                </div>

                {/* Col 4: Computed Actual Ra */}
                <div className="col-span-2 text-center font-mono">
                  {ra !== null ? (
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {ra} t
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  )}
                </div>

                {/* Col 5: Delete Row Action */}
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteInterval(idx)}
                    className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="ลบแถวนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Quick Add Row */}
        <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono pl-1">
            รวมทั้งหมด {currentCount} แถว ({currentCount} {unitShort})
          </span>
          <button
            type="button"
            onClick={() => handleAddInterval(null)}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3 text-emerald-600" />
            <span>เพิ่มแถว #{currentCount + 1} {unitShort}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
