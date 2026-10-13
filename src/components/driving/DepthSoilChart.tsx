'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart as LineChartIcon,
  BarChart3,
  Info,
  ShieldCheck,
  RotateCcw,
  TrendingUp,
  Plus,
} from 'lucide-react';
import type { DrivingCriteriaInput } from '@/lib/calculations/drivingLoadProfile';
import {
  calculateBearingCapacityFromSet,
  type HileyInput,
} from '@/lib/calculations/hiley';
import { applyPresetCurve } from '@/lib/calculations/drivingEqualizer';
import { appendDrivingInterval } from '@/lib/drivingIntervals';

interface Props {
  blowCounts: (number | null)[];
  onChange?: (counts: (number | null)[]) => void;
  recordUnit?: 'METER' | 'FEET';
  recordScope?: 'FULL' | 'WINDOW';
  windowLength?: number;
  criteria?: DrivingCriteriaInput | null;
}

export default function DepthSoilChart({
  blowCounts,
  onChange,
  recordUnit = 'FEET',
  recordScope = 'WINDOW',
  windowLength = 20,
  criteria,
}: Props) {
  const [chartMode, setChartMode] = useState<'LINE' | 'BAR'>('BAR');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isFeet = recordUnit === 'FEET';
  const unitLabel = isFeet ? 'ft' : 'ม.';
  const blowUnitLabel = isFeet ? 'blw/ft' : 'blw/m';

  // Memoize Hiley Input if criteria is available
  const hileyInput: HileyInput | null = useMemo(() => {
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

  // Helper to compute Actual Safe Load Ra (tons) and Ru for a blow count
  const getCapacityForBlows = (blow: number | null): { ra: number | null; ru: number | null } => {
    if (!hileyInput || blow === null || blow <= 0) return { ra: null, ru: null };
    const stepCm = isFeet ? 30.48 : 100.0;
    const setCmPerBlow = stepCm / blow;
    const set10Cm = setCmPerBlow * 10;
    const result = calculateBearingCapacityFromSet(hileyInput, set10Cm);
    if (result.safeWorkingLoadTons > 0 && isFinite(result.safeWorkingLoadTons)) {
      return {
        ra: Number(result.safeWorkingLoadTons.toFixed(1)),
        ru: Number(result.ultimateCapacityTons.toFixed(1)),
      };
    }
    return { ra: null, ru: null };
  };

  // If array is completely empty, initialize default display array or empty state
  const totalCount = blowCounts && blowCounts.length > 0 ? blowCounts.length : (recordScope === 'WINDOW' ? windowLength : 20);
  const effectiveBlows = blowCounts && blowCounts.length > 0 ? blowCounts : Array.from({ length: totalCount }, () => null);

  const validBlows = effectiveBlows.filter((b): b is number => typeof b === 'number' && b > 0);
  const rawMax = validBlows.length > 0 ? Math.max(...validBlows, 10) : 30;
  // Scale max nicely to standard intervals: 30, 50, 60, 80, 100, etc.
  const maxScale = rawMax <= 30 ? 30 : rawMax <= 50 ? 50 : rawMax <= 70 ? 70 : Math.ceil(rawMax / 20) * 20;

  const totalDepthStr = isFeet
    ? `${totalCount} ft (${(totalCount * 0.3048).toFixed(1)} ม.)`
    : `${totalCount} ม. (${(totalCount * 3.28084).toFixed(1)} ft)`;

  const maxBlow = validBlows.length > 0 ? Math.max(...validBlows) : 0;
  const maxBlowStr = isFeet
    ? `${maxBlow} blw/ft (${Math.round(maxBlow * 3.28084)} blw/m)`
    : `${maxBlow} blw/m (${Math.round(maxBlow / 3.28084)} blw/ft)`;

  // Calculate highest computed Actual Safe Load across valid blows
  const maxCapacity = getCapacityForBlows(maxBlow > 0 ? maxBlow : null);

  // SVG dimensions for Boring Log Line Chart
  const svgWidth = 415;
  // Adaptive row height: more compact when there are many intervals
  const rowHeight = totalCount > 25 ? 18 : totalCount > 15 ? 21 : 24;
  const marginTop = 36;
  const marginBottom = 24;
  const marginLeft = 55;
  const marginRight = 65;
  const plotWidth = svgWidth - marginLeft - marginRight;
  const plotHeight = Math.max(180, totalCount * rowHeight);
  const svgHeight = plotHeight + marginTop + marginBottom;

  const getX = (val: number) => marginLeft + (Math.min(val, maxScale) / maxScale) * plotWidth;
  const getY = (idx: number) => marginTop + (idx + 0.5) * (plotHeight / totalCount);

  // Generate valid points for polyline and filled area
  const validNodes = effectiveBlows
    .map((val, idx) => {
      if (typeof val !== 'number') return null;
      const cap = getCapacityForBlows(val);
      return { val, idx, x: getX(val), y: getY(idx), ra: cap.ra, ru: cap.ru };
    })
    .filter((n): n is { val: number; idx: number; x: number; y: number; ra: number | null; ru: number | null } => n !== null);

  const points = validNodes.map((n) => `${n.x},${n.y}`).join(' ');
  const firstPoint = validNodes.length > 0 ? `${marginLeft},${validNodes[0].y}` : '';
  const lastPoint = validNodes.length > 0 ? `${marginLeft},${validNodes[validNodes.length - 1].y}` : '';
  const areaPoints = validNodes.length > 0 ? `${firstPoint} ${points} ${lastPoint}` : '';

  // Strata boundary X positions
  const xSoft = getX(15);
  const xMedium = getX(30);
  const xDense = getX(50);

  const getSoilStratumName = (blow: number) => {
    if (blow >= 50) return 'ชั้นทรายแน่นมาก / ดินดานรับน้ำหนัก (Hard / Bearing)';
    if (blow >= 30) return 'ชั้นดินแข็ง / ทรายแน่น (Stiff / Dense)';
    if (blow >= 15) return 'ชั้นดินความแน่นปานกลาง (Medium Stiff)';
    return 'ชั้นดินอ่อน / ทรายหลวม (Soft / Loose)';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1">
              <LineChartIcon className="w-4 h-4 text-amber-500" />
              <span>Soil Resistance & Actual Safe Load ($R_a$)</span>
            </span>
            {recordScope === 'WINDOW' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                {windowLength} {unitLabel} สุดท้าย
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            กราฟแสดงแรงต้านทานของชั้นดินและกำลังรับน้ำหนักปลอดภัยคำนวณจริง (Dynamic $R_a$)
          </p>
        </div>

        {/* View Mode Toggle: Line (Boring Log) vs Bar */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('LINE')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition ${
              chartMode === 'LINE'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChartIcon className="w-3 h-3" />
            <span>เส้น Boring Log</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('BAR')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition ${
              chartMode === 'BAR'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>กราฟแท่ง</span>
          </button>
        </div>
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div>
          <span className="text-slate-400 block text-[10px]">ความลึกที่บันทึกแล้ว:</span>
          <span className="font-bold text-slate-800">{totalDepthStr}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">แรงต้านทานสูงสุด:</span>
          <span className="font-bold text-amber-600">{maxBlowStr}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block text-[10px]">Actual Safe Load ($R_a$):</span>
          <span className="font-black text-indigo-600 font-mono">
            {maxCapacity.ra !== null ? `${maxCapacity.ra} ตัน` : '-'}
          </span>
        </div>
      </div>

      {/* Geotechnical Stratum Legend */}
      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] px-1 text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-300"></span>
          &lt;15: ดินอ่อน
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-100 border border-amber-300"></span>
          15-30: ปานกลาง
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-orange-100 border border-orange-300"></span>
          30-50: แน่น/แข็ง
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-rose-100 border border-rose-300"></span>
          &gt;50: ชั้นดินดาน
        </span>
      </div>

      {/* VIEW MODE 1: Geotechnical Boring Log Line Chart */}
      {chartMode === 'LINE' && (
        <div className="relative border border-slate-200 rounded-xl bg-slate-50/40 p-2 overflow-x-auto shadow-2xs">
          <div className="min-w-[320px] w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <defs>
                {/* Gradient for area fill under line */}
                <linearGradient id="boringAreaGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
                  <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0.45" />
                </linearGradient>
              </defs>

              {/* 1. Background Soil Stratum Bands */}
              {/* Soft zone (0-15) */}
              <rect
                x={marginLeft}
                y={marginTop}
                width={Math.max(0, xSoft - marginLeft)}
                height={plotHeight}
                fill="#10b981"
                fillOpacity="0.04"
              />
              {/* Medium zone (15-30) */}
              <rect
                x={xSoft}
                y={marginTop}
                width={Math.max(0, xMedium - xSoft)}
                height={plotHeight}
                fill="#f59e0b"
                fillOpacity="0.06"
              />
              {/* Dense zone (30-50) */}
              <rect
                x={xMedium}
                y={marginTop}
                width={Math.max(0, xDense - xMedium)}
                height={plotHeight}
                fill="#ea580c"
                fillOpacity="0.08"
              />
              {/* Very dense / Bearing stratum (>50) */}
              <rect
                x={xDense}
                y={marginTop}
                width={Math.max(0, svgWidth - marginRight - xDense)}
                height={plotHeight}
                fill="#e11d48"
                fillOpacity="0.10"
              />

              {/* 2. Top X-Axis Grid & Labels (Blow Counts) */}
              {[0, 15, 30, 50, maxScale].map((tick) => {
                const xPos = getX(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={xPos}
                      y1={marginTop}
                      x2={xPos}
                      y2={marginTop + plotHeight}
                      stroke="#cbd5e1"
                      strokeDasharray="2,2"
                      strokeWidth="1"
                    />
                    <text
                      x={xPos}
                      y={marginTop - 8}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold fill-slate-500"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              <text
                x={marginLeft + plotWidth / 2}
                y={14}
                textAnchor="middle"
                className="text-[10px] font-bold fill-slate-700 uppercase tracking-wider"
              >
                Penetration Blows ({blowUnitLabel}) &rarr;
              </text>

              {/* Right Y-Axis Header: Actual Ra */}
              <text
                x={marginLeft + plotWidth + 8}
                y={marginTop - 8}
                textAnchor="start"
                className="text-[9px] font-mono font-black fill-indigo-600 tracking-tight"
              >
                Ra (t)
              </text>

              {/* 3. Left Y-Axis (Depth), Right Y-Axis (Actual Ra), and Horizontal Guides */}
              {blowCounts.map((val, idx) => {
                const yPos = getY(idx);
                const step = idx + 1;
                const isHovered = hoveredIndex === idx;
                const cap = typeof val === 'number' ? getCapacityForBlows(val) : { ra: null, ru: null };

                return (
                  <g key={idx}>
                    {/* Horizontal depth line extending to both axes */}
                    <line
                      x1={marginLeft}
                      y1={yPos}
                      x2={marginLeft + plotWidth}
                      y2={yPos}
                      stroke={isHovered ? '#f59e0b' : '#f1f5f9'}
                      strokeWidth={isHovered ? '1.5' : '1'}
                    />
                    {/* Depth label on left */}
                    <text
                      x={marginLeft - 8}
                      y={yPos + 3.5}
                      textAnchor="end"
                      className={`text-[10px] font-mono ${
                        isHovered ? 'font-black fill-amber-600' : 'font-semibold fill-slate-500'
                      }`}
                    >
                      {step} {unitLabel}
                    </text>

                    {/* Actual Safe Load (Ra) on right side along Y-axis */}
                    {isHovered && cap.ra !== null && (
                      <rect
                        x={marginLeft + plotWidth + 4}
                        y={yPos - 7}
                        width={46}
                        height={14}
                        rx={3}
                        fill="#4f46e5"
                      />
                    )}
                    <text
                      x={marginLeft + plotWidth + 8}
                      y={yPos + 3.5}
                      textAnchor="start"
                      className={`text-[10px] font-mono font-bold ${
                        isHovered && cap.ra !== null
                          ? 'fill-white font-black'
                          : cap.ra !== null
                          ? 'fill-indigo-600 font-extrabold'
                          : 'fill-slate-300'
                      }`}
                    >
                      {cap.ra !== null ? `${cap.ra}t` : '-'}
                    </text>
                  </g>
                );
              })}

              {/* Left axis baseline */}
              <line
                x1={marginLeft}
                y1={marginTop}
                x2={marginLeft}
                y2={marginTop + plotHeight}
                stroke="#64748b"
                strokeWidth="1.5"
              />

              {/* Right axis baseline */}
              <line
                x1={marginLeft + plotWidth}
                y1={marginTop}
                x2={marginLeft + plotWidth}
                y2={marginTop + plotHeight}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* 4. Area Under Curve */}
              <polygon points={areaPoints} fill="url(#boringAreaGrad)" />

              {/* 5. The Boring Log Continuous Resistance Line */}
              <polyline
                points={points}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 6. Interactive Data Nodes (Circles) & Skipped Indicators */}
              {effectiveBlows.map((val, idx) => {
                const cy = getY(idx);
                const isHovered = hoveredIndex === idx;

                if (val === null) {
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => setHoveredIndex(idx === hoveredIndex ? null : idx)}
                    >
                      <rect
                        x={marginLeft + 4}
                        y={cy - 7}
                        width={65}
                        height={14}
                        rx={3}
                        fill={isHovered ? '#fed7aa' : '#f1f5f9'}
                        stroke={isHovered ? '#f97316' : '#cbd5e1'}
                        strokeDasharray="2,2"
                        strokeWidth="1"
                      />
                      <text
                        x={marginLeft + 36}
                        y={cy + 3.5}
                        textAnchor="middle"
                        className="text-[8px] font-mono fill-slate-500 font-bold"
                      >
                        ข้าม (Skip)
                      </text>
                    </g>
                  );
                }

                const cx = getX(val);
                const nodeColor = val >= 50 ? '#e11d48' : val >= 30 ? '#ea580c' : '#d97706';

                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setHoveredIndex(idx === hoveredIndex ? null : idx)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 3.5}
                      fill={nodeColor}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? '2.5' : '1.5'}
                      className="transition-all duration-150"
                    />

                    {/* Value text near node */}
                    <text
                      x={cx + (cx > svgWidth - 45 ? -8 : 8)}
                      y={cy + 3.5}
                      textAnchor={cx > svgWidth - 45 ? 'end' : 'start'}
                      className={`text-[9px] font-mono font-black ${
                        isHovered ? 'fill-slate-950 font-extrabold text-[10px]' : 'fill-slate-600'
                      }`}
                    >
                      {val}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Tooltip Card */}
          {hoveredIndex !== null && blowCounts[hoveredIndex] !== undefined && (() => {
            const currentBlow = blowCounts[hoveredIndex];
            const cap = typeof currentBlow === 'number' ? getCapacityForBlows(currentBlow) : { ra: null, ru: null };

            return (
              <div className="mt-2 p-2.5 bg-slate-900 text-white rounded-xl text-xs space-y-1.5 shadow-md animate-in fade-in border border-slate-800">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-amber-400 font-bold">
                    📍 ความลึก: {hoveredIndex + 1} {unitLabel}{' '}
                    <span className="text-slate-400 font-normal">
                      ({isFeet ? `${((hoveredIndex + 1) * 0.3048).toFixed(1)}m` : `${((hoveredIndex + 1) * 3.28084).toFixed(0)}ft`})
                    </span>
                  </span>
                  {typeof currentBlow === 'number' ? (
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-300 text-sm">
                        {currentBlow} {blowUnitLabel}
                      </span>
                      {cap.ra !== null && (
                        <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-2xs font-mono">
                          Ra: {cap.ra}t
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                      ข้ามบันทึก (Skipped)
                    </span>
                  )}
                </div>

                {typeof currentBlow === 'number' && (
                  <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800">
                    <span>{getSoilStratumName(currentBlow)}</span>
                    <div className="flex items-center gap-2 text-slate-400 font-mono">
                      {cap.ru !== null && (
                        <span className="text-indigo-300">
                          (Ru: {cap.ru}t)
                        </span>
                      )}
                      <span>
                        {isFeet
                          ? `≈ ${Math.round(currentBlow * 3.28084)} blw/m`
                          : `≈ ${Math.round(currentBlow / 3.28084)} blw/ft`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW MODE 2: Horizontal Bars (Interactive Adjuster) */}
      {chartMode === 'BAR' && (
        <div className="space-y-2">
          {onChange && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-700 text-xs">พรีเซ็ตค่ารวดเร็ว:</span>
                <button
                  type="button"
                  onClick={() => onChange(applyPresetCurve('CLEAR_ZERO', totalCount))}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 font-semibold text-[10px] flex items-center gap-1 shadow-2xs transition"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>รีเซ็ต 0</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChange(applyPresetCurve('FLAT', totalCount, 20))}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 font-semibold text-[10px] flex items-center gap-1 shadow-2xs transition"
                >
                  <span>เท่ากัน 20</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChange(applyPresetCurve('STEP_UP', totalCount, 15, 35))}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 font-semibold text-[10px] flex items-center gap-1 shadow-2xs transition"
                >
                  <TrendingUp className="w-3 h-3 text-amber-500" />
                  <span>ไต่ระดับ (Step-Up)</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChange(appendDrivingInterval(effectiveBlows, 20))}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-md text-[10px] flex items-center gap-1 shadow-2xs transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ เพิ่มช่วง ({unitLabel})</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1 w-full">
            {effectiveBlows.map((blow, idx) => {
              const step = idx + 1;
              const altDepth = isFeet
                ? `${(step * 0.3048).toFixed(1)}m`
                : `${(step * 3.28084).toFixed(0)}ft`;
              const cap = typeof blow === 'number' ? getCapacityForBlows(blow) : { ra: null, ru: null };
              const blowVal = typeof blow === 'number' ? blow : 0;
              const isSkipped = blow === null || blow === 0;

              const handleBarInteraction = (clientX: number, target: HTMLDivElement) => {
                if (!onChange) return;
                const rect = target.getBoundingClientRect();
                const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
                const ratio = offsetX / rect.width;
                const calculated = Math.round(ratio * maxScale);
                const clamped = Math.max(0, Math.min(100, calculated));
                const nextVal = clamped === 0 ? null : clamped;
                const nextCounts = [...effectiveBlows];
                nextCounts[idx] = nextVal;
                onChange(nextCounts);
              };

              const pct = Math.min(100, Math.round((blowVal / maxScale) * 100));

              const barColor =
                blowVal >= 50
                  ? 'bg-rose-500'
                  : blowVal >= 30
                  ? 'bg-amber-500'
                  : blowVal > 0
                  ? 'bg-emerald-500'
                  : 'bg-slate-300';

              return (
                <div key={idx} className="flex items-center gap-1.5 sm:gap-2 text-xs group py-0.5">
                  <span className="w-14 sm:w-16 text-slate-500 font-mono text-[10px] sm:text-[11px] font-bold text-right whitespace-nowrap shrink-0">
                    #{step} {unitLabel}:
                  </span>

                  {/* Interactive Bar Track */}
                  <div
                    onClick={(e) => handleBarInteraction(e.clientX, e.currentTarget)}
                    onMouseDown={(e) => {
                      if (e.buttons === 1) handleBarInteraction(e.clientX, e.currentTarget);
                    }}
                    onMouseMove={(e) => {
                      if (e.buttons === 1) handleBarInteraction(e.clientX, e.currentTarget);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200/80 rounded-lg h-5 sm:h-5.5 overflow-hidden relative cursor-pointer select-none transition border border-slate-200 shadow-2xs"
                    title={`คลิกหรือลากเพื่อปรับค่า #${step} ${unitLabel}`}
                  >
                    {/* Fill bar */}
                    <div
                      className={`h-full rounded-md transition-all duration-75 ${
                        isSkipped ? 'bg-transparent' : barColor
                      }`}
                      style={{ width: `${Math.max(0, pct)}%` }}
                    />

                    {/* Inside Bar Content */}
                    <div className="absolute inset-0 flex items-center justify-between px-2 font-mono text-[10px] font-bold pointer-events-none">
                      <span className={isSkipped ? 'text-slate-400 font-normal italic' : 'text-slate-900 font-black'}>
                        {isSkipped ? '0 (N/A / ข้าม)' : `${blowVal} ${blowUnitLabel}`}
                      </span>

                      {cap.ra !== null && (
                        <span className="text-indigo-900 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs text-[9.5px] font-extrabold border border-indigo-100">
                          Ra: {cap.ra}t
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Nudge Buttons & Clear */}
                  {onChange && (
                    <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = Math.max(0, blowVal - 1);
                          const nextCounts = [...effectiveBlows];
                          nextCounts[idx] = nextVal === 0 ? null : nextVal;
                          onChange(nextCounts);
                        }}
                        disabled={blowVal <= 0}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 font-bold flex items-center justify-center cursor-pointer text-xs"
                        title="-1 Blow"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = Math.min(100, (blowVal || 0) + 1);
                          const nextCounts = [...effectiveBlows];
                          nextCounts[idx] = nextVal;
                          onChange(nextCounts);
                        }}
                        disabled={blowVal >= 100}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 font-bold flex items-center justify-center cursor-pointer text-xs"
                        title="+1 Blow"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
