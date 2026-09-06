'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import BlowCountInput from './BlowCountInput';
import DepthSoilChart from './DepthSoilChart';
import DecimalRollingPicker from '@/components/ui/DecimalRollingPicker';
import {
  CheckCircle2,
  XCircle,
  Save,
  HardHat,
  Check,
  ArrowLeft,
  Disc3,
  Keyboard,
  Calculator,
  Sparkles,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface PileData {
  id: string;
  pileNo: string;
  gridLine: string;
  status: string;
  criteria?: {
    pileType: string;
    safeWorkingLoadT: number;
    targetSet10BlowsCm: number;
    dropHeightCm: number;
    hammerWeightT: number;
  } | null;
  drivingRecord?: {
    penetrationBlows: string;
    recordUnit?: string | null;
    recordScope?: string | null;
    windowLengthFt?: number | null;
    measuredLast10Cm: number;
    measuredTempCCm?: number | null;
    drivenLengthM: number;
    totalPileLengthM?: number | null;
    stickUpLengthM?: number | null;
    cutOffLevelM?: number | null;
    groundLevelM?: number | null;
    tipLevelM?: number | null;
    inspectorName?: string | null;
    notes?: string | null;
    isSetPassed: boolean;
  } | null;
}

export default function DrivingRecordForm({ pile }: { pile: PileData }) {
  const router = useRouter();
  const initialBlows: (number | null)[] = pile.drivingRecord?.penetrationBlows
    ? JSON.parse(pile.drivingRecord.penetrationBlows)
    : [];

  const [blowCounts, setBlowCounts] = useState<(number | null)[]>(initialBlows);
  const [recordUnit, setRecordUnit] = useState<'METER' | 'FEET'>(
    (pile.drivingRecord?.recordUnit as 'METER' | 'FEET') || 'FEET'
  );
  const [recordScope, setRecordScope] = useState<'FULL' | 'WINDOW'>(
    (pile.drivingRecord?.recordScope as 'FULL' | 'WINDOW') || 'WINDOW'
  );
  const [windowLength, setWindowLength] = useState<number>(
    pile.drivingRecord?.windowLengthFt || 20
  );

  const [measuredLast10, setMeasuredLast10] = useState<number>(
    pile.drivingRecord?.measuredLast10Cm ?? 5.0
  );
  const [measuredTempC, setMeasuredTempC] = useState<number>(
    pile.drivingRecord?.measuredTempCCm ?? 1.2
  );
  const [last10InputMode, setLast10InputMode] = useState<'WHEEL' | 'KEYBOARD'>('WHEEL');

  // Engineering Elevations & Pile Dimensions
  const [totalPileLength, setTotalPileLength] = useState<number>(
    pile.drivingRecord?.totalPileLengthM ?? 21.0
  );
  const [stickUpLength, setStickUpLength] = useState<number>(
    pile.drivingRecord?.stickUpLengthM ?? 0.50
  );
  const [groundLevel, setGroundLevel] = useState<number>(
    pile.drivingRecord?.groundLevelM ?? 3.00
  );
  const [cutOffLevel, setCutOffLevel] = useState<number>(
    pile.drivingRecord?.cutOffLevelM ?? 2.50
  );
  const [isTipLevelAuto, setIsTipLevelAuto] = useState<boolean>(true);
  const [manualTipLevel, setManualTipLevel] = useState<number>(
    pile.drivingRecord?.tipLevelM ?? -17.50
  );

  const [inspectorName, setInspectorName] = useState<string>(
    pile.drivingRecord?.inspectorName || 'สมชาย วิศวกรสนาม'
  );
  const [notes, setNotes] = useState<string>(pile.drivingRecord?.notes || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Derived Engineering Calculations
  const totalLengthNum = Number(totalPileLength) || 0;
  const stickUpNum = Number(stickUpLength) || 0;
  const groundLevelNum = Number(groundLevel) || 0;
  const cutOffLevelNum = Number(cutOffLevel) || 0;

  // Actual driven depth in soil
  const computedDrivenDepth = Number((totalLengthNum - stickUpNum).toFixed(2));
  // Computed Tip Level
  const computedTipLevel = Number((groundLevelNum - computedDrivenDepth).toFixed(2));
  // Actual top of pile level
  const computedTopLevel = Number((groundLevelNum + stickUpNum).toFixed(2));
  // Cut-off waste length
  const computedCutWaste = Number((computedTopLevel - cutOffLevelNum).toFixed(2));

  // Current active values (Auto vs Manual)
  const activeTipLevel = isTipLevelAuto ? computedTipLevel : Number(manualTipLevel) || 0;
  const activeDrivenDepth = isTipLevelAuto ? computedDrivenDepth : Number((groundLevelNum - activeTipLevel).toFixed(2));

  const targetSet = pile.criteria?.targetSet10BlowsCm ?? 7.0;
  const isPassed = measuredLast10 > 0 && measuredLast10 <= targetSet;
  const isEvaluated = measuredLast10 > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const cleanBlows = [...blowCounts];

      const res = await fetch(`/api/piles/${pile.id}/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penetrationBlows: cleanBlows,
          recordUnit,
          recordScope,
          windowLengthFt: recordScope === 'WINDOW' ? windowLength : null,
          measuredLast10Cm: measuredLast10,
          measuredTempCCm: measuredTempC,
          drivenLengthM: activeDrivenDepth,
          totalPileLengthM: totalLengthNum,
          stickUpLengthM: stickUpNum,
          cutOffLevelM: cutOffLevelNum,
          groundLevelM: groundLevelNum,
          tipLevelM: activeTipLevel,
          inspectorName,
          notes,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => router.push('/piles'), 1200);
      }
    } catch (err) {
      console.error('Error saving record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Bar with Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/piles"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับหน้ารายการเสาเข็ม</span>
        </Link>
        <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-mono font-bold">
          ID: {pile.pileNo} ({pile.gridLine})
        </span>
      </div>

      {/* Pile Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs mb-1">
              <HardHat className="w-4 h-4" />
              <span>FIELD PILE DRIVING LOG</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800">
              บันทึกการตอก: {pile.pileNo} (Grid: {pile.gridLine})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              หน้าตัด: <strong>{pile.criteria?.pileType || 'I-0.26x0.26m'}</strong> | Safe Load ออกแบบ: <strong>{pile.criteria?.safeWorkingLoadT} ตัน</strong>
            </p>
          </div>

          {/* Target Set Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-right">
            <span className="text-[11px] font-bold text-amber-800 uppercase block">
              Target Set ตามเกณฑ์ Hiley
            </span>
            <div className="text-2xl font-black text-amber-600 font-mono">
              &le; {targetSet.toFixed(2)} <span className="text-xs font-normal">cm / 10 blows</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Blow Counts & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Blow count meter logger with Rolling Wheel */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <BlowCountInput
            blowCounts={blowCounts}
            onChange={setBlowCounts}
            recordUnit={recordUnit}
            onUnitChange={setRecordUnit}
            recordScope={recordScope}
            onScopeChange={setRecordScope}
            windowLength={windowLength}
            onWindowLengthChange={setWindowLength}
          />
        </div>

        {/* Right: Real-time Depth Chart */}
        <div className="lg:col-span-5 space-y-4">
          <DepthSoilChart
            blowCounts={blowCounts}
            recordUnit={recordUnit}
            recordScope={recordScope}
            windowLength={windowLength}
          />
        </div>
      </div>

      {/* Final Verification Section with Rolling Picker */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">
            การวัดผล 10 ครั้งสุดท้าย (Last 10 Blows Verification)
          </h2>

          {/* Input Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setLast10InputMode('WHEEL')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                last10InputMode === 'WHEEL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>หมุนวงล้อ (Wheel)</span>
            </button>
            <button
              type="button"
              onClick={() => setLast10InputMode('KEYBOARD')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                last10InputMode === 'KEYBOARD'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>พิมพ์ตัวเลข</span>
            </button>
          </div>
        </div>

        {/* Last 10 Blows & C Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Last 10 Blows Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ระยะ Set 10 ครั้งสุดท้าย (Last 10 Blows Measurement)
            </label>

            {last10InputMode === 'WHEEL' ? (
              <DecimalRollingPicker
                value={measuredLast10}
                onChange={setMeasuredLast10}
                min={0}
                max={20}
                unit="cm"
                label="หมุนเลือกค่า Last 10 Blows"
              />
            ) : (
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  required
                  value={measuredLast10}
                  onChange={(e) => setMeasuredLast10(parseFloat(e.target.value) || 0)}
                  className="w-full text-lg font-bold font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-3 text-xs font-semibold text-slate-400">cm / 10 blows</span>
              </div>
            )}
          </div>

          {/* Temporary Compression C Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ค่าการยุบตัวชั่วคราว C จริงหน้างาน (Temporary Compression)
            </label>

            {last10InputMode === 'WHEEL' ? (
              <DecimalRollingPicker
                value={measuredTempC}
                onChange={setMeasuredTempC}
                min={0}
                max={5}
                unit="cm"
                label="หมุนเลือกค่า C หน้างาน"
              />
            ) : (
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={measuredTempC}
                  onChange={(e) => setMeasuredTempC(parseFloat(e.target.value) || 0)}
                  className="w-full text-lg font-bold font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-3 text-xs font-semibold text-slate-400">cm</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Validation Banner */}
        <div className="pt-2">
          {!isEvaluated ? (
            <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-500 text-center font-medium">
              หมุนเลือกค่า Last 10 Blows เพื่อตรวจสอบผลเทียบกับเกณฑ์ Hiley
            </div>
          ) : isPassed ? (
            <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-black">
                    🟢 PASS: ได้ Set ผ่านเกณฑ์มาตรฐาน (Target &le; {targetSet.toFixed(2)} cm)
                  </div>
                  <div className="text-xs text-emerald-700 mt-0.5 font-mono">
                    ค่าที่วัดได้: <strong>{measuredLast10.toFixed(1)} cm / 10 blows</strong> (ปลอดภัยตามสเปกวิศวกรรม)
                  </div>
                </div>
              </div>
              <span className="text-xs font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg uppercase">
                SET ACHIEVED
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl border bg-rose-50 border-rose-300 text-rose-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-black">
                    🔴 RE-DRIVE: ยังไม่ได้ Set ตามเกณฑ์ (Target &le; {targetSet.toFixed(2)} cm)
                  </div>
                  <div className="text-xs text-rose-700 mt-0.5 font-mono">
                    ค่าที่วัดได้: <strong>{measuredLast10.toFixed(1)} cm</strong> เกินเกณฑ์ยอมรับได้
                  </div>
                </div>
              </div>
              <span className="text-xs font-black bg-rose-600 text-white px-3 py-1.5 rounded-lg uppercase">
                RE-DRIVE REQUIRED
              </span>
            </div>
          )}
        </div>

        {/* Engineering Elevations & Depth Calculator */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>ระดับอ้างอิงทางวิศวกรรม & คำนวณระดับปลายเข็ม (Elevations & Depth Calculation)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                คำนวณระดับปลายเสาเข็ม (Tip Level) และความลึกเข็มจริงในดินอัตโนมัติจากความยาวเสาเข็มและระยะหัวเข็มพ้นดิน
              </p>
            </div>

            {/* Auto vs Manual Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setIsTipLevelAuto(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                  isTipLevelAuto
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>คำนวณอัตโนมัติ (Auto)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTipLevelAuto(false);
                  setManualTipLevel(computedTipLevel);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                  !isTipLevelAuto
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>ปรับแก้เอง (Manual)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Input Parameters: 7 cols */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              {/* 1. Total Pile Length */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ความยาวเสาเข็มรวม (L<sub>pile</sub>)</span>
                  <span className="text-[10px] text-slate-400 font-normal">ตามสเปก/ท่อน</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    value={totalPileLength}
                    onChange={(e) => setTotalPileLength(parseFloat(e.target.value) || 0)}
                    placeholder="21.00"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono">ม.</span>
                </div>
              </div>

              {/* 2. Stick-up Length */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ระยะหัวเข็มพ้นดิน (Stick-up)</span>
                  <span className="text-[10px] text-slate-400 font-normal">ตอกส่งใส่ค่าลบ</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={stickUpLength}
                    onChange={(e) => setStickUpLength(parseFloat(e.target.value) || 0)}
                    placeholder="+0.50"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono">ม.</span>
                </div>
              </div>

              {/* 3. Ground Level (GL) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ระดับดินเดิม (Ground Level: GL)</span>
                  <span className="text-[10px] text-slate-400 font-normal">รทก.</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={groundLevel}
                    onChange={(e) => setGroundLevel(parseFloat(e.target.value) || 0)}
                    placeholder="+3.00"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono">ม.</span>
                </div>
              </div>

              {/* 4. Cut-off Level (COL) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ระดับหัวเข็มตัด (Cut-off Level: COL)</span>
                  <span className="text-[10px] text-slate-400 font-normal">รทก.</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={cutOffLevel}
                    onChange={(e) => setCutOffLevel(parseFloat(e.target.value) || 0)}
                    placeholder="+2.50"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono">ม.</span>
                </div>
              </div>
            </div>

            {/* Calculated Results Card: 5 cols */}
            <div className="lg:col-span-5 bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                  <span>ผลลัพธ์คำนวณระดับปลายเข็ม</span>
                </span>
                {isTipLevelAuto ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>Auto Synced</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    Manual Override
                  </span>
                )}
              </div>

              {/* Primary Metric: Tip Level */}
              <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200 shadow-2xs">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-slate-600">ระดับปลายเสาเข็ม (Tip Level: TL):</span>
                  {isTipLevelAuto ? (
                    <span className="text-xl font-black font-mono text-amber-700">
                      {activeTipLevel > 0 ? `+${activeTipLevel.toFixed(2)}` : activeTipLevel.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-600">ม. รทก.</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        value={manualTipLevel}
                        onChange={(e) => setManualTipLevel(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right font-black font-mono text-base text-amber-700 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 focus:outline-none"
                      />
                      <span className="text-xs font-normal text-slate-600">ม.</span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  สูตร: GL ({groundLevelNum > 0 ? `+${groundLevelNum}` : groundLevelNum}) - ความลึกเข็มจริง ({activeDrivenDepth}ม.)
                </div>
              </div>

              {/* Secondary Metrics: Driven Depth & Cut Waste */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/80 rounded-lg p-2 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium block">ความลึกจริงในดิน:</span>
                  <strong className="text-sm font-black font-mono text-slate-800">
                    {activeDrivenDepth.toFixed(2)} ม.
                  </strong>
                  <span className="text-[9px] text-slate-400 font-mono block">
                    ({(activeDrivenDepth * 3.28084).toFixed(1)} ft)
                  </span>
                </div>

                <div className="bg-white/80 rounded-lg p-2 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium block">ระยะสกัดหัวเข็ม:</span>
                  <strong className={`text-sm font-black font-mono ${computedCutWaste >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {computedCutWaste >= 0 ? `${computedCutWaste.toFixed(2)} ม.` : `หัวเข็มจม (${computedCutWaste.toFixed(2)} ม.)`}
                  </strong>
                  <span className="text-[9px] text-slate-400 font-mono block">
                    (ระดับจริง {computedTopLevel > 0 ? `+${computedTopLevel}` : computedTopLevel} vs ตัด {cutOffLevelNum > 0 ? `+${cutOffLevelNum}` : cutOffLevelNum})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Warning Alert */}
          {stickUpNum >= totalLengthNum && (
            <div className="p-2.5 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                ข้อสังเกต: ระยะหัวเข็มพ้นดิน ({stickUpNum} ม.) มากกว่าหรือเท่ากับความยาวเสาเข็มรวม ({totalLengthNum} ม.) กรุณาตรวจสอบค่าที่ระบุ
              </span>
            </div>
          )}
        </div>

        {/* Inspector & Notes */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วิศวกรผู้ควบคุมการตอก (Inspector Name)
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หมายเหตุหน้างาน (Site Notes)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น มีดินดานหนาที่ความลึก 19ม., ตอกต่อเนื่องไม่สะดุด"
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/piles"
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          ยกเลิก
        </Link>
        <button
          type="submit"
          disabled={isSaving}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95"
        >
          {isSaving ? (
            <span>กำลังบันทึก...</span>
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-950" />
              <span>บันทึกสำเร็จ!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>บันทึกประวัติการตอก (Save Record)</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
