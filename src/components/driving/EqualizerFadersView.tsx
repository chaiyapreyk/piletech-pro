'use client';

import React from 'react';
import {
  Sliders,
  Plus,
  FastForward,
  RotateCcw,
  TrendingUp,
  Minus,
  Sparkles,
} from 'lucide-react';
import {
  clampEqualizerBlowValue,
  getSoilStrataByBlows,
  applyPresetCurve,
} from '@/lib/calculations/drivingEqualizer';
import {
  appendDrivingInterval,
  updateDrivingInterval,
} from '@/lib/drivingIntervals';

interface EqualizerFadersViewProps {
  blowCounts: (number | null)[];
  onChange: (counts: (number | null)[]) => void;
  unit: 'METER' | 'FEET';
  scope: 'FULL' | 'WINDOW';
  windowLength: number;
}

export default function EqualizerFadersView({
  blowCounts,
  onChange,
  unit,
  scope,
  windowLength,
}: EqualizerFadersViewProps) {
  const unitShort = unit === 'FEET' ? 'ft' : 'ม.';
  const currentCount = blowCounts.length;

  const handleSliderChange = (index: number, val: number) => {
    const clamped = clampEqualizerBlowValue(val);
    onChange(updateDrivingInterval(blowCounts, index, clamped));
  };

  const handleNudge = (index: number, delta: number) => {
    const cur = blowCounts[index];
    const base = typeof cur === 'number' && cur > 0 ? cur : 20;
    const clamped = clampEqualizerBlowValue(base + delta);
    onChange(updateDrivingInterval(blowCounts, index, clamped));
  };

  const handleToggleSkip = (index: number) => {
    const cur = blowCounts[index];
    onChange(updateDrivingInterval(blowCounts, index, cur === null ? 20 : null));
  };

  const handleAddFader = (initialValue: number | null = 25) => {
    onChange(appendDrivingInterval(blowCounts, initialValue));
  };

  const handleApplyPreset = (preset: 'FLAT_20' | 'FLAT_30' | 'STEP_UP') => {
    const targetLength = Math.max(
      scope === 'WINDOW' ? windowLength : 10,
      blowCounts.length || (scope === 'WINDOW' ? windowLength : 10)
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
    <div className="bg-slate-950 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-800 space-y-4">
      {/* Equalizer Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sliders className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide">
                AUDIO-STYLE MULTI-BAND EQUALIZER (1 - 100 BLOWS)
              </h3>
              <p className="text-[11px] text-slate-400">
                สไลเดอร์ปรับแต่งค่า Blow Count ตามช่วงความลึก พร้อมแถบสีความแน่นชั้นดิน
              </p>
            </div>
          </div>
        </div>

        {/* Presets and Global Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Presets:
          </span>
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
            <span>Step-Up (15-45)</span>
          </button>
        </div>
      </div>

      {/* Strata Color Legend */}
      <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1 text-[11px] text-slate-300 border-b border-slate-900 pb-2">
        <span className="text-slate-500 font-bold whitespace-nowrap">เกณฑ์ชั้นดิน:</span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> ดินอ่อน (&lt;15)
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> ปานกลาง (15-40)
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> แน่น (41-70)
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> ดาน/Refusal (&gt;70)
        </span>
      </div>

      {/* Main Equalizer Rack (Horizontal Scrollable Faders) */}
      {blowCounts.length === 0 ? (
        <div className="py-10 px-4 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/40 space-y-3">
          <Sliders className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
          <p className="text-xs font-semibold text-slate-400">
            ยังไม่มีช่วงบันทึกใน Rack Equalizer
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleAddFader(25)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มช่วงแรก ({unitShort}ที่ 1)</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('STEP_UP')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              สร้างชุดความลึกมาตรฐาน
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-3 pt-1">
          <div className="flex items-end gap-3 min-w-max px-2">
            {blowCounts.map((val, idx) => {
              const isSkipped = val === null;
              const blowVal = typeof val === 'number' ? val : 0;
              const strata = getSoilStrataByBlows(val);

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 w-20 transition group shrink-0"
                >
                  {/* Step / Interval Label */}
                  <span className="text-[10px] font-black font-mono text-slate-400 group-hover:text-amber-400 transition">
                    #{idx + 1} {unitShort}
                  </span>

                  {/* Blow Value Display */}
                  <div className="my-1.5 text-center">
                    {isSkipped ? (
                      <span className="text-xs font-black font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
                        SKIP
                      </span>
                    ) : (
                      <span
                        className={`text-base font-black font-mono tracking-tight block ${strata.colorClass}`}
                      >
                        {blowVal}
                      </span>
                    )}
                  </div>

                  {/* Nudge Plus */}
                  <button
                    type="button"
                    onClick={() => handleNudge(idx, 1)}
                    disabled={isSkipped || blowVal >= 100}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                    title="+1 Blow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Vertical Slider Fader Track */}
                  <div className="relative h-44 w-7 flex items-center justify-center my-1">
                    {/* Background Track Guide Lines */}
                    <div className="absolute inset-y-0 w-1.5 bg-slate-950 rounded-full border border-slate-800" />
                    
                    {/* Fill Level */}
                    {!isSkipped && (
                      <div
                        className={`absolute bottom-0 w-1.5 rounded-full transition-all duration-75 ${
                          blowVal < 15
                            ? 'bg-emerald-500'
                            : blowVal <= 40
                            ? 'bg-amber-500'
                            : blowVal <= 70
                            ? 'bg-orange-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ height: `${Math.min(100, blowVal)}%` }}
                      />
                    )}

                    {/* HTML5 Range Input rotated or configured vertically */}
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={isSkipped ? 20 : blowVal}
                      disabled={isSkipped}
                      onChange={(e) => handleSliderChange(idx, parseInt(e.target.value) || 1)}
                      className="h-40 w-40 -rotate-90 origin-center cursor-pointer opacity-90 hover:opacity-100 accent-amber-500 z-10"
                      aria-label={`Blow count for interval ${idx + 1}`}
                    />
                  </div>

                  {/* Nudge Minus */}
                  <button
                    type="button"
                    onClick={() => handleNudge(idx, -1)}
                    disabled={isSkipped || blowVal <= 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                    title="-1 Blow"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Bottom Toggle Skip / Active */}
                  <button
                    type="button"
                    onClick={() => handleToggleSkip(idx)}
                    className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded transition w-full text-center cursor-pointer ${
                      isSkipped
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isSkipped ? 'เปิดใส่' : 'ข้าม'}
                  </button>
                </div>
              );
            })}

            {/* Quick Add Next Interval Fader Card */}
            <div className="flex flex-col items-center justify-center bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-3 w-20 h-[308px] transition group shrink-0">
              <span className="text-[10px] font-bold text-slate-500 mb-2">
                #{currentCount + 1} {unitShort}
              </span>
              <button
                type="button"
                onClick={() => handleAddFader(25)}
                className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 flex items-center justify-center transition shadow-md cursor-pointer active:scale-95"
                title={`เพิ่ม ${unitShort}ที่ ${currentCount + 1}`}
              >
                <Plus className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-bold text-slate-500 mt-2 text-center group-hover:text-amber-400">
                เพิ่มช่วง
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
