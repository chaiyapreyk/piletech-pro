'use client';

import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  ArrowDown,
  Disc3,
  Keyboard,
  Ruler,
  Compass,
  CheckCircle2,
  CheckSquare,
  Square,
  Check,
  X,
  Edit3,
  FastForward,
  RotateCcw,
  Scissors,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import RollingWheel from '@/components/ui/RollingWheel';

interface Props {
  blowCounts: (number | null)[];
  onChange: (counts: (number | null)[]) => void;
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
  // Local fallbacks: default unit is FEET, scope is WINDOW, windowLength is 20
  const [internalUnit, setInternalUnit] = useState<'METER' | 'FEET'>('FEET');
  const [internalScope, setInternalScope] = useState<'FULL' | 'WINDOW'>('WINDOW');
  const [internalWindowLength, setInternalWindowLength] = useState<number>(20);

  const normalizeUnit = (u?: string | null): 'METER' | 'FEET' => {
    if (!u) return 'FEET';
    const upper = u.toUpperCase().trim();
    if (upper === 'METER') return 'METER';
    if (upper === 'FEET' || upper === 'FT') return 'FEET';
    return 'FEET';
  };

  const unit: 'METER' | 'FEET' = normalizeUnit(externalUnit ?? internalUnit);
  const setUnit = onUnitChange ?? setInternalUnit;

  const scope = externalScope ?? internalScope;
  const setScope = onScopeChange ?? setInternalScope;

  const windowLength = externalWindowLength ?? internalWindowLength;
  const setWindowLength = onWindowLengthChange ?? setInternalWindowLength;

  const [currentInput, setCurrentInput] = useState<string>('20');
  const [wheelBlowValue, setWheelBlowValue] = useState<number>(25);
  const [inputMode, setInputMode] = useState<'WHEEL' | 'KEYBOARD'>('WHEEL');
  const [viewFormat, setViewFormat] = useState<'TABLE' | 'CHIPS'>('TABLE');

  // Recorded items selection and deletion state
  const [isSelectDeleteMode, setIsSelectDeleteMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Small Rolling Modal state for editing intervals
  const [editTarget, setEditTarget] = useState<{
    index: number;
    step: number;
    value: number;
  } | null>(null);

  const handleOpenEditModal = (index: number) => {
    const currentVal = blowCounts[index];
    const initialVal = typeof currentVal === 'number' && currentVal > 0 ? currentVal : wheelBlowValue;
    setEditTarget({
      index,
      step: index + 1,
      value: initialVal,
    });
  };

  const handleConfirmEditModal = () => {
    if (editTarget) {
      handleUpdateInterval(editTarget.index, editTarget.value);
      setEditTarget(null);
    }
  };

  const handleMarkSkippedInModal = () => {
    if (editTarget) {
      handleUpdateInterval(editTarget.index, null);
      setEditTarget(null);
    }
  };

  const handleNudgeEditValue = (delta: number) => {
    if (editTarget) {
      const newVal = Math.max(1, Math.min(150, editTarget.value + delta));
      setEditTarget({ ...editTarget, value: newVal });
    }
  };

  const handleSetEditValue = (val: number) => {
    if (editTarget) {
      setEditTarget({ ...editTarget, value: Math.max(1, Math.min(150, val)) });
    }
  };

  // Generate 1 to 150 blows for the wheel
  const wheelItems = Array.from({ length: 150 }, (_, i) => i + 1);

  const unitShort = unit === 'FEET' ? 'ft' : 'ม.';
  const blowUnitLabel = unit === 'FEET' ? 'blows/ft' : 'blows/m';

  // Count metrics
  const currentDrivenCount = blowCounts.length;
  const recordedCount = blowCounts.filter((v): v is number => typeof v === 'number' && v > 0).length;
  const skippedCount = blowCounts.filter((v) => v === null).length;
  const remainingCount = scope === 'WINDOW' ? Math.max(0, windowLength - currentDrivenCount) : 0;
  const isWindowComplete = scope === 'WINDOW' && currentDrivenCount >= windowLength;

  const handleAddInterval = (valueToAdd: number) => {
    if (!isNaN(valueToAdd) && valueToAdd > 0) {
      onChange([...blowCounts, valueToAdd]);
    }
  };

  // Quick skip interval (when driving too fast or missed recording)
  const handleSkipInterval = () => {
    onChange([...blowCounts, null]);
  };

  const handleQuickAdd = (increment: number) => {
    // Find last recorded valid number
    const lastValid = [...blowCounts].reverse().find((v): v is number => typeof v === 'number' && v > 0) ?? 20;
    const newVal = Math.max(1, lastValid + increment);
    setWheelBlowValue(newVal);
    onChange([...blowCounts, newVal]);
  };

  const handleRemoveLast = () => {
    if (blowCounts.length > 0) {
      onChange(blowCounts.slice(0, -1));
    }
  };

  const handleUpdateInterval = (index: number, val: number | null) => {
    const updated = [...blowCounts];
    // If updating a slot beyond current array length, fill gaps with null
    while (updated.length < index) {
      updated.push(null);
    }
    updated[index] = val;
    onChange(updated);
  };

  // Toggle selection for bulk deletion
  const toggleSelectIndex = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Delete single interval by index
  const handleDeleteIndex = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = blowCounts.filter((_, i) => i !== index);
    onChange(updated);
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  };

  // Delete all selected intervals
  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) return;
    const updated = blowCounts.filter((_, i) => !selectedIndices.has(i));
    onChange(updated);
    setSelectedIndices(new Set());
    setIsSelectDeleteMode(false);
  };

  // Select all intervals
  const handleSelectAll = () => {
    setSelectedIndices(new Set(blowCounts.map((_, i) => i)));
  };

  // Clear all intervals
  const handleClearAll = () => {
    if (window.confirm('⚠️ ยืนยันการล้างข้อมูล Penetration Log ทั้งหมดหรือไม่?')) {
      onChange([]);
      setSelectedIndices(new Set());
      setIsSelectDeleteMode(false);
    }
  };

  // Trim trailing unreached intervals (Set reached early before window length)
  const handleTrimToCurrent = () => {
    if (blowCounts.length > 0) {
      if (window.confirm(`✂️ ยืนยันการปรับความยาวช่วงบันทึกสิ้นสุดที่ฟุตที่ ${currentDrivenCount} หรือไม่?`)) {
        setWindowLength(currentDrivenCount);
      }
    }
  };

  // Step adjust single interval
  const handleStepValue = (index: number, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const current = blowCounts[index];
    if (typeof current === 'number') {
      const nextVal = Math.max(1, current + delta);
      handleUpdateInterval(index, nextVal);
    } else {
      handleUpdateInterval(index, Math.max(1, wheelBlowValue + delta));
    }
  };

  // Helper for equivalent conversion text
  const getConvertedText = (val: number | null) => {
    if (val === null || val === undefined) return '—';
    if (unit === 'FEET') {
      return `≈ ${Math.round(val * 3.28084)} blw/m`;
    }
    return `≈ ${Math.round(val / 3.28084)} blw/ft`;
  };

  // Helper for alternate depth
  const getAltDepthText = (step: number) => {
    if (unit === 'FEET') {
      return `${(step * 0.3048).toFixed(1)}m`;
    }
    return `${Math.round(step * 3.28084)}ft`;
  };

  // Calculate rows for the table:
  // Show at least windowLength rows (default 20), or up to currentDrivenCount + 1
  const totalTableRows = scope === 'WINDOW'
    ? Math.max(windowLength, currentDrivenCount + 1)
    : Math.max(currentDrivenCount + 1, 10);

  const tableIndices = Array.from({ length: totalTableRows }, (_, i) => i);

  return (
    <div className="space-y-4">
      {/* 1. Header & Configuration Toolbar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>บันทึก Penetration Blow Count</span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                {unit === 'FEET' ? 'Blows/ft (ค่าเริ่มต้น)' : 'Blows/m'}
              </span>
            </label>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
              <span>
                ตอกแล้ว: <strong className="text-amber-700 font-bold">{currentDrivenCount}</strong> {unitShort}
              </span>
              <span>•</span>
              <span>บันทึก: <strong className="text-emerald-700 font-bold">{recordedCount}</strong></span>
              {skippedCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-800 font-bold">ข้าม: {skippedCount}</span>
                </>
              )}
              {scope === 'WINDOW' && (
                <>
                  <span>•</span>
                  <span>เป้าหมายช่วงท้าย: <strong className="text-slate-800">{windowLength}</strong> {unitShort}</span>
                </>
              )}
            </div>
          </div>

          {/* Rolling Wheel vs Keyboard Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto shadow-2xs">
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
          {/* Scope Toggle: Last Window (Default) vs Full Depth */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-600" /> ขอบเขต:
            </span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setScope('WINDOW')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                  scope === 'WINDOW'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>ช่วงท้าย ({windowLength} {unitShort} สุดท้าย)</span>
                <span className="text-[10px] px-1 rounded bg-amber-600 text-white font-mono">Default</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('FULL')}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  scope === 'FULL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ตลอดความยาวเสาเข็ม
              </button>
            </div>
          </div>

          {/* Unit Toggle: Blows/ft (Default) vs Blows/m */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5 text-slate-500" /> หน่วย:
            </span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setUnit('FEET')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                  unit === 'FEET'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Blows / ft (ฟุต)</span>
                <span className="text-[10px] px-1 rounded bg-amber-600 text-white font-mono">Default</span>
              </button>
              <button
                type="button"
                onClick={() => setUnit('METER')}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  unit === 'METER'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Blows / m (เมตร)
              </button>
            </div>
          </div>
        </div>

        {/* Configurable Window Length Bar (When scope === 'WINDOW') */}
        {scope === 'WINDOW' && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-950">
                จำนวน {unitShort} สุดท้ายที่ต้องการบันทึก:
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={windowLength}
                  onChange={(e) => setWindowLength(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 px-2 py-1 bg-white border border-amber-300 rounded-md font-black font-mono text-center text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-amber-900 font-bold">{unitShort}</span>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1">
                {[10, 15, 20, 25, 30].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWindowLength(preset)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                      windowLength === preset
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {preset} {unitShort}
                  </button>
                ))}
              </div>
            </div>

            {/* Window Progress & Early Set Trim Button */}
            <div className="flex items-center gap-2">
              {isWindowComplete ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกครบ {windowLength} {unitShort} แล้ว
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-900 bg-white/70 px-2 py-0.5 rounded border border-amber-200">
                  เหลืออีก <strong>{remainingCount}</strong> {unitShort}
                </span>
              )}

              {/* If user stopped early because set was reached */}
              {currentDrivenCount > 0 && currentDrivenCount < windowLength && (
                <button
                  type="button"
                  onClick={handleTrimToCurrent}
                  title="ตัดจบที่ฟุตปัจจุบัน กรณีเสาเข็มได้ Set ก่อนครบ 20 ฟุต"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
                >
                  <Scissors className="w-3 h-3" />
                  <span>ตัดจบที่ฟุตที่ {currentDrivenCount}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Fast Input Area based on Mode */}
      {inputMode === 'WHEEL' ? (
        /* Rolling Wheel Selector Area */
        <div className="bg-slate-50 border border-slate-300/80 p-4 rounded-2xl shadow-2xs">
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
                <div>
                  <span className="text-xs text-slate-600 block">
                    ลำดับถัดไป:{' '}
                    <strong className="text-amber-700 font-bold">
                      {unit === 'FEET' ? 'ฟุตที่' : 'เมตรที่'} {currentDrivenCount + 1}
                      {scope === 'WINDOW' && ` (จาก ${windowLength})`}
                    </strong>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    หากตอกเร็วบันทึกไม่ทัน กดปุ่ม &quot;ข้าม&quot; เพื่อข้ามได้ทันที
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black font-mono text-amber-600 bg-amber-100 px-3 py-1 rounded-lg inline-block border border-amber-200">
                    {wheelBlowValue} <span className="text-xs font-normal">{blowUnitLabel}</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                    {getConvertedText(wheelBlowValue)}
                  </div>
                </div>
              </div>

              {/* Primary Dual Action Buttons: [Record] and [Skip] */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Big Record Button */}
                <button
                  type="button"
                  onClick={() => handleAddInterval(wheelBlowValue)}
                  className="sm:col-span-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    บันทึก {wheelBlowValue} Blows ({unit === 'FEET' ? 'ฟุตที่' : 'เมตรที่'} {currentDrivenCount + 1})
                  </span>
                </button>

                {/* Instant Skip Button for Fast Hammering */}
                <button
                  type="button"
                  onClick={handleSkipInterval}
                  title="ข้ามช่วงนี้เมื่อตอกเร็วหรือบันทึกไม่ทัน (สามารถคลิกกลับมากรอกย้อนหลังได้)"
                  className="sm:col-span-4 bg-slate-200 hover:bg-amber-100 border border-slate-300 text-slate-800 hover:text-amber-900 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-98"
                >
                  <FastForward className="w-4 h-4 text-amber-600" />
                  <span>ข้าม{unitShort}ที่ {currentDrivenCount + 1} (ไม่ทัน)</span>
                </button>
              </div>

              {/* Quick Jump presets */}
              <div className="flex items-center gap-1 justify-between pt-1 text-xs">
                <span className="text-[11px] text-slate-400 font-medium">ขยับไว:</span>
                {[15, 20, 25, 30, 40, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWheelBlowValue(preset)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
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
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700">
              เพิ่ม{unit === 'FEET' ? 'ฟุตที่' : 'เมตรที่'} {currentDrivenCount + 1}:
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
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>บันทึก</span>
            </button>

            {/* Skip button on keyboard mode */}
            <button
              type="button"
              onClick={handleSkipInterval}
              className="bg-slate-200 hover:bg-amber-100 border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-600" />
              <span>ข้ามช่วงนี้ (ไม่ทัน)</span>
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
        </div>
      )}

      {/* 4. Display Toggle & Management Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <TableIcon className="w-4 h-4 text-amber-600" />
            <span>
              {scope === 'WINDOW'
                ? `ตารางบันทึกช่วง ${windowLength} ${unitShort} สุดท้าย`
                : `ตาราง Penetration Log (${currentDrivenCount} ${unitShort})`}
            </span>
          </span>

          {/* Table vs Chips Format Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewFormat('TABLE')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                viewFormat === 'TABLE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3 h-3" />
              <span>ตาราง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('CHIPS')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                viewFormat === 'CHIPS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>การ์ดกะทัดรัด</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Select-to-Delete Mode */}
          <button
            type="button"
            onClick={() => {
              setIsSelectDeleteMode(!isSelectDeleteMode);
              setSelectedIndices(new Set());
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border flex items-center gap-1 ${
              isSelectDeleteMode
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>{isSelectDeleteMode ? 'ปิดโหมดเลือกลบ' : 'เลือกลบ'}</span>
          </button>

          {/* Remove Last Item Shortcut */}
          {currentDrivenCount > 0 && (
            <button
              type="button"
              onClick={handleRemoveLast}
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              title="ลบรายการท้ายสุด"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ลบล่าสุด ({currentDrivenCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Sub-bar when isSelectDeleteMode is Active */}
      {isSelectDeleteMode && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 animate-in fade-in text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <CheckSquare className="w-4 h-4 text-rose-600" />
            <span>เลือกแล้ว: {selectedIndices.size} / {currentDrivenCount} รายการ</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="underline text-indigo-700 hover:text-indigo-900 ml-1 font-semibold"
            >
              เลือกทั้งหมด
            </button>
            {selectedIndices.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIndices(new Set())}
                className="underline text-slate-500 hover:text-slate-700 font-semibold"
              >
                ยกเลิกเลือก
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIndices.size === 0}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-xs transition disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบที่เลือก ({selectedIndices.size})</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition shadow-xs"
            >
              <span>ล้างข้อมูลทั้งหมด</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. VIEW FORMAT A: Interactive Table View (Default) */}
      {viewFormat === 'TABLE' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-10 backdrop-blur-xs border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-12 text-center">#</th>
                  <th className="p-2.5 w-32">ระยะ {unit === 'FEET' ? 'ฟุต (ft)' : 'เมตร (m)'}</th>
                  <th className="p-2.5 w-56">จำนวนการตอก ({unit === 'FEET' ? 'Blows/ft' : 'Blows/m'})</th>
                  <th className="p-2.5">สถานะ (Status)</th>
                  <th className="p-2.5 text-right w-44">การทำงาน / ปรับแก้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableIndices.map((idx) => {
                  const step = idx + 1;
                  const isRecorded = idx < currentDrivenCount && blowCounts[idx] !== null && blowCounts[idx] !== undefined;
                  const isSkipped = idx < currentDrivenCount && blowCounts[idx] === null;
                  const isActive = idx === currentDrivenCount;
                  const isPending = idx > currentDrivenCount;
                  const val = idx < currentDrivenCount ? blowCounts[idx] : undefined;
                  const isSelected = selectedIndices.has(idx);

                  // Styling for rows
                  let rowBg = 'hover:bg-slate-50/70';
                  if (isSelected) rowBg = 'bg-rose-50/80 ring-1 ring-rose-400';
                  else if (isActive) rowBg = 'bg-amber-50/90 ring-2 ring-amber-400/80 font-medium';
                  else if (isSkipped) rowBg = 'bg-slate-50/60 text-slate-500';

                  return (
                    <tr
                      key={idx}
                      onClick={isSelectDeleteMode && idx < currentDrivenCount ? () => toggleSelectIndex(idx) : undefined}
                      className={`transition ${rowBg} ${isSelectDeleteMode && idx < currentDrivenCount ? 'cursor-pointer' : ''}`}
                    >
                      {/* Checkbox or Row # */}
                      <td className="p-2.5 text-center font-mono text-slate-500 font-bold">
                        {isSelectDeleteMode && idx < currentDrivenCount ? (
                          <span className="flex items-center justify-center">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </span>
                        ) : (
                          <span>{step}</span>
                        )}
                      </td>

                      {/* Interval Label & Alternate Depth */}
                      <td className="p-2.5 font-bold font-mono">
                        <div className="flex items-center gap-1">
                          <span className={isActive ? 'text-amber-900 font-black' : 'text-slate-800'}>
                            {unit === 'FEET' ? `ft ${step}` : `ม. ${step}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal font-mono">
                          (เทียบเคียง {getAltDepthText(step)})
                        </div>
                      </td>

                      {/* Blow Count Value / Quick Stepper & Rolling Modal Trigger */}
                      <td className="p-2.5">
                        {isRecorded && typeof val === 'number' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleStepValue(idx, -1, e)}
                              title="ลด 1 blow"
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition active:scale-95"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(idx)}
                              title="แตะเพื่อหมุนเลือกตัวเลข (Small Rolling)"
                              className="font-black font-mono text-sm text-slate-900 cursor-pointer hover:bg-amber-100 hover:text-amber-800 px-2 py-0.5 rounded-md transition flex items-center gap-1 group border border-transparent hover:border-amber-300"
                            >
                              <span>{val}</span>
                              <span className="text-[10px] font-bold text-amber-800">
                                {unit === 'FEET' ? 'blw/ft' : 'blw/m'}
                              </span>
                              <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 transition" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleStepValue(idx, 1, e)}
                              title="เพิ่ม 1 blow"
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition active:scale-95"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>

                            <span className="text-[10px] text-slate-400 font-mono ml-1">
                              (เทียบเท่า {getConvertedText(val)})
                            </span>
                          </div>
                        ) : isSkipped ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(idx)}
                            className="text-slate-400 hover:text-amber-700 font-mono text-xs italic hover:underline flex items-center gap-1"
                          >
                            <span>— (แตะเพื่อกรอก)</span>
                          </button>
                        ) : isActive ? (
                          <span className="text-amber-800 font-bold text-[11px] font-mono">
                            {wheelBlowValue} {blowUnitLabel} (พร้อมบันทึก)
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="p-2.5">
                        {isRecorded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>บันทึกแล้ว</span>
                          </span>
                        ) : isSkipped ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                            <FastForward className="w-3 h-3 text-amber-600" />
                            <span>ข้าม (บันทึกไม่ทัน)</span>
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-400 animate-pulse">
                            <span>📍 กำลังตอกช่วงนี้</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            รอตอก
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-2.5 text-right">
                        {isRecorded ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(idx)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 hover:bg-amber-50 hover:text-amber-900 transition flex items-center gap-0.5"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>แก้ไข</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateInterval(idx, null)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold text-amber-700 hover:bg-amber-50 transition"
                            >
                              เปลี่ยนเป็นข้าม
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteIndex(idx, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="ลบแถวนี้"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : isSkipped ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(idx)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition border border-amber-300 flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>กรอกย้อนหลัง</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteIndex(idx, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="ลบรายการนี้"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : isActive ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleAddInterval(wheelBlowValue)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-600 transition"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={handleSkipInterval}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700 hover:bg-amber-100 transition"
                            >
                              ข้าม
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateInterval(idx, wheelBlowValue);
                            }}
                            className="text-[10px] text-slate-400 hover:text-amber-700 font-semibold transition"
                          >
                            + ข้ามมากรอกช่วงนี้
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. VIEW FORMAT B: Interactive Chips / Grid View */}
      {viewFormat === 'CHIPS' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1.5 bg-slate-50/70 rounded-xl border border-slate-200">
            {tableIndices.map((idx) => {
              const displayStep = idx + 1;
              const isRecorded = idx < currentDrivenCount && blowCounts[idx] !== null && blowCounts[idx] !== undefined;
              const isSkipped = idx < currentDrivenCount && blowCounts[idx] === null;
              const isActive = idx === currentDrivenCount;
              const isPending = idx > currentDrivenCount;
              const val = idx < currentDrivenCount ? blowCounts[idx] : undefined;
              const isSelected = selectedIndices.has(idx);

              return (
                <div
                  key={idx}
                  onClick={isSelectDeleteMode && idx < currentDrivenCount ? () => toggleSelectIndex(idx) : undefined}
                  className={`relative rounded-xl p-2 text-center transition border ${
                    isSelected
                      ? 'bg-rose-100 border-rose-500 shadow-xs ring-2 ring-rose-400'
                      : isActive
                      ? 'bg-amber-50 border-amber-400 shadow-xs ring-2 ring-amber-300'
                      : isSkipped
                      ? 'bg-slate-100/90 border-slate-300 text-slate-500'
                      : isRecorded
                      ? 'bg-white border-slate-200 hover:border-amber-400 shadow-xs'
                      : 'bg-slate-50/40 border-dashed border-slate-200 text-slate-400'
                  }`}
                >
                  {/* Top Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold flex items-center gap-0.5 text-slate-600">
                      <ArrowDown className="w-2.5 h-2.5 text-slate-400" />
                      {unit === 'FEET' ? `ft ${displayStep}` : `ม. ${displayStep}`}
                    </span>

                    {isRecorded && !isSelectDeleteMode && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteIndex(idx, e)}
                        title="ลบช่วงนี้"
                        className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Body Content */}
                  {isRecorded && typeof val === 'number' ? (
                    <>
                      <div className="flex items-center justify-center gap-1 my-0.5">
                        <button
                          type="button"
                          onClick={(e) => handleStepValue(idx, -1, e)}
                          title="ลด 1 blow"
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black flex items-center justify-center transition active:scale-95"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(idx)}
                          title="แตะเพื่อหมุนเลือกตัวเลข (Small Rolling)"
                          className="px-1.5 py-0.5 text-center font-black text-xs text-slate-800 hover:text-amber-700 hover:bg-amber-100/80 rounded transition font-mono flex items-center justify-center gap-0.5"
                        >
                          <span>{val}</span>
                          <span className="text-[9px] font-bold text-amber-800">{unit === 'FEET' ? 'blw/ft' : 'blw/m'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleStepValue(idx, 1, e)}
                          title="เพิ่ม 1 blow"
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition active:scale-95"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                        (เทียบเท่า {getConvertedText(val)})
                      </div>
                    </>
                  ) : isSkipped ? (
                    <div className="py-1">
                      <span className="text-[10px] font-bold text-slate-600 block">ข้าม (Skipped)</span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(idx)}
                        className="text-[9px] text-amber-700 hover:text-amber-800 underline font-bold mt-0.5 transition"
                      >
                        กรอกย้อนหลัง
                      </button>
                    </div>
                  ) : isActive ? (
                    <div className="py-1">
                      <span className="text-[10px] font-black text-amber-900 block">กำลังตอกช่วงนี้</span>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleAddInterval(wheelBlowValue)}
                          className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded text-[9px]"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={handleSkipInterval}
                          className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-bold rounded text-[9px]"
                        >
                          ข้าม
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-[10px] text-slate-300">
                      รอตอก
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Small Rolling Wheel Edit Modal */}
      {editTarget !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xs w-full p-5 space-y-4 animate-in zoom-in-95 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800">
                    แก้ไข Blow Count ({unit === 'FEET' ? 'ฟุตที่' : 'เมตรที่'} {editTarget.step})
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ความลึกสะสม: {getAltDepthText(editTarget.step)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Value Preview */}
            <div className="text-center py-2 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">ค่าที่เลือก</span>
              <div className="text-2xl font-black font-mono text-amber-700">
                {editTarget.value} <span className="text-xs font-normal">{blowUnitLabel}</span>
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-500">
                (เทียบเท่า {getConvertedText(editTarget.value)})
              </div>
            </div>

            {/* Small Rolling Wheel */}
            <div className="flex justify-center">
              <div className="w-36">
                <RollingWheel
                  items={wheelItems}
                  value={editTarget.value}
                  onChange={(val) => handleSetEditValue(Number(val))}
                  label={`หมุนเลือก ${blowUnitLabel}`}
                />
              </div>
            </div>

            {/* Micro Steppers ±1 / ±5 */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {[-5, -1, 1, 5].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => handleNudgeEditValue(delta)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs transition active:scale-95"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="flex items-center justify-between gap-1 text-xs pt-0.5">
              {[15, 20, 25, 30, 40, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSetEditValue(preset)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                    editTarget.value === preset
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Actions: Save / Skip / Cancel */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleConfirmEditModal}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกค่า {editTarget.value} Blows</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkSkippedInModal}
                  className="flex-1 bg-slate-100 hover:bg-amber-100 border border-slate-200 text-slate-700 hover:text-amber-900 font-bold py-1.5 rounded-xl text-[11px] transition"
                >
                  เปลี่ยนเป็นข้าม
                </button>
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-bold py-1.5 rounded-xl text-[11px] transition"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
