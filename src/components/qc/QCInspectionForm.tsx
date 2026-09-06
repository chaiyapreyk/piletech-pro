'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  calculateDeviation,
  evaluatePlumbness,
  evaluateOverallQC,
  type DeviationStatus,
  type JointStatus,
  type HeadDamageStatus,
} from '@/lib/calculations/qaqc';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Camera,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface PileData {
  id: string;
  pileNo: string;
  gridLine: string;
  criteria?: {
    pileType: string;
  } | null;
  qcInspection?: {
    plumbnessXPercent: number | null;
    plumbnessYPercent: number | null;
    designCoordX: number | null;
    designCoordY: number | null;
    actualCoordX: number | null;
    actualCoordY: number | null;
    jointWeldStatus: string;
    headDamageStatus: string;
    inspectorName: string | null;
    approvedByCM: boolean;
  } | null;
}

export default function QCInspectionForm({ pile }: { pile: PileData }) {
  const router = useRouter();
  const toast = useToast();

  // Coordinates
  const [desX, setDesX] = useState<string>(
    pile.qcInspection?.designCoordX?.toString() || '10.000'
  );
  const [desY, setDesY] = useState<string>(
    pile.qcInspection?.designCoordY?.toString() || '10.000'
  );
  const [actX, setActX] = useState<string>(
    pile.qcInspection?.actualCoordX?.toString() || '10.025'
  );
  const [actY, setActY] = useState<string>(
    pile.qcInspection?.actualCoordY?.toString() || '10.035'
  );

  // Plumbness
  const [plumbX, setPlumbX] = useState<string>(
    pile.qcInspection?.plumbnessXPercent?.toString() || '0.5'
  );
  const [plumbY, setPlumbY] = useState<string>(
    pile.qcInspection?.plumbnessYPercent?.toString() || '0.6'
  );

  // Integrity checks
  const [jointStatus, setJointStatus] = useState<JointStatus>(
    (pile.qcInspection?.jointWeldStatus as JointStatus) || 'PASS'
  );
  const [headDamage, setHeadDamage] = useState<HeadDamageStatus>(
    (pile.qcInspection?.headDamageStatus as HeadDamageStatus) || 'NONE'
  );
  const [inspectorName, setInspectorName] = useState<string>(
    pile.qcInspection?.inspectorName || 'วิชัย วิศวกร QC'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live Deviation Calculation
  const deviationResult = useMemo(() => {
    const numDesX = parseFloat(desX);
    const numDesY = parseFloat(desY);
    const numActX = parseFloat(actX);
    const numActY = parseFloat(actY);

    if (isNaN(numDesX) || isNaN(numDesY) || isNaN(numActX) || isNaN(numActY)) {
      return null;
    }

    return calculateDeviation({
      designX: numDesX,
      designY: numDesY,
      actualX: numActX,
      actualY: numActY,
      isMeters: true,
    });
  }, [desX, desY, actX, actY]);

  // Live Plumbness Evaluation
  const plumbnessResult = useMemo(() => {
    const px = parseFloat(plumbX);
    const py = parseFloat(plumbY);
    if (isNaN(px) || isNaN(py)) return null;
    return evaluatePlumbness(px, py, 1.0);
  }, [plumbX, plumbY]);

  // Overall QC evaluation
  const overallQC = useMemo(() => {
    if (!deviationResult || !plumbnessResult) return null;
    return evaluateOverallQC({
      deviationStatus: deviationResult.status,
      isPlumbnessPassed: plumbnessResult.isPassed,
      jointWeldStatus: jointStatus,
      headDamageStatus: headDamage,
    });
  }, [deviationResult, plumbnessResult, jointStatus, headDamage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch(`/api/piles/${pile.id}/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plumbnessXPercent: parseFloat(plumbX) || 0,
          plumbnessYPercent: parseFloat(plumbY) || 0,
          designCoordX: parseFloat(desX) || 0,
          designCoordY: parseFloat(desY) || 0,
          actualCoordX: parseFloat(actX) || 0,
          actualCoordY: parseFloat(actY) || 0,
          jointWeldStatus: jointStatus,
          headDamageStatus: headDamage,
          inspectorName,
          approvedByCM: overallQC?.overallStatus === 'PASS',
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        toast.success(`บันทึกผลตรวจสอบ QC เสาเข็ม ${pile.pileNo} สำเร็จ`);
        setTimeout(() => router.push('/qc'), 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'บันทึกข้อมูล QC ไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error('Error saving QC inspection:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกผล QC');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/qc"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับหน้าสรุปผล QA/QC</span>
        </Link>
        <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-mono font-bold">
          ID: {pile.pileNo} ({pile.gridLine})
        </span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>QA/QC TOLERANCE & AS-BUILT CHECK</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800">
              ตรวจรับคุณภาพเสาเข็ม: {pile.pileNo} (Grid: {pile.gridLine})
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              ประเภท: <strong>{pile.criteria?.pileType || 'I-Section 0.26m'}</strong>
            </p>
          </div>

          {/* Overall Badge */}
          {overallQC && (
            <div
              className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-black ${
                overallQC.overallStatus === 'PASS'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : overallQC.overallStatus === 'WARNING'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {overallQC.overallStatus === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {overallQC.overallStatus === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {overallQC.overallStatus === 'CRITICAL' && <XCircle className="w-4 h-4 text-rose-600" />}
              <span>
                {overallQC.overallStatus === 'PASS' && 'QC APPROVED (ผ่านเกณฑ์)'}
                {overallQC.overallStatus === 'WARNING' && 'QC WARNING (เฝ้าระวัง)'}
                {overallQC.overallStatus === 'CRITICAL' && 'QC REJECTED (หลุดเกณฑ์)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: As-Built Coordinates & Deviation Triage */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">
            1. ตรวจสอบการหนีศูนย์ (Eccentricity / Position Deviation)
          </h2>
          <span className="text-xs text-slate-400">เกณฑ์ปกติ: &le; 5.0 ซม.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              พิกัดแบบ Design X (m)
            </label>
            <input
              type="number"
              step="0.001"
              value={desX}
              onChange={(e) => setDesX(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              พิกัดแบบ Design Y (m)
            </label>
            <input
              type="number"
              step="0.001"
              value={desY}
              onChange={(e) => setDesY(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              พิกัดจริง As-built X (m)
            </label>
            <input
              type="number"
              step="0.001"
              value={actX}
              onChange={(e) => setActX(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              พิกัดจริง As-built Y (m)
            </label>
            <input
              type="number"
              step="0.001"
              value={actY}
              onChange={(e) => setActY(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-2"
            />
          </div>
        </div>

        {/* Live Deviation Calculation Results Card */}
        {deviationResult && (
          <div
            className={`p-4 rounded-xl border mt-3 ${
              deviationResult.status === 'NORMAL'
                ? 'bg-emerald-50/70 border-emerald-200'
                : deviationResult.status === 'WARNING'
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-rose-50/70 border-rose-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 font-medium">
                  &Delta;X: <strong className="font-mono">{deviationResult.deltaXCm} cm</strong> | &Delta;Y:{' '}
                  <strong className="font-mono">{deviationResult.deltaYCm} cm</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-800">
                  ระยะหนีศูนย์สุทธิ (&Delta;):{' '}
                  <span className="text-base font-extrabold font-mono text-slate-900">
                    {deviationResult.netDeviationCm} cm
                  </span>
                </span>
              </div>

              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase ${
                  deviationResult.status === 'NORMAL'
                    ? 'bg-emerald-600 text-white'
                    : deviationResult.status === 'WARNING'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {deviationResult.status}
              </span>
            </div>

            <p className="text-xs mt-2 text-slate-700">
              <strong>คำแนะนำ:</strong> {deviationResult.actionRequired}
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Plumbness (Verticality) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">
            2. ตรวจสอบความเอียงดิ่ง (Verticality / Plumbness)
          </h2>
          <span className="text-xs text-slate-400">เกณฑ์ยอมรับ: &le; 1.0% (1:100)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ความเอียง แกน X (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={plumbX}
              onChange={(e) => setPlumbX(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ความเอียง แกน Y (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={plumbY}
              onChange={(e) => setPlumbY(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-2"
            />
          </div>
        </div>

        {plumbnessResult && (
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-600">
              อัตราส่วนความเอียงสูงสุด: <strong className="font-mono">{plumbnessResult.ratioText}</strong>
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                plumbnessResult.isPassed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {plumbnessResult.isPassed ? '🟢 ดิ่งผ่านเกณฑ์ (Passed)' : '🔴 เอียงเกินเกณฑ์ (Failed)'}
            </span>
          </div>
        )}
      </div>

      {/* Section 3: Joint Weld & Head Damage Visual Check */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
          3. ตรวจสอบสภาพรอยต่อและหัวเสาเข็ม (Joint & Head Condition)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Splice Joint Weld */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              สภาพการเชื่อมต่อเสาเข็ม (Splice Joint Weld)
            </label>
            <div className="space-y-2">
              {[
                { value: 'PASS', label: '🟢 รอยเชื่อมสมบูรณ์ เต็มรอบ ไร้ตามด (Pass)' },
                { value: 'FAIL', label: '🔴 รอยเชื่อมไม่สมบูรณ์ / มีสแลกฝังใน (Fail)' },
                { value: 'NOT_APPLICABLE', label: '⚪ ไม่มีการต่อเข็ม (เข็มท่อนเดียว N/A)' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs ${
                    jointStatus === opt.value
                      ? 'bg-amber-50 border-amber-300 font-bold text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="jointWeld"
                    value={opt.value}
                    checked={jointStatus === opt.value}
                    onChange={(e) => setJointStatus(e.target.value as JointStatus)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Concrete Head Damage */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              สภาพคอนกรีตหัวเสาเข็ม (Head Spalling / Crack)
            </label>
            <div className="space-y-2">
              {[
                { value: 'NONE', label: '🟢 หัวเข็มสมบูรณ์ ไม่มีรอยแตก (No Damage)' },
                { value: 'MINOR', label: '🟡 มีรอยร้าวลายงาเล็กน้อย ไม่กระทบโครงสร้าง (Minor)' },
                { value: 'SEVERE', label: '🔴 คอนกรีตแตกบิ่นรุนแรง / ปริแตกถึงเหล็ก (Severe)' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs ${
                    headDamage === opt.value
                      ? 'bg-amber-50 border-amber-300 font-bold text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="headDamage"
                    value={opt.value}
                    checked={headDamage === opt.value}
                    onChange={(e) => setHeadDamage(e.target.value as HeadDamageStatus)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Inspector Name */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ผู้ตรวจสอบ QC (Inspector Name)
          </label>
          <input
            type="text"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            className="w-full sm:w-1/2 text-xs font-medium bg-slate-50 border border-slate-300 rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/qc"
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          ยกเลิก
        </Link>
        <button
          type="submit"
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95"
        >
          {isSaving ? (
            <span>กำลังบันทึกผล QC...</span>
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>บันทึกสำเร็จ!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>บันทึกผลตรวจสอบ QC (Save QC)</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
