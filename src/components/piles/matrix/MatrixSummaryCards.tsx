'use client';

import React from 'react';
import { Layers, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface MatrixSummaryCardsProps {
  totalCount: number;
  notDrivenCount: number;
  passedCount: number;
  failedCount: number;
  progressPercent: number;
  filterStatus: 'ALL' | 'NOT_DRIVEN' | 'PASSED' | 'FAILED';
  setFilterStatus: (status: 'ALL' | 'NOT_DRIVEN' | 'PASSED' | 'FAILED') => void;
}

export default function MatrixSummaryCards({
  totalCount,
  notDrivenCount,
  passedCount,
  failedCount,
  progressPercent,
  filterStatus,
  setFilterStatus,
}: MatrixSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Total */}
      <div
        onClick={() => setFilterStatus('ALL')}
        className={`cursor-pointer bg-white rounded-xl p-4 border transition ${
          filterStatus === 'ALL'
            ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase">จำนวนทั้งหมด</span>
          <Layers className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalCount}</span>
          <span className="text-xs text-slate-400 font-semibold">ต้น</span>
        </div>
        <div className="mt-2 text-[11px] text-indigo-600 font-bold">
          ความคืบหน้า {progressPercent}%
        </div>
      </div>

      {/* Not Driven (Pending) - High Contrast Highlight */}
      <div
        onClick={() => setFilterStatus('NOT_DRIVEN')}
        className={`cursor-pointer rounded-xl p-4 border transition ${
          filterStatus === 'NOT_DRIVEN'
            ? 'bg-amber-50/50 border-amber-500 shadow-md ring-2 ring-amber-500/20'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-700 uppercase">⚪ ยังไม่ได้ตอก</span>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-amber-600">{notDrivenCount}</span>
          <span className="text-xs text-slate-400 font-semibold">ต้น</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 font-medium">
          {totalCount > 0 ? `เหลืออีก ${Math.round((notDrivenCount / totalCount) * 100)}%` : '-'}
        </div>
      </div>

      {/* Passed */}
      <div
        onClick={() => setFilterStatus('PASSED')}
        className={`cursor-pointer rounded-xl p-4 border transition ${
          filterStatus === 'PASSED'
            ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 uppercase">🟢 ตอกเสร็จ Set ผ่าน</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-emerald-600">{passedCount}</span>
          <span className="text-xs text-slate-400 font-semibold">ต้น</span>
        </div>
        <div className="mt-2 text-[11px] text-emerald-700 font-medium">
          {totalCount > 0 ? `${Math.round((passedCount / totalCount) * 100)}% ของโครงการ` : '-'}
        </div>
      </div>

      {/* Issues / Failed */}
      <div
        onClick={() => setFilterStatus('FAILED')}
        className={`cursor-pointer rounded-xl p-4 border transition ${
          filterStatus === 'FAILED'
            ? 'bg-rose-50/50 border-rose-500 shadow-md ring-2 ring-rose-500/20'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-rose-700 uppercase">🔴 Re-drive / มีปัญหา</span>
          <AlertCircle className="w-4 h-4 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-rose-600">{failedCount}</span>
          <span className="text-xs text-slate-400 font-semibold">ต้น</span>
        </div>
        <div className="mt-2 text-[11px] text-rose-600 font-medium">
          {failedCount > 0 ? 'ต้องตอกซ้ำ / เจาะสำรวจ' : 'ไม่มีเสาเข็มติดปัญหา'}
        </div>
      </div>
    </div>
  );
}
