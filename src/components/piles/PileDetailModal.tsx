'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X,
  HardHat,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileDown,
  Edit3,
  Layers,
  Sparkles,
  ArrowUpRight,
  Info,
  Building,
  Ruler,
  Calendar,
  Loader2,
} from 'lucide-react';
import type { PileData } from './matrix/matrixTypes';
import PileLoadProfileChart from '../driving/PileLoadProfileChart';
import { calculateDrivingLoadProfile, formatElevation } from '@/lib/calculations/drivingLoadProfile';
import { exportIndividualPilePDF } from '@/lib/reports/pdfGenerator';
import { useToast } from '@/components/ui/ToastProvider';

interface PileDetailModalProps {
  pile: PileData | null;
  projectName?: string;
  projectCode?: string;
  contractorName?: string;
  consultantName?: string;
  onClose: () => void;
  onOpenEdit?: (pile: PileData) => void;
}

export default function PileDetailModal({
  pile,
  projectName = 'The Grand Horizon Tower',
  projectCode = 'GHT-2026',
  contractorName = 'บริษัท เสาเข็มไทยแลนด์ จำกัด',
  consultantName = 'Piling Tech Advisory Ltd.',
  onClose,
  onOpenEdit,
}: PileDetailModalProps) {
  const toast = useToast();
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!pile) return null;

  const driving = pile.drivingRecord;
  const criteria = pile.criteria;
  const qc = pile.qcInspection;
  const isDriven = driving !== null && driving !== undefined;
  const isSetPassed = driving?.isSetPassed;

  // Precompute normalized load profile
  const profileData = calculateDrivingLoadProfile(driving, criteria);

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await exportIndividualPilePDF({
        project: {
          name: projectName,
          code: projectCode,
          contractorName,
          consultantName,
        },
        pile,
        profileData,
      });
      toast.success(`ออกรายงาน PDF เสาเข็มต้น ${pile.pileNo} สำเร็จ`);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      toast.error('ไม่สามารถส่งออก PDF ได้: ' + (err?.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
              #
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black font-mono tracking-tight text-white">
                  {pile.pileNo}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  (Grid: {pile.gridLine} • {pile.building || 'Building A'})
                </span>
                {/* Status Badges */}
                {!isDriven ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px]">
                    <Clock className="w-3 h-3" /> รอการตอก (Pending)
                  </span>
                ) : isSetPassed ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> ตอกเสร็จ Set ผ่านเกณฑ์
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[11px]">
                    <AlertCircle className="w-3 h-3" /> Set ไม่ผ่าน (Re-drive)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                โครงการ: <strong className="text-slate-200">{projectName}</strong> ({projectCode})
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="พิมพ์หน้านี้ (Print)"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer hidden sm:inline-flex"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              title="ดาวน์โหลดรายงาน PDF (Individual Pile PDF)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition border border-slate-700 cursor-pointer disabled:opacity-50"
            >
              {isExportingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Safe Load */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Safe Working Load (Ra)
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5">
                {criteria?.safeWorkingLoadT ? `${criteria.safeWorkingLoadT} ตัน` : '-'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {criteria?.safetyFactor ? `FS = ${criteria.safetyFactor}` : 'ยังไม่ระบุ FS'}
              </span>
            </div>

            {/* Driven Length */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                ความลึกที่ตอก (Driven Length)
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5">
                {driving?.drivenLengthM ? `${driving.drivenLengthM} ม.` : '-'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {driving?.drivenLengthM ? `${(driving.drivenLengthM * 3.28084).toFixed(1)} ft` : '-'}
              </span>
            </div>

            {/* Last 10 Blows Set */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Last 10 Blows Set (S₁₀)
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5 flex items-center gap-1.5">
                <span>{driving?.measuredLast10Cm ? `${driving.measuredLast10Cm} cm` : '-'}</span>
                {driving?.measuredLast10Cm && criteria?.targetSet10BlowsCm && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      driving.measuredLast10Cm <= criteria.targetSet10BlowsCm
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {driving.measuredLast10Cm <= criteria.targetSet10BlowsCm ? 'ผ่าน' : 'เกินเกณฑ์'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                เกณฑ์คำนวณ: ≤ {criteria?.targetSet10BlowsCm ?? '-'} cm
              </span>
            </div>

            {/* QC As-Built Deviation */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                QC หนีศูนย์ (Net Deviation)
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5">
                {qc?.netDeviationCm !== undefined && qc?.netDeviationCm !== null
                  ? `${qc.netDeviationCm} cm`
                  : 'ยังไม่ตรวจ'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {qc ? `สถานะ: ${qc.deviationStatus}` : 'รอการทำ As-built'}
              </span>
            </div>
          </div>

          {/* Elevation Benchmarks Bar */}
          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-2">
              หมุดระดับทางวิศวกรรม (Elevation Benchmarks)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Ground Level (GL)</span>
                <span className="font-bold text-white text-sm">
                  {formatElevation(profileData.elevations.groundLevelM)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Cut-Off Level (COL)</span>
                <span className="font-bold text-blue-300 text-sm">
                  {formatElevation(profileData.elevations.cutOffLevelM)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block">
                  {profileData.elevations.isTipDerived ? 'Tip Level (Calculated)' : 'Tip Level (Stored)'}
                </span>
                <span className="font-bold text-rose-300 text-sm">
                  {formatElevation(profileData.elevations.effectiveTipLevelM)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Stick-Up / Cut Length</span>
                <span className="font-bold text-amber-300 text-sm">
                  {driving?.stickUpLengthM !== undefined && driving?.stickUpLengthM !== null
                    ? `${driving.stickUpLengthM} m`
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Synchronized Driving Load Profile Chart */}
          <PileLoadProfileChart
            profileData={profileData}
            onEditCriteria={onOpenEdit ? () => onOpenEdit(pile) : undefined}
          />

          {/* Detailed Calculation & Quality Review */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Driving Parameters Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>พารามิเตอร์ตอกและเกณฑ์คำนวณ Hiley</span>
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">ประเภทเสาเข็ม / หน้าตัด:</span>
                  <span className="font-bold text-slate-800">{criteria?.name || criteria?.pileType || '-'}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">น้ำหนักลูกตุ้ม (W) / ระยะตก (H):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {criteria?.hammerWeightT ? `${criteria.hammerWeightT} ตัน` : '-'} / {criteria?.dropHeightCm ? `${criteria.dropHeightCm} cm` : '-'}
                  </span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">สัมประสิทธิ์การคืนรูป (e):</span>
                  <span className="font-mono font-bold text-slate-800">{criteria?.cushionCoeffE ?? 0.25}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Temporary Compression (C):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {driving?.measuredTempCCm ? `${driving.measuredTempCCm} cm (C หน้างาน)` : `${criteria?.tempCompressionC ?? '-'} cm (เกณฑ์)`}
                  </span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">ผู้ควบคุม / ผู้ตรวจสอบ:</span>
                  <span className="font-bold text-slate-800">{driving?.inspectorName || '-'}</span>
                </div>
              </div>
            </div>

            {/* QA/QC As-Built Inspection */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>ผลการตรวจสอบคุณภาพ (QA/QC As-Built)</span>
              </h4>
              {qc ? (
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-1.5 flex justify-between">
                    <span className="text-slate-500">สถานะความเยื้องศูนย์:</span>
                    <span
                      className={`font-black px-2 py-0.5 rounded text-[10px] ${
                        qc.deviationStatus === 'NORMAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : qc.deviationStatus === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {qc.deviationStatus} ({qc.netDeviationCm} cm)
                    </span>
                  </div>
                  <div className="py-1.5 flex justify-between font-mono">
                    <span className="text-slate-500">ระยะเยื้องแกน X / Y:</span>
                    <span className="font-bold text-slate-800">
                      ΔX: {qc.deltaXCm ?? '-'} cm, ΔY: {qc.deltaYCm ?? '-'} cm
                    </span>
                  </div>
                  <div className="py-1.5 flex justify-between font-mono">
                    <span className="text-slate-500">ความดิ่ง Plumbness:</span>
                    <span className="font-bold text-slate-800">
                      {qc.isPlumbnessPassed ? 'ผ่านเกณฑ์ (< 1%)' : 'ไม่ผ่านเกณฑ์'}
                    </span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-slate-500">สภาพหัวเสาเข็ม / รอยเชื่อม:</span>
                    <span className="font-bold text-slate-800">
                      หัวเข็ม: {qc.headDamageStatus || 'ปกติ'}, รอยเชื่อม: {qc.jointWeldStatus || 'ปกติ'}
                    </span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-slate-500">ผู้ตรวจสอบ QC:</span>
                    <span className="font-bold text-slate-800">{qc.inspectorName || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-slate-400 text-center text-xs">
                  ยังไม่ได้บันทึกผลตรวจสอบ QC หรือเซอร์เวย์พิกัดจริง
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/piles/${pile.id}/drive`}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <HardHat className="w-4 h-4" />
              <span>{isDriven ? 'แก้ไขผลการตอก' : 'บันทึกการตอก'}</span>
            </Link>

            <Link
              href={`/piles/${pile.id}/qc`}
              className="inline-flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ตรวจ QC</span>
            </Link>

            {onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(pile);
                }}
                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2 rounded-xl text-xs font-bold transition border border-indigo-200 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>แก้ไขข้อมูลเสาเข็ม</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>พิมพ์รายงาน PDF รายต้น</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
