'use client';

import React, { useState } from 'react';
import { LineChart as LineChartIcon, BarChart3, Info } from 'lucide-react';

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
  const [chartMode, setChartMode] = useState<'LINE' | 'BAR'>('LINE');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isFeet = recordUnit === 'FEET';
  const unitLabel = isFeet ? 'ft' : 'ม.';
  const blowUnitLabel = isFeet ? 'blw/ft' : 'blw/m';

  if (!blowCounts || blowCounts.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs text-center p-6">
        <div>
          <LineChartIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-600">ยังไม่มีข้อมูล Penetration Log ({isFeet ? 'Blows/ft' : 'Blows/m'})</p>
          <p className="text-[11px] text-slate-400 mt-1">
            บันทึกค่า Blow count ด้านซ้ายเพื่อสร้างกราฟเส้น Boring Log แบบ Real-time
          </p>
        </div>
      </div>
    );
  }

  const rawMax = Math.max(...blowCounts, 10);
  // Scale max nicely to standard intervals: 30, 50, 60, 80, 100, etc.
  const maxScale = rawMax <= 30 ? 30 : rawMax <= 50 ? 50 : rawMax <= 70 ? 70 : Math.ceil(rawMax / 20) * 20;
  const totalCount = blowCounts.length;

  const totalDepthStr = isFeet
    ? `${totalCount} ft (${(totalCount * 0.3048).toFixed(1)} ม.)`
    : `${totalCount} ม. (${(totalCount * 3.28084).toFixed(1)} ft)`;

  const maxBlow = Math.max(...blowCounts);
  const maxBlowStr = isFeet
    ? `${maxBlow} blw/ft (${Math.round(maxBlow * 3.28084)} blw/m)`
    : `${maxBlow} blw/m (${Math.round(maxBlow / 3.28084)} blw/ft)`;

  // SVG dimensions for Boring Log Line Chart
  const svgWidth = 360;
  const rowHeight = 26;
  const marginTop = 40;
  const marginBottom = 25;
  const marginLeft = 55;
  const marginRight = 20;
  const plotWidth = svgWidth - marginLeft - marginRight;
  const plotHeight = Math.max(220, totalCount * rowHeight);
  const svgHeight = plotHeight + marginTop + marginBottom;

  const getX = (val: number) => marginLeft + (Math.min(val, maxScale) / maxScale) * plotWidth;
  const getY = (idx: number) => marginTop + (idx + 0.5) * (plotHeight / totalCount);

  // Generate points for polyline and filled area
  const points = blowCounts.map((val, idx) => `${getX(val)},${getY(idx)}`).join(' ');
  const firstPoint = blowCounts.length > 0 ? `${marginLeft},${getY(0)}` : '';
  const lastPoint = blowCounts.length > 0 ? `${marginLeft},${getY(totalCount - 1)}` : '';
  const areaPoints = `${firstPoint} ${points} ${lastPoint}`;

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
              <span>Soil Resistance Profile (Boring Log)</span>
            </span>
            {recordScope === 'WINDOW' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                {windowLength} {unitLabel} สุดท้าย
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            กราฟแสดงแรงต้านทานของชั้นดินต่อเนื่องตามความลึก (SPT / Driving Resistance Curve)
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
      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div>
          <span className="text-slate-400 block">ความลึกที่บันทึกแล้ว:</span>
          <span className="font-bold text-slate-800">{totalDepthStr}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block">แรงต้านทานสูงสุด (Max Resistance):</span>
          <span className="font-bold text-amber-600">{maxBlowStr}</span>
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
        <div className="relative border border-slate-200 rounded-xl bg-slate-50/40 p-1 overflow-x-auto">
          <div className="min-w-[320px] max-h-[380px] overflow-y-auto pr-1">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
              style={{ minHeight: `${svgHeight}px` }}
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

              {/* 3. Left Y-Axis (Depth) and Horizontal Guides */}
              {blowCounts.map((val, idx) => {
                const yPos = getY(idx);
                const step = idx + 1;
                const isHovered = hoveredIndex === idx;

                return (
                  <g key={idx}>
                    {/* Horizontal depth line */}
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

              {/* 6. Interactive Data Nodes (Circles) */}
              {blowCounts.map((val, idx) => {
                const cx = getX(val);
                const cy = getY(idx);
                const isHovered = hoveredIndex === idx;
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
          {hoveredIndex !== null && blowCounts[hoveredIndex] !== undefined && (
            <div className="mt-2 p-2.5 bg-slate-900 text-white rounded-xl text-xs space-y-1 shadow-md animate-in fade-in">
              <div className="flex items-center justify-between font-mono">
                <span className="text-amber-400 font-bold">
                  📍 ความลึก: {hoveredIndex + 1} {unitLabel}{' '}
                  <span className="text-slate-400 font-normal">
                    ({isFeet ? `${((hoveredIndex + 1) * 0.3048).toFixed(1)}m` : `${((hoveredIndex + 1) * 3.28084).toFixed(0)}ft`})
                  </span>
                </span>
                <span className="font-black text-amber-300 text-sm">
                  {blowCounts[hoveredIndex]} {blowUnitLabel}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>{getSoilStratumName(blowCounts[hoveredIndex])}</span>
                <span className="text-slate-400 font-mono">
                  {isFeet
                    ? `&asymp; ${Math.round(blowCounts[hoveredIndex] * 3.28084)} blw/m`
                    : `&asymp; ${Math.round(blowCounts[hoveredIndex] / 3.28084)} blw/ft`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: Horizontal Bars */}
      {chartMode === 'BAR' && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {blowCounts.map((blow, idx) => {
            const step = idx + 1;
            const altDepth = isFeet
              ? `${(step * 0.3048).toFixed(1)}m`
              : `${(step * 3.28084).toFixed(0)}ft`;

            const altBlow = isFeet
              ? `${Math.round(blow * 3.28084)} blw/m`
              : `${Math.round(blow / 3.28084)} blw/ft`;

            const pct = Math.min(100, Math.round((blow / maxScale) * 100));

            const barColor =
              blow >= 50
                ? 'bg-rose-500'
                : blow >= 30
                ? 'bg-amber-500'
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
      )}
    </div>
  );
}
