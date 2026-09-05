'use client';

import React from 'react';
import { Layers, CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, HardHat } from 'lucide-react';

interface KpiProps {
  totalPiles: number;
  completedPiles: number;
  plannedPiles: number;
  issuePiles: number;
  setPassedCount: number;
  qcNormalCount: number;
  qcWarningCount: number;
  qcCriticalCount: number;
}

export default function ProjectKpiCards({
  totalPiles,
  completedPiles,
  plannedPiles,
  issuePiles,
  setPassedCount,
  qcNormalCount,
  qcWarningCount,
  qcCriticalCount,
}: KpiProps) {
  const drivenTotal = completedPiles + issuePiles;
  const progressPercent = totalPiles > 0 ? Math.round((drivenTotal / totalPiles) * 100) : 0;
  const setPassRate = drivenTotal > 0 ? Math.round((setPassedCount / drivenTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Overall Progress */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ความคืบหน้างานตอก (Progress)
          </span>
          <div className="bg-amber-100 text-amber-800 p-1.5 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-800 font-mono">{progressPercent}%</span>
          <span className="text-xs text-slate-500 font-medium">
            ({drivenTotal} / {totalPiles} ต้น)
          </span>
        </div>
        {/* Mini progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Last 10 Blows Set Pass Rate */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            อัตราได้ Set ผ่านเกณฑ์
          </span>
          <div className="bg-emerald-100 text-emerald-800 p-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-emerald-600 font-mono">{setPassRate}%</span>
          <span className="text-xs text-slate-500 font-medium">
            ({setPassedCount} ต้น ผ่านเกณฑ์)
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          {issuePiles > 0 ? (
            <span className="text-rose-600 font-bold">⚠️ พบ {issuePiles} ต้น ต้อง Re-drive</span>
          ) : (
            'เสาเข็มที่ตอกแล้วได้ Set ครบ 100%'
          )}
        </p>
      </div>

      {/* 3. QC Deviation Triage */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            การหนีศูนย์ (Eccentricity)
          </span>
          <div className="bg-blue-100 text-blue-800 p-1.5 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-800 font-mono">
            {qcNormalCount}
            <span className="text-xs text-slate-400 font-normal">/{drivenTotal}</span>
          </span>
          <span className="text-xs text-emerald-600 font-bold">&le; 5cm ปกติ</span>
        </div>
        <div className="flex gap-2 text-[11px] mt-2">
          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-200">
            {qcWarningCount} Warning
          </span>
          <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold border border-rose-200">
            {qcCriticalCount} Critical
          </span>
        </div>
      </div>

      {/* 4. Planned Remaining */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            เสาเข็มคงเหลือ (Remaining)
          </span>
          <div className="bg-slate-100 text-slate-700 p-1.5 rounded-lg">
            <HardHat className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-800 font-mono">{plannedPiles}</span>
          <span className="text-xs text-slate-500 font-medium">ต้น (รอเข้าตอก)</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          พร้อมส่งตอกตาม Master Schedule
        </p>
      </div>
    </div>
  );
}
