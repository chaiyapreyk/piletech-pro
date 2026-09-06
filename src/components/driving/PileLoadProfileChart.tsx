'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart as LineChartIcon,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowUpRight,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  calculateDrivingLoadProfile,
  formatElevation,
  type DrivingLoadProfileResult,
  type DrivingRecordInput,
  type DrivingCriteriaInput,
  type LoadProfileIntervalPoint,
} from '@/lib/calculations/drivingLoadProfile';

interface Props {
  record?: DrivingRecordInput | null;
  criteria?: DrivingCriteriaInput | null;
  profileData?: DrivingLoadProfileResult;
  onEditCriteria?: () => void;
  className?: string;
}

export default function PileLoadProfileChart({
  record,
  criteria,
  profileData: inputProfileData,
  onEditCriteria,
  className = '',
}: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const profile = useMemo(() => {
    if (inputProfileData) return inputProfileData;
    return calculateDrivingLoadProfile(record, criteria);
  }, [inputProfileData, record, criteria]);

  const {
    recordUnit,
    points,
    fsLines,
    elevations,
    validation,
    maxBlows,
    maxLoadT,
    minElevationM,
    maxElevationM,
    hasValidLoadPoints,
    criteriaSummary,
  } = profile;

  const totalIntervals = points.length;
  const isFeet = recordUnit === 'FEET';
  const blowUnitLabel = isFeet ? 'Blow/ft' : 'Blow/m';
  const depthUnitLabel = isFeet ? 'ft' : 'm';

  // Check if we have ground level to map elevations
  const hasElevation = elevations.groundLevelM !== null && minElevationM !== null && maxElevationM !== null;

  // Chart layout geometry
  const chartHeight = Math.max(320, Math.min(600, totalIntervals * 24 + 80));
  const svgWidth = 420;
  const marginLeft = 65;
  const marginRight = 30;
  const marginTop = 45;
  const marginBottom = 35;
  const plotWidth = svgWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  // Elevation or Depth Y-Axis Scale
  // If elevation is available: elevation increases upwards (top = maxElev, bottom = minElev)
  // If no elevation: depth increases downwards (top = 0, bottom = totalIntervals)
  const elevSpan = hasElevation ? Math.max(1.0, (maxElevationM! - minElevationM!)) : 1.0;
  const elevMargin = hasElevation ? elevSpan * 0.05 : 0; // 5% padding
  const domainMinElev = hasElevation ? minElevationM! - elevMargin : 0;
  const domainMaxElev = hasElevation ? maxElevationM! + elevMargin : 1;
  const effectiveElevSpan = domainMaxElev - domainMinElev;

  const getYFromElevation = (elev: number) => {
    if (!hasElevation) return marginTop;
    const norm = (domainMaxElev - elev) / effectiveElevSpan;
    return marginTop + Math.max(0, Math.min(plotHeight, norm * plotHeight));
  };

  const getYFromIndex = (idx: number) => {
    if (hasElevation) {
      const pt = points[idx];
      if (pt && pt.elevationM !== null) {
        return getYFromElevation(pt.elevationM);
      }
    }
    if (totalIntervals <= 1) return marginTop + plotHeight / 2;
    return marginTop + (idx / (totalIntervals - 1)) * plotHeight;
  };

  // Blow Count X-Axis Scale
  const blowScaleMax = Math.ceil(Math.max(maxBlows, 30) / 10) * 10;
  const getBlowX = (blows: number) => {
    const clamped = Math.min(Math.max(0, blows), blowScaleMax);
    return marginLeft + (clamped / blowScaleMax) * plotWidth;
  };

  // Load Profile X-Axis Scale
  const loadScaleMax = Math.ceil(Math.max(maxLoadT, 60) / 20) * 20;
  const getLoadX = (loadT: number) => {
    const clamped = Math.min(Math.max(0, loadT), loadScaleMax);
    return marginLeft + (clamped / loadScaleMax) * plotWidth;
  };

  // Valid Points for Polyline
  const validBlowPoints = points
    .filter((p): p is LoadProfileIntervalPoint & { recordedBlows: number } => p.recordedBlows !== null)
    .map((p) => ({
      x: getBlowX(p.recordedBlows),
      y: getYFromIndex(p.intervalIndex),
      p,
    }));

  const validLoadPoints = points
    .filter((p): p is LoadProfileIntervalPoint & { estimatedUltimateLoadT: number } => p.estimatedUltimateLoadT !== null)
    .map((p) => ({
      x: getLoadX(p.estimatedUltimateLoadT),
      y: getYFromIndex(p.intervalIndex),
      p,
    }));

  // Generate clean, regular elevation ticks across the vertical axis
  const elevationTicks = useMemo(() => {
    if (!hasElevation) return [];
    const span = Math.max(1, maxElevationM! - minElevationM!);
    const step = span <= 6 ? 1 : span <= 14 ? 2 : span <= 25 ? 3 : 5;
    const start = Math.ceil(minElevationM! / step) * step;
    const end = Math.floor(maxElevationM! / step) * step;
    const ticks: number[] = [];
    for (let t = start; t <= end; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [hasElevation, maxElevationM, minElevationM]);

  // Render Horizontal Reference Markers (GL, Cut-off, Tip)
  const renderElevationHorizontalLines = () => {
    if (!hasElevation) return null;

    const markers = [
      {
        label: 'GL',
        fullName: 'Ground Level',
        val: elevations.groundLevelM,
        color: '#d97706', // amber-600
        dash: '4 3',
      },
      {
        label: 'COL',
        fullName: 'Cut-off Level',
        val: elevations.cutOffLevelM,
        color: '#2563eb', // blue-600
        dash: '4 3',
      },
      {
        label: elevations.isTipDerived ? 'TIP (Calc)' : 'TIP (Stored)',
        fullName: elevations.isTipDerived ? 'Calculated Tip Level' : 'Pile Tip Level',
        val: elevations.effectiveTipLevelM,
        color: '#dc2626', // rose-600
        dash: '2 2',
      },
    ].filter((m): m is { label: string; fullName: string; val: number; color: string; dash: string } => m.val !== null);

    return markers.map((m, i) => {
      const y = getYFromElevation(m.val);
      return (
        <g key={`marker-${m.label}-${i}`} className="pointer-events-none">
          <line
            x1={marginLeft}
            y1={y}
            x2={marginLeft + plotWidth}
            y2={y}
            stroke={m.color}
            strokeWidth={1.5}
            strokeDasharray={m.dash}
            opacity={0.85}
          />
          <text
            x={marginLeft + plotWidth - 4}
            y={y - 4}
            fill={m.color}
            fontSize={9}
            fontWeight="bold"
            textAnchor="end"
          >
            {m.label}: {formatElevation(m.val)}
          </text>
        </g>
      );
    });
  };

  const hoveredPoint = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < points.length
    ? points[hoveredIndex]
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Legends Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg">
                <LineChartIcon className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black tracking-wide">
                ไดอะแกรมการตอกและกำลังรับน้ำหนักประเมิน (Synchronized Driving & Load Profile)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              แกนตั้งร่วมแสดงระดับความลึก / ระดับความสูงดิน (Elevation) เทียบกับอัตราการตอกและกำลังแบกทานเสาเข็ม Hiley
            </p>
          </div>

          {criteriaSummary && (
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl text-[11px] border border-slate-700/80">
              <span className="text-slate-400">สเปกคำนวณ:</span>
              <span className="font-bold text-amber-400">{criteriaSummary.name}</span>
              <span className="text-slate-500">|</span>
              <span className="font-mono text-slate-300">Ra: {criteriaSummary.safeWorkingLoadT}t (FS {criteriaSummary.safetyFactor})</span>
            </div>
          )}
        </div>

        {/* Benchmarks & Legends */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[11px]">
          {/* Elevation Markers Legend */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
              ระดับอ้างอิง:
            </span>
            {elevations.groundLevelM !== null && (
              <span className="inline-flex items-center gap-1 text-amber-400 font-mono">
                <span className="w-2.5 h-0.5 bg-amber-500 inline-block"></span>
                GL: {formatElevation(elevations.groundLevelM)}
              </span>
            )}
            {elevations.cutOffLevelM !== null && (
              <span className="inline-flex items-center gap-1 text-blue-400 font-mono">
                <span className="w-2.5 h-0.5 bg-blue-500 inline-block"></span>
                COL: {formatElevation(elevations.cutOffLevelM)}
              </span>
            )}
            {elevations.effectiveTipLevelM !== null && (
              <span className="inline-flex items-center gap-1 text-rose-400 font-mono">
                <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span>
                {elevations.isTipDerived ? 'TIP (Calc)' : 'TIP (Stored)'}: {formatElevation(elevations.effectiveTipLevelM)}
              </span>
            )}
          </div>

          {/* FS Lines Legend */}
          {validation.isCriteriaValid && fsLines.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                เส้นเทียบ Factor of Safety:
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                <span className="w-2.5 h-0.5 border-b border-dashed border-emerald-400 inline-block"></span>
                FS 2.5 ({fsLines[0]?.ultimateLoadT}t)
              </span>
              <span className="inline-flex items-center gap-1 text-sky-400 font-mono text-[10px]">
                <span className="w-2.5 h-0.5 border-b border-dashed border-sky-400 inline-block"></span>
                FS 3.0 ({fsLines[1]?.ultimateLoadT}t)
              </span>
              <span className="inline-flex items-center gap-1 text-indigo-400 font-mono text-[10px]">
                <span className="w-2.5 h-0.5 border-b border-dashed border-indigo-400 inline-block"></span>
                FS 3.5 ({fsLines[2]?.ultimateLoadT}t)
              </span>
              <span className="inline-flex items-center gap-1 text-purple-400 font-mono text-[10px]">
                <span className="w-2.5 h-0.5 border-b border-dashed border-purple-400 inline-block"></span>
                FS 4.0 ({fsLines[3]?.ultimateLoadT}t)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Synchronized Dual Charts Grid */}
      {totalIntervals === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
          <LineChartIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-700 text-sm">ยังไม่มีข้อมูลบันทึกการตอก (Driving Penetration Log)</p>
          <p className="text-xs text-slate-400 mt-1">
            เมื่อบันทึกข้อมูลการตอกแต่ละช่วงความลึก กราฟอัตราการตอกและกำลังรับน้ำหนักประเมินจะแสดงผลที่นี่
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Blow Count Profile */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xs font-black text-slate-800">
                  1. Blow Count Profile ({blowUnitLabel})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Max: {maxBlows} {blowUnitLabel}
              </span>
            </div>

            <div className="relative overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${chartHeight}`}
                className="w-full h-auto min-h-[320px] select-none font-sans"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Background Grid */}
                <rect x={marginLeft} y={marginTop} width={plotWidth} height={plotHeight} fill="#fafafa" rx={4} />

                {/* Vertical grid lines for Blows */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                  const val = Math.round(blowScaleMax * frac);
                  const x = marginLeft + frac * plotWidth;
                  return (
                    <g key={`blow-grid-${idx}`}>
                      <line x1={x} y1={marginTop} x2={x} y2={marginTop + plotHeight} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <text x={x} y={marginTop + plotHeight + 16} fill="#64748b" fontSize={9} textAnchor="middle" fontFamily="monospace">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis title */}
                <text x={marginLeft + plotWidth / 2} y={chartHeight - 4} fill="#475569" fontSize={10} fontWeight="bold" textAnchor="middle">
                  อัตราการตอก ({blowUnitLabel})
                </text>

                {/* Elevation Horizontal Markers */}
                {renderElevationHorizontalLines()}

                {/* Regular Elevation Grid Lines & Y-Axis Scale */}
                {hasElevation ? (
                  elevationTicks.map((elevTick) => {
                    const y = getYFromElevation(elevTick);
                    const formatted = `${elevTick > 0 ? '+' : ''}${elevTick}m`;
                    return (
                      <g key={`blow-elev-grid-${elevTick}`}>
                        <line
                          x1={marginLeft}
                          y1={y}
                          x2={marginLeft + plotWidth}
                          y2={y}
                          stroke="#edf2f7"
                          strokeDasharray="2 2"
                        />
                        <text
                          x={marginLeft - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize={9}
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {formatted}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  points.map((pt, idx) => {
                    const y = getYFromIndex(idx);
                    return (
                      <g key={`row-${idx}`}>
                        <line
                          x1={marginLeft}
                          y1={y}
                          x2={marginLeft + plotWidth}
                          y2={y}
                          stroke="#edf2f7"
                        />
                        <text
                          x={marginLeft - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize={9}
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {`${pt.depthDisplay}${depthUnitLabel}`}
                        </text>
                      </g>
                    );
                  })
                )}

                {/* Full-width interactive horizontal hover bands for every elevation level */}
                {points.map((pt, idx) => {
                  const y = getYFromIndex(idx);
                  const bandH = Math.max(14, plotHeight / Math.max(1, totalIntervals));
                  return (
                    <rect
                      key={`hover-band-blow-${idx}`}
                      x={marginLeft}
                      y={y - bandH / 2}
                      width={plotWidth}
                      height={bandH}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredIndex(pt.intervalIndex)}
                    />
                  );
                })}

                {/* Polyline for Blows */}
                {validBlowPoints.length > 1 && (
                  <polyline
                    points={validBlowPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Nodes for Blows */}
                {validBlowPoints.map((item, idx) => {
                  const isHovered = hoveredIndex === item.p.intervalIndex;
                  return (
                    <circle
                      key={`blow-node-${idx}`}
                      cx={item.x}
                      cy={item.y}
                      r={isHovered ? 6 : 3.5}
                      fill={isHovered ? '#d97706' : '#f59e0b'}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="transition-all duration-100 cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(item.p.intervalIndex)}
                    />
                  );
                })}

                {/* Hover indicator crosshair and inline callout badge */}
                {hoveredIndex !== null && hoveredPoint && (
                  <g pointerEvents="none">
                    <line
                      x1={marginLeft}
                      y1={getYFromIndex(hoveredIndex)}
                      x2={marginLeft + plotWidth}
                      y2={getYFromIndex(hoveredIndex)}
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                    {hoveredPoint.elevationM !== null && (
                      <text
                        x={marginLeft - 8}
                        y={getYFromIndex(hoveredIndex) + 3}
                        fill="#b45309"
                        fontSize={9}
                        fontWeight="bold"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {formatElevation(hoveredPoint.elevationM)}
                      </text>
                    )}

                    {/* Inline Blow & Ru Badge */}
                    {hoveredPoint.recordedBlows !== null ? (() => {
                      const blowX = getBlowX(hoveredPoint.recordedBlows);
                      const y = getYFromIndex(hoveredIndex);
                      const hasRu = hoveredPoint.estimatedUltimateLoadT !== null;
                      const textContent = hasRu
                        ? `${hoveredPoint.recordedBlows} ${blowUnitLabel} · Ru: ${hoveredPoint.estimatedUltimateLoadT}t`
                        : `${hoveredPoint.recordedBlows} ${blowUnitLabel}`;
                      const pillW = hasRu ? 142 : 78;
                      const pillH = 22;
                      const isNearRight = blowX + pillW + 12 > marginLeft + plotWidth;
                      const pillX = isNearRight ? blowX - pillW - 8 : blowX + 8;
                      const pillY = Math.max(marginTop + 2, Math.min(marginTop + plotHeight - pillH - 2, y - pillH / 2));

                      return (
                        <g>
                          <circle
                            cx={blowX}
                            cy={y}
                            r={10}
                            fill="#f59e0b"
                            fillOpacity={0.25}
                            stroke="#d97706"
                            strokeWidth={1.5}
                          />
                          <circle
                            cx={blowX}
                            cy={y}
                            r={5.5}
                            fill="#78350f"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                          <rect
                            x={pillX}
                            y={pillY}
                            width={pillW}
                            height={pillH}
                            rx={6}
                            fill="#451a03"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                          />
                          <text
                            x={pillX + pillW / 2}
                            y={pillY + 14.5}
                            fill="#fef3c7"
                            fontSize={9.5}
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {textContent}
                          </text>
                        </g>
                      );
                    })() : null}
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Chart 2: Estimated Ultimate Load Profile (Ru) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <span className="text-xs font-black text-slate-800">
                    2. Estimated Ultimate Load Profile (Ru, tonnes)
                  </span>
                </div>
                {hasValidLoadPoints && (
                  <span className="text-[10px] text-indigo-600 font-mono font-bold">
                    Max: {maxLoadT} t
                  </span>
                )}
              </div>

              {!validation.isCriteriaValid ? (
                /* Missing criteria error state */
                <div className="h-[320px] sm:h-[400px] flex flex-col items-center justify-center bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl p-6 text-center">
                  <ShieldAlert className="w-10 h-10 text-amber-500 mb-2" />
                  <h4 className="text-sm font-black text-amber-900">
                    ไม่สามารถคำนวณไดอะแกรมกำลังรับน้ำหนักได้
                  </h4>
                  <p className="text-xs text-amber-700 mt-1 max-w-sm">
                    เสาเข็มยังไม่ได้กำหนดเกณฑ์การคำนวณ (Driving Criteria) หรือข้อมูลสูตร Hiley ไม่ครบถ้วน:
                  </p>
                  <ul className="text-[11px] text-amber-800 text-left mt-3 bg-white/80 border border-amber-200 rounded-xl p-3 space-y-1 w-full max-w-xs font-mono">
                    {validation.missingFields.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {onEditCriteria ? (
                    <button
                      type="button"
                      onClick={onEditCriteria}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>กำหนดขนาดและสเปกคำนวณให้เสาเข็ม</span>
                    </button>
                  ) : (
                    <Link
                      href="/calculator"
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ไปที่เครื่องคำนวณสูตร Hiley</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${chartHeight}`}
                    className="w-full h-auto min-h-[320px] select-none font-sans"
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Background Grid */}
                    <rect x={marginLeft} y={marginTop} width={plotWidth} height={plotHeight} fill="#fafafa" rx={4} />

                    {/* Vertical grid lines for Load (Ru) */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                      const val = Math.round(loadScaleMax * frac);
                      const x = marginLeft + frac * plotWidth;
                      return (
                        <g key={`load-grid-${idx}`}>
                          <line x1={x} y1={marginTop} x2={x} y2={marginTop + plotHeight} stroke="#e2e8f0" strokeDasharray="3 3" />
                          <text x={x} y={marginTop + plotHeight + 16} fill="#64748b" fontSize={9} textAnchor="middle" fontFamily="monospace">
                            {val}t
                          </text>
                        </g>
                      );
                    })}

                    {/* FS Reference Lines */}
                    {fsLines.map((fs, idx) => {
                      const x = getLoadX(fs.ultimateLoadT);
                      if (x > marginLeft + plotWidth) return null;
                      const colors = ['#10b981', '#0ea5e9', '#6366f1', '#a855f7'];
                      const strokeColor = colors[idx % colors.length];
                      return (
                        <g key={`fs-line-${idx}`}>
                          <line
                            x1={x}
                            y1={marginTop}
                            x2={x}
                            y2={marginTop + plotHeight}
                            stroke={strokeColor}
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                          />
                          <text
                            x={x}
                            y={marginTop - (idx % 2 === 0 ? 6 : 18)}
                            fill={strokeColor}
                            fontSize={7.5}
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            FS {fs.factor} ({fs.ultimateLoadT}t)
                          </text>
                        </g>
                      );
                    })}

                    {/* X-axis title */}
                    <text x={marginLeft + plotWidth / 2} y={chartHeight - 4} fill="#475569" fontSize={10} fontWeight="bold" textAnchor="middle">
                      กำลังรับน้ำหนักประเมิน Ultimate Load (Ru, ตัน)
                    </text>

                    {/* Elevation Horizontal Markers */}
                    {renderElevationHorizontalLines()}

                    {/* Regular Elevation Grid Lines & Y-Axis Scale */}
                    {hasElevation ? (
                      elevationTicks.map((elevTick) => {
                        const y = getYFromElevation(elevTick);
                        const formatted = `${elevTick > 0 ? '+' : ''}${elevTick}m`;
                        return (
                          <g key={`load-elev-grid-${elevTick}`}>
                            <line
                              x1={marginLeft}
                              y1={y}
                              x2={marginLeft + plotWidth}
                              y2={y}
                              stroke="#edf2f7"
                              strokeDasharray="2 2"
                            />
                            <text
                              x={marginLeft - 8}
                              y={y + 3}
                              fill="#64748b"
                              fontSize={9}
                              textAnchor="end"
                              fontFamily="monospace"
                            >
                              {formatted}
                            </text>
                          </g>
                        );
                      })
                    ) : (
                      points.map((pt, idx) => {
                        const y = getYFromIndex(idx);
                        return (
                          <g key={`load-row-${idx}`}>
                            <line
                              x1={marginLeft}
                              y1={y}
                              x2={marginLeft + plotWidth}
                              y2={y}
                              stroke="#edf2f7"
                            />
                            <text
                              x={marginLeft - 8}
                              y={y + 3}
                              fill="#64748b"
                              fontSize={9}
                              textAnchor="end"
                              fontFamily="monospace"
                            >
                              {`${pt.depthDisplay}${depthUnitLabel}`}
                            </text>
                          </g>
                        );
                      })
                    )}

                    {/* Full-width interactive horizontal hover bands for every elevation level */}
                    {points.map((pt, idx) => {
                      const y = getYFromIndex(idx);
                      const bandH = Math.max(14, plotHeight / Math.max(1, totalIntervals));
                      return (
                        <rect
                          key={`hover-band-load-${idx}`}
                          x={marginLeft}
                          y={y - bandH / 2}
                          width={plotWidth}
                          height={bandH}
                          fill="transparent"
                          className="cursor-crosshair"
                          onMouseEnter={() => setHoveredIndex(pt.intervalIndex)}
                        />
                      );
                    })}

                    {/* Polyline for Load */}
                    {validLoadPoints.length > 1 && (
                      <polyline
                        points={validLoadPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Nodes for Load */}
                    {validLoadPoints.map((item, idx) => {
                      const isHovered = hoveredIndex === item.p.intervalIndex;
                      return (
                        <circle
                          key={`load-node-${idx}`}
                          cx={item.x}
                          cy={item.y}
                          r={isHovered ? 6 : 3.5}
                          fill={isHovered ? '#3730a3' : '#6366f1'}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          className="transition-all duration-100 cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(item.p.intervalIndex)}
                        />
                      );
                    })}

                    {/* Hover indicator crosshair and inline Ru callout */}
                    {hoveredIndex !== null && hoveredPoint && (
                      <g pointerEvents="none">
                        <line
                          x1={marginLeft}
                          y1={getYFromIndex(hoveredIndex)}
                          x2={marginLeft + plotWidth}
                          y2={getYFromIndex(hoveredIndex)}
                          stroke="#6366f1"
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                        />
                        {hoveredPoint.elevationM !== null && (
                          <text
                            x={marginLeft - 8}
                            y={getYFromIndex(hoveredIndex) + 3}
                            fill="#4338ca"
                            fontSize={9}
                            fontWeight="bold"
                            textAnchor="end"
                            fontFamily="monospace"
                          >
                            {formatElevation(hoveredPoint.elevationM)}
                          </text>
                        )}

                        {/* Inline Ru Badge directly on the chart */}
                        {hoveredPoint.estimatedUltimateLoadT !== null ? (() => {
                          const loadX = getLoadX(hoveredPoint.estimatedUltimateLoadT);
                          const y = getYFromIndex(hoveredIndex);
                          const pillW = 88;
                          const pillH = 22;
                          const isNearRight = loadX + pillW + 12 > marginLeft + plotWidth;
                          const pillX = isNearRight ? loadX - pillW - 8 : loadX + 8;
                          const pillY = Math.max(marginTop + 2, Math.min(marginTop + plotHeight - pillH - 2, y - pillH / 2));

                          return (
                            <g>
                              {/* Highlight target node */}
                              <circle
                                cx={loadX}
                                cy={y}
                                r={10}
                                fill="#818cf8"
                                fillOpacity={0.25}
                                stroke="#6366f1"
                                strokeWidth={1.5}
                              />
                              <circle
                                cx={loadX}
                                cy={y}
                                r={5.5}
                                fill="#312e81"
                                stroke="#ffffff"
                                strokeWidth={2}
                              />

                              {/* Floating Ru Callout Pill */}
                              <rect
                                x={pillX}
                                y={pillY}
                                width={pillW}
                                height={pillH}
                                rx={6}
                                fill="#1e1b4b"
                                stroke="#818cf8"
                                strokeWidth={1.5}
                              />
                              <text
                                x={pillX + pillW / 2}
                                y={pillY + 14.5}
                                fill="#ffffff"
                                fontSize={10}
                                fontWeight="bold"
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                Ru: {hoveredPoint.estimatedUltimateLoadT} t
                              </text>
                            </g>
                          );
                        })() : (() => {
                          const y = getYFromIndex(hoveredIndex);
                          return (
                            <g>
                              <rect
                                x={marginLeft + plotWidth / 2 - 38}
                                y={y - 10}
                                width={76}
                                height={20}
                                rx={4}
                                fill="#f1f5f9"
                                stroke="#cbd5e1"
                                strokeWidth={1}
                              />
                              <text
                                x={marginLeft + plotWidth / 2}
                                y={y + 3.5}
                                fill="#94a3b8"
                                fontSize={9}
                                fontWeight="bold"
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                ไม่มีค่า Ru
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* Engineering Disclaimer Notice */}
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700">ข้อกำหนดการใช้งานทางวิศวกรรม:</span> กำลังรับน้ำหนักที่แสดงเป็นค่าประเมิน (Estimated Ultimate Load) ทางพลศาสตร์ด้วยสูตร Hiley Dynamic Formula จากข้อมูลการตอกจริง ไม่สามารถใช้ทดแทนผลการทดสอบทางพลศาสตร์ชั้นสูง (PDA / CAPWAP) หรือการทดสอบการรับน้ำหนักสถิตยศาสตร์ (Static Load Test) ตามที่สเปกระบุได้
            </div>
          </div>
        </div>
      )}

      {/* Synchronized Hover Detail Tooltip Card */}
      {hoveredPoint && (
        <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-100">
          <div className="flex items-center gap-3">
            <span className="bg-amber-500 text-slate-950 font-mono font-bold px-2 py-0.5 rounded text-xs">
              ช่วงที่ {hoveredPoint.depthDisplay} ({hoveredPoint.depthDisplay}{depthUnitLabel})
            </span>
            {hoveredPoint.elevationM !== null && (
              <span className="font-mono text-slate-300">
                ระดับดิน: <strong>{formatElevation(hoveredPoint.elevationM)} MSL</strong>
              </span>
            )}
            {hoveredPoint.actualDepthM !== undefined && (
              <span className="font-mono text-slate-400">
                (ลึก {hoveredPoint.actualDepthM.toFixed(2)} m)
              </span>
            )}
            <span className="font-mono text-amber-300">
              อัตราการตอก: <strong>{hoveredPoint.recordedBlows !== null ? `${hoveredPoint.recordedBlows} ${blowUnitLabel}` : 'เว้นช่วง (Skipped)'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            {hoveredPoint.setCmPerBlow !== null && (
              <span className="text-slate-300">
                Set: <strong>{hoveredPoint.setCmPerBlow.toFixed(2)} cm/blw</strong>
              </span>
            )}
            {hoveredPoint.estimatedUltimateLoadT !== null ? (
              <span className="bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-lg">
                Ru ประเมิน: {hoveredPoint.estimatedUltimateLoadT} ตัน (Ra: {hoveredPoint.estimatedSafeWorkingLoadT}t)
              </span>
            ) : (
              <span className="text-slate-400">ไม่มีค่า Ru</span>
            )}
            {hoveredPoint.compressionSource !== 'NONE' && (
              <span className="text-[10px] text-slate-400">
                ({hoveredPoint.compressionSource === 'MEASURED' ? 'C หน้างาน' : 'C มาตรฐาน'}: {hoveredPoint.compressionUsedCm}cm)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
