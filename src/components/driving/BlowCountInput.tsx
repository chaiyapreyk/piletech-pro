'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ArrowDown, Disc3, Keyboard } from 'lucide-react';
import RollingWheel from '@/components/ui/RollingWheel';

interface Props {
  blowCounts: number[];
  onChange: (counts: number[]) => void;
}

export default function BlowCountInput({ blowCounts, onChange }: Props) {
  const [currentInput, setCurrentInput] = useState<string>('20');
  const [wheelBlowValue, setWheelBlowValue] = useState<number>(25);
  const [inputMode, setInputMode] = useState<'WHEEL' | 'KEYBOARD'>('WHEEL');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Generate 1 to 150 blows for the wheel
  const wheelItems = Array.from({ length: 150 }, (_, i) => i + 1);

  const handleAddMeter = (valueToAdd: number) => {
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

  const handleUpdateMeter = (index: number, val: number) => {
    const updated = [...blowCounts];
    updated[index] = val;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-slate-800 block">
            บันทึก Blow Count รายเมตร (Penetration Log)
          </label>
          <span className="text-xs text-slate-500 font-medium">
            ตอกแล้ว: <strong className="text-amber-600">{blowCounts.length}</strong> เมตร
          </span>
        </div>

        {/* Rolling Wheel vs Keyboard Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
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
            <span>หมุนวงล้อ (Wheel)</span>
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
            <span>พิมพ์ตัวเลข</span>
          </button>
        </div>
      </div>

      {/* Input Area based on Mode */}
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
                label="เลือก Blows/เมตร"
              />
            </div>

            {/* Action Bar */}
            <div className="flex-1 space-y-3 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  เมตรถัดไป: <strong>เมตรที่ {blowCounts.length + 1}</strong>
                </span>
                <div className="text-right">
                  <div className="text-lg font-black font-mono text-amber-600 bg-amber-100 px-3 py-0.5 rounded-lg inline-block">
                    {wheelBlowValue} <span className="text-xs font-normal">blows/m</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                    &asymp; {Math.round(wheelBlowValue / 3.28084)} blows/ft
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddMeter(wheelBlowValue)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึก {wheelBlowValue} Blows (เมตรที่ {blowCounts.length + 1})</span>
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
          <span className="text-xs font-semibold text-slate-600">เพิ่มเมตรที่ {blowCounts.length + 1}:</span>
          <input
            type="number"
            placeholder="จำนวน Blows"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMeter(parseInt(currentInput))}
            className="w-24 text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={() => handleAddMeter(parseInt(currentInput))}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>บันทึกเมตรนี้</span>
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

      {/* Meter List (Scrollable chips) */}
      {blowCounts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>รายการเมตรที่บันทึกแล้ว (แตะเพื่อแก้ไขตัวเลขได้ทันที):</span>
            <button
              type="button"
              onClick={handleRemoveLast}
              className="text-rose-600 hover:bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>ลบเมตรล่าสุด ({blowCounts.length} ม.)</span>
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50/70 rounded-xl border border-slate-200">
            {blowCounts.map((val, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-lg p-2 text-center shadow-xs hover:border-amber-400 transition"
              >
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-center gap-0.5">
                  <ArrowDown className="w-2.5 h-2.5" /> ม. {idx + 1}
                </div>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => handleUpdateMeter(idx, parseInt(e.target.value) || 0)}
                  className="w-full text-center font-black text-xs text-slate-800 focus:outline-none focus:text-amber-600 font-mono"
                />
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                  &asymp; {Math.round(val / 3.28084)} blw/ft
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
