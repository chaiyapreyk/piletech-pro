'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ArrowDown, Disc3, Keyboard, Ruler, Compass, CheckCircle2 } from 'lucide-react';
import RollingWheel from '@/components/ui/RollingWheel';

interface Props {
  blowCounts: number[];
  onChange: (counts: number[]) => void;
  recordUnit?: 'METER' | 'FEET';
  onUnitChange?: (unit: 'METER' | 'FEET') => void;
  recordScope?: 'FULL' | 'WINDOW';
  onScopeChange?: (scope: 'FULL' | 'WINDOW') => void;
  windowLength?: number;
  onWindowLengthChange?: (len: number) => void;
}

export default function BlowCountInput({
  blowCounts,
  onChange,
  recordUnit: externalUnit,
  onUnitChange,
  recordScope: externalScope,
  onScopeChange,
  windowLength: externalWindowLength,
  onWindowLengthChange,
}: Props) {
  // Local fallbacks if parent does not manage states
  const [internalUnit, setInternalUnit] = useState<'METER' | 'FEET'>('METER');
  const [internalScope, setInternalScope] = useState<'FULL' | 'WINDOW'>('FULL');
  const [internalWindowLength, setInternalWindowLength] = useState<number>(20);

  const unit = externalUnit ?? internalUnit;
  const setUnit = onUnitChange ?? setInternalUnit;

  const scope = externalScope ?? internalScope;
  const setScope = onScopeChange ?? setInternalScope;

  const windowLength = externalWindowLength ?? internalWindowLength;
  const setWindowLength = onWindowLengthChange ?? setInternalWindowLength;

  const [currentInput, setCurrentInput] = useState<string>('20');
  const [wheelBlowValue, setWheelBlowValue] = useState<number>(25);
  const [inputMode, setInputMode] = useState<'WHEEL' | 'KEYBOARD'>('WHEEL');

  // Generate 1 to 150 blows for the wheel
  const wheelItems = Array.from({ length: 150 }, (_, i) => i + 1);

  const unitShort = unit === 'FEET' ? 'ft' : 'ม.';
  const blowUnitLabel = unit === 'FEET' ? 'blows/ft' : 'blows/m';

  const handleAddInterval = (valueToAdd: number) => {
    if (!isNaN(valueToAdd) && valueToAdd > 0) {
      onChange([...blowCounts, valueToAdd]);
    }
  };

  const handleQuickAdd = (increment: number) => {
    const lastVal = blowCounts.length > 0 ? blowCounts[blowCounts.length - 1] : 20;
    const newVal = Math.max(1, lastVal + increment);
    setWheelBlowValue(newVal);
    onChange([...blowCounts, newVal]);
  };

  const handleRemoveLast = () => {
    if (blowCounts.length > 0) {
      onChange(blowCounts.slice(0, -1));
    }
  };

  const handleUpdateInterval = (index: number, val: number) => {
    const updated = [...blowCounts];
    updated[index] = val;
    onChange(updated);
  };

  const currentCount = blowCounts.length;
  const isWindowComplete = scope === 'WINDOW' && currentCount >= windowLength;

  return (
    <div className="space-y-4">
      {/* 1. Header & Configuration Toolbar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>บันทึก Penetration Blow Count</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                {unit === 'FEET' ? 'Blows/ft' : 'Blows/m'}
              </span>
            </label>
            <span className="text-xs text-slate-500 font-medium">
              บันทึกแล้ว: <strong className="text-amber-600">{currentCount}</strong> {unitShort}
              {scope === 'WINDOW' && ` (จากช่วง ${windowLength} ${unitShort} สุดท้าย)`}
            </span>
          </div>

          {/* Rolling Wheel vs Keyboard Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setInputMode('WHEEL')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                inputMode === 'WHEEL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>หมุนวงล้อ</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('KEYBOARD')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                inputMode === 'KEYBOARD'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>คีย์บอร์ด</span>
            </button>
          </div>
        </div>

        {/* 2. Unit & Scope Selectors */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Unit Toggle: Blows/m vs Blows/ft */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5 text-slate-500" /> หน่วย:
            </span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setUnit('METER')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  unit === 'METER'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Blows / m (เมตร)
              </button>
              <button
                type="button"
                onClick={() => setUnit('FEET')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  unit === 'FEET'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Blows / ft (ฟุต)
              </button>
            </div>
          </div>

          {/* Scope Toggle: Full Depth vs Window (e.g. Last 20 ft) */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-slate-500" /> ขอบเขต:
            </span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setScope('FULL')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  scope === 'FULL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ตลอดความยาว
              </button>
              <button
                type="button"
                onClick={() => setScope('WINDOW')}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  scope === 'WINDOW'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ช่วงท้าย ({windowLength} {unitShort} สุดท้าย)
              </button>
            </div>
          </div>
        </div>

        {/* Configurable Window Length Input (When scope === 'WINDOW') */}
        {scope === 'WINDOW' && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900">
                จำนวน {unitShort} สุดท้ายที่ต้องการบันทึก:
              </span>
              <input
                type="number"
                min="1"
                max="100"
                value={windowLength}
                onChange={(e) => setWindowLength(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 bg-white border border-amber-300 rounded font-black font-mono text-center text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-amber-800 font-bold">{unitShort} สุดท้าย</span>

              {/* Presets */}
              <div className="flex items-center gap-1 ml-2">
                {[10, 15, 20, 25, 30].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWindowLength(preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                      windowLength === preset
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {preset} {unitShort}
                  </button>
                ))}
              </div>
            </div>

            {/* Window completion indicator */}
            <div>
              {isWindowComplete ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกครบ {windowLength} {unitShort} สุดท้ายแล้ว
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-800">
                  เหลืออีก {Math.max(0, windowLength - currentCount)} {unitShort}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Input Area based on Mode */}
      {inputMode === 'WHEEL' ? (
        /* Rolling Wheel Selector Area */
        <div className="bg-slate-50 border border-slate-300/80 p-4 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* The Rolling Drum */}
            <div className="w-36">
              <RollingWheel
                items={wheelItems}
                value={wheelBlowValue}
                onChange={(val) => setWheelBlowValue(Number(val))}
                label={`เลือก ${blowUnitLabel}`}
              />
            </div>

            {/* Action Bar */}
            <div className="flex-1 space-y-3 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  ลำดับถัดไป:{' '}
                  <strong>
                    {unit === 'FEET' ? 'ฟุตที่' : 'เมตรที่'} {currentCount + 1}
                    {scope === 'WINDOW' && ` / ${windowLength}`}
                  </strong>
                </span>
                <div className="text-right">
                  <div className="text-lg font-black font-mono text-amber-600 bg-amber-100 px-3 py-0.5 rounded-lg inline-block">
                    {wheelBlowValue} <span className="text-xs font-normal">{blowUnitLabel}</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                    {unit === 'FEET' ? (
                      <>&asymp; {Math.round(wheelBlowValue * 3.28084)} blows/m</>
                    ) : (
                      <>&asymp; {Math.round(wheelBlowValue / 3.28084)} blows/ft</>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddInterval(wheelBlowValue)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>
                  บันทึก {wheelBlowValue} Blows ({unit === 'FEET' ? 'ฟุตที่' : 'เมตรที่'} {currentCount + 1})
                </span>
              </button>

              {/* Quick Jump presets */}
              <div className="flex items-center gap-1 justify-between pt-1 text-xs">
                <span className="text-[11px] text-slate-400">ขยับไว:</span>
                {[15, 20, 25, 30, 40, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWheelBlowValue(preset)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      wheelBlowValue === preset
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Keyboard Input Mode */
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">
            เพิ่ม{unit === 'FEET' ? 'ฟุตที่' : 'เมตรที่'} {currentCount + 1}:
          </span>
          <input
            type="number"
            placeholder="จำนวน Blows"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddInterval(parseInt(currentInput))}
            className="w-24 text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={() => handleAddInterval(parseInt(currentInput))}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>บันทึกช่วงนี้</span>
          </button>

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => handleQuickAdd(0)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs font-medium"
            >
              เท่าเดิม
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(5)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs font-medium"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(10)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs font-medium"
            >
              +10
            </button>
          </div>
        </div>
      )}

      {/* 4. Interval Chips List (Scrollable) */}
      {blowCounts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>รายการที่บันทึกแล้ว ({blowUnitLabel}) - แตะเพื่อแก้ไขตัวเลข:</span>
            <button
              type="button"
              onClick={handleRemoveLast}
              className="text-rose-600 hover:bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3 h-3" />
              <span>
                ลบล่าสุด ({currentCount} {unitShort})
              </span>
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50/70 rounded-xl border border-slate-200">
            {blowCounts.map((val, idx) => {
              const displayStep = idx + 1;
              const converted =
                unit === 'FEET'
                  ? `${Math.round(val * 3.28084)} blw/m`
                  : `${Math.round(val / 3.28084)} blw/ft`;

              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg p-2 text-center shadow-xs hover:border-amber-400 transition"
                >
                  <div className="text-[10px] text-slate-400 font-mono flex items-center justify-center gap-0.5">
                    <ArrowDown className="w-2.5 h-2.5" />
                    {unit === 'FEET' ? `ft ${displayStep}` : `ม. ${displayStep}`}
                  </div>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => handleUpdateInterval(idx, parseInt(e.target.value) || 0)}
                    className="w-full text-center font-black text-xs text-slate-800 focus:outline-none focus:text-amber-600 font-mono"
                  />
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                    &asymp; {converted}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
