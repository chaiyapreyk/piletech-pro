'use client';

import React from 'react';
import {
  Table,
  Plus,
  TrendingUp,
  Minus,
  Trash2,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  clampEqualizerBlowValue,
  applyPresetCurve,
} from '@/lib/calculations/drivingEqualizer';
import {
  appendDrivingInterval,
  updateDrivingInterval,
} from '@/lib/drivingIntervals';

interface HorizontalEqualizerViewProps {
  blowCounts: (number | null)[];
  onChange: (counts: (number | null)[]) => void;
  unit: 'METER' | 'FEET';
  scope: 'FULL' | 'WINDOW';
  windowLength: number;
}

export default function HorizontalEqualizerView({
  blowCounts,
  onChange,
  unit,
  scope,
  windowLength,
}: HorizontalEqualizerViewProps) {
  const unitShort = unit === 'FEET' ? 'ft' : 'ม.';
  const currentCount = blowCounts.length;

  const handleSliderChange = (index: number, val: number) => {
    const clamped = val <= 0 ? null : clampEqualizerBlowValue(val);
    onChange(updateDrivingInterval(blowCounts, index, clamped));
  };

  const handleDirectInputChange = (index: number, rawStr: string) => {
    if (rawStr === '' || rawStr.trim() === '0') {
      onChange(updateDrivingInterval(blowCounts, index, null));
      return;
    }
    const parsed = parseInt(rawStr, 10);
    if (isNaN(parsed)) return;
    const clamped = clampEqualizerBlowValue(parsed);
    onChange(updateDrivingInterval(blowCounts, index, clamped));
  };

  const handleNudge = (index: number, delta: number) => {
    const cur = blowCounts[index];
    const base = typeof cur === 'number' && cur > 0 ? cur : 0;
    const nextVal = base + delta;
    const clamped = nextVal <= 0 ? null : clampEqualizerBlowValue(nextVal);
    onChange(updateDrivingInterval(blowCounts, index, clamped));
  };

  const handleToggleSkip = (index: number) => {
    const cur = blowCounts[index];
    onChange(updateDrivingInterval(blowCounts, index, cur === null || cur === 0 ? 25 : null));
  };

  const handleDeleteInterval = (index: number) => {
    const next = blowCounts.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleAddInterval = (initialValue: number | null = null) => {
    onChange(appendDrivingInterval(blowCounts, initialValue));
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
    <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-800 space-y-3.5">
      {/* Console Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-xs">
            <Table className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-amber-400 tracking-wide uppercase">
                EXCEL TABLE + EQUALIZER SLIDER
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {currentCount} ช่วงความลึก
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              พิมพ์ตัวเลขลงในช่อง Excel หรือลากแถบ Equalizer ย่อส่วนในแต่ละแถวได้ทันที
            </p>
          </div>
        </div>

        {/* Quick Toolbar & Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetAllToZero}
            className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            title="รีเซ็ตทุกช่วงเป็น 0 (N/A)"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset 0</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('FLAT_20')}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            Flat 20
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('FLAT_30')}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            Flat 30
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('STEP_UP')}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <TrendingUp className="w-3 h-3" />
            <span>Step-Up</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddInterval(null)}
            className="px-3 py-1 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition active:scale-95 flex items-center gap-1 cursor-pointer ml-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มช่วง</span>
          </button>
        </div>
      </div>

      {/* Excel Table Container with Sticky Header */}
      {blowCounts.length === 0 ? (
        <div className="py-12 px-4 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-4">
          <Sliders className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-slate-300">ยังไม่มีข้อมูลช่วงการตอกในตาราง</h4>
            <p className="text-xs text-slate-500 mt-1">
              กดปุ่มด้านล่างเพื่อเริ่มสร้างตาราง 20 ช่วงมาตรฐาน (0 N/A)
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleResetAllToZero}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้าง 20 ช่วงมาตรฐาน (0 N/A)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80 shadow-inner">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 text-[11px] font-black uppercase text-slate-400 tracking-wider select-none items-center">
            <div className="col-span-2 sm:col-span-2 text-center">ช่วง ({unitShort})</div>
            <div className="col-span-3 sm:col-span-2 text-center">Blows (Excel)</div>
            <div className="col-span-4 sm:col-span-6 px-1">แถบสไลเดอร์ Equalizer (1-100)</div>
            <div className="col-span-3 sm:col-span-2 text-right pr-1">ปรับละเอียด / จัดการ</div>
          </div>

          {/* Table Rows (Dense Scrollable Sheet) */}
          <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-800/60">
            {blowCounts.map((val, idx) => {
              const isSkipped = val === null || val === 0;
              const blowVal = typeof val === 'number' ? val : 0;

              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-slate-900/90 transition group"
                >
                  {/* Col 1: Depth Label */}
                  <div className="col-span-2 sm:col-span-2 text-center">
                    <span className="inline-block px-2 py-0.5 rounded font-mono font-black text-xs text-amber-400 bg-slate-800/80 border border-slate-700/70 w-full max-w-[76px]">
                      #{idx + 1} {unitShort}
                    </span>
                  </div>

                  {/* Col 2: Excel Numeric Input Cell */}
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-center">
                    <div className="relative w-full max-w-[90px]">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={val === null ? '' : val}
                        placeholder="0 (N/A)"
                        onChange={(e) => handleDirectInputChange(idx, e.target.value)}
                        className={`w-full py-1 px-2 text-center font-mono font-bold text-xs rounded border transition focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                          isSkipped
                            ? 'bg-slate-900 text-slate-500 border-slate-800 focus:text-white'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-xs'
                        }`}
                        title="พิมพ์ตัวเลขโดยตรง หรือใช้ปุ่มลูกศรขึ้น/ลง"
                      />
                    </div>
                  </div>

                  {/* Col 3: Embedded Micro Equalizer Slider */}
                  <div className="col-span-4 sm:col-span-6 flex items-center gap-2 px-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={isSkipped ? 0 : blowVal}
                      onChange={(e) => {
                        const numericVal = parseInt(e.target.value, 10) || 0;
                        handleSliderChange(idx, numericVal);
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition"
                      aria-label={`Equalizer slider for interval ${idx + 1}`}
                    />
                    <span className="w-8 text-[11px] font-mono font-bold text-slate-400 shrink-0 text-right">
                      {isSkipped ? 'N/A' : blowVal}
                    </span>
                  </div>

                  {/* Col 4: Quick Actions (Nudge - / +, Toggle 0/NA, Delete) */}
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleNudge(idx, -1)}
                      disabled={blowVal <= 0}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 flex items-center justify-center transition active:scale-90 cursor-pointer"
                      title="-1 Blow"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNudge(idx, 1)}
                      disabled={blowVal >= 100}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 flex items-center justify-center transition active:scale-90 cursor-pointer"
                      title="+1 Blow"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleSkip(idx)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                        isSkipped
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/80'
                      }`}
                      title={isSkipped ? 'เปิดใส่ค่า (25)' : 'ตั้งเป็น 0 (N/A)'}
                    >
                      {isSkipped ? 'Set' : '0'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteInterval(idx)}
                      className="w-6 h-6 rounded bg-slate-800/30 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 flex items-center justify-center transition cursor-pointer border border-transparent hover:border-rose-800/60 ml-0.5"
                      title="ลบแถวนี้"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Footer: Quick Add Row Bar */}
          <div className="p-2 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono pl-1">
              รวม {currentCount} ช่วง ({currentCount} {unitShort})
            </span>
            <button
              type="button"
              onClick={() => handleAddInterval(null)}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 hover:text-amber-400 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-amber-400" />
              <span>เพิ่มช่วงถัดไป (#{currentCount + 1} {unitShort})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
