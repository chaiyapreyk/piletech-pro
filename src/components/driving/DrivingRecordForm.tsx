'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import BlowCountInput from './BlowCountInput';
import DepthSoilChart from './DepthSoilChart';
import DecimalRollingPicker from '@/components/ui/DecimalRollingPicker';
import { CheckCircle2, XCircle, Save, HardHat, Check, ArrowLeft, Disc3, Keyboard } from 'lucide-react';
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
    measuredLast10Cm: number;
    measuredTempCCm?: number | null;
    drivenLengthM: number;
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
  const initialBlows = pile.drivingRecord?.penetrationBlows
    ? JSON.parse(pile.drivingRecord.penetrationBlows)
    : [];

  const [blowCounts, setBlowCounts] = useState<number[]>(initialBlows);
  const [measuredLast10, setMeasuredLast10] = useState<number>(
    pile.drivingRecord?.measuredLast10Cm ?? 5.0
  );
  const [measuredTempC, setMeasuredTempC] = useState<number>(
    pile.drivingRecord?.measuredTempCCm ?? 1.2
  );
  const [last10InputMode, setLast10InputMode] = useState<'WHEEL' | 'KEYBOARD'>('WHEEL');

  const [cutOffLevel, setCutOffLevel] = useState<string>(
    pile.drivingRecord?.cutOffLevelM?.toString() || '+2.50'
  );
  const [groundLevel, setGroundLevel] = useState<string>(
    pile.drivingRecord?.groundLevelM?.toString() || '+3.00'
  );
  const [tipLevel, setTipLevel] = useState<string>(
    pile.drivingRecord?.tipLevelM?.toString() || '-18.00'
  );
  const [inspectorName, setInspectorName] = useState<string>(
    pile.drivingRecord?.inspectorName || 'สมชาย วิศวกรสนาม'
  );
  const [notes, setNotes] = useState<string>(pile.drivingRecord?.notes || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const targetSet = pile.criteria?.targetSet10BlowsCm ?? 7.0;
  const isPassed = measuredLast10 > 0 && measuredLast10 <= targetSet;
  const isEvaluated = measuredLast10 > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const drivenLength = blowCounts.length > 0 ? blowCounts.length : 0;
      const res = await fetch(`/api/piles/${pile.id}/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penetrationBlows: blowCounts,
          measuredLast10Cm: measuredLast10,
          measuredTempCCm: measuredTempC,
          drivenLengthM: drivenLength,
          cutOffLevelM: parseFloat(cutOffLevel) || null,
          groundLevelM: parseFloat(groundLevel) || null,
          tipLevelM: parseFloat(tipLevel) || null,
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
          <BlowCountInput blowCounts={blowCounts} onChange={setBlowCounts} />
        </div>

        {/* Right: Real-time Depth Chart */}
        <div className="lg:col-span-5 space-y-4">
          <DepthSoilChart blowCounts={blowCounts} />
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

        {/* Elevations */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 mb-3">ระดับอ้างอิงทางวิศวกรรม (Elevations)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ระดับหัวเข็มตัด (Cut-off Level)
              </label>
              <input
                type="text"
                value={cutOffLevel}
                onChange={(e) => setCutOffLevel(e.target.value)}
                placeholder="+2.50 ม."
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ระดับดินเดิม (Ground Level)
              </label>
              <input
                type="text"
                value={groundLevel}
                onChange={(e) => setGroundLevel(e.target.value)}
                placeholder="+3.00 ม."
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ระดับปลายเข็ม (Tip Level)
              </label>
              <input
                type="text"
                value={tipLevel}
                onChange={(e) => setTipLevel(e.target.value)}
                placeholder="-18.00 ม."
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5"
              />
            </div>
          </div>
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
