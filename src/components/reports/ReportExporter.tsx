'use client';

import React, { useState } from 'react';
import { exportDailyLogPDF } from '@/lib/reports/pdfGenerator';
import { exportPilesToExcel, type PileReportRow } from '@/lib/reports/excelGenerator';
import { FileSpreadsheet, FileText, Download, Check, Sparkles, Building2 } from 'lucide-react';

interface ProjectInfo {
  name: string;
  code: string;
  contractorName?: string | null;
  consultantName?: string | null;
}

export default function ReportExporter({
  project,
  rows,
}: {
  project: ProjectInfo;
  rows: PileReportRow[];
}) {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      exportDailyLogPDF(
        project.name,
        project.code,
        project.contractorName || '',
        project.consultantName || '',
        rows
      );
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setTimeout(() => setIsExportingPDF(false), 1000);
    }
  };

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    try {
      exportPilesToExcel(project.name, project.code, rows);
    } catch (e) {
      console.error('Excel export error:', e);
    } finally {
      setTimeout(() => setIsExportingExcel(false), 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase mb-1">
          <Building2 className="w-4 h-4" />
          <span>OFFICIAL ENGINEERING DOCUMENTATION</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800">
          ศูนย์ออกเอกสารและรายงานวิศวกรรม (Reports & Export Engine)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          ออกรายงานมาตรฐานสำหรับเสนอผู้ว่าจ้าง (Owner) และที่ปรึกษาควบคุมงาน (Consultant) ได้ด้วยคลิกเดียว
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:border-amber-400 transition">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              1. Daily Pile Driving & QC Log (PDF)
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              เอกสาร PDF ทางการขนาด A4 แนวนอน พร้อมหัวโครงการ, สรุปผลตอกรายต้น, สถานะ Last 10 blows, การประเมินหนีศูนย์, และกล่องลงนามครบ 4 ฝ่าย (ผู้ควบคุมงาน, QC, CM, และ Consultant)
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                📄 A4 Landscape
              </span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                ✍️ 4-Tier Signatures
              </span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                🎯 Color-coded Badges
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {isExportingPDF ? (
              <span>กำลังสร้าง PDF...</span>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-400" />
                <span>ดาวน์โหลดรายงาน PDF สรุปประจำวัน</span>
              </>
            )}
          </button>
        </div>

        {/* Excel Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:border-emerald-400 transition">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              2. Complete As-built & Deviation Ledger (.xlsx)
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              ไฟล์ Excel (.xlsx) สรุปข้อมูลเสาเข็มทั้งโครงการ จัดคอลัมน์และกำหนดความกว้างเรียบร้อย พร้อมสำหรับส่งต่อให้วิศวกรโครงสร้าง (Structural Designer) ใช้คำนวณฐานรากต่อทันที
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                📊 Microsoft Excel (.xlsx)
              </span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                📐 พิกัด As-Built & Delta
              </span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                ⚡ 100% Free / Client-side
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {isExportingExcel ? (
              <span>กำลังสร้าง Excel...</span>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>ดาวน์โหลด Excel ตาราง As-built โครงการ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">
          ตัวอย่างชุดข้อมูลที่จะถูกส่งออก (Data Preview: {rows.length} รายการ)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-2">Pile No</th>
                <th className="p-2">Grid</th>
                <th className="p-2">สเปกเข็ม</th>
                <th className="p-2 text-center">Safe Load</th>
                <th className="p-2 text-center">Rate (ft/m)</th>
                <th className="p-2 text-center">Target S10</th>
                <th className="p-2 text-center">Measured S10</th>
                <th className="p-2 text-center">Set Status</th>
                <th className="p-2 text-center">Net Dev.</th>
                <th className="p-2 text-center">QC Triage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-2 font-bold text-slate-900">{r.pileNo}</td>
                  <td className="p-2 font-semibold text-slate-700">{r.gridLine}</td>
                  <td className="p-2 font-sans text-slate-600">{r.pileType}</td>
                  <td className="p-2 text-center">{r.safeWorkingLoadT} T</td>
                  <td className="p-2 text-center font-bold text-amber-700">
                    {r.avgBlowsPerFoot ? `${r.avgBlowsPerFoot} blw/ft (≈ ${r.avgBlowsPerMeter} blw/m)` : '-'}
                  </td>
                  <td className="p-2 text-center">{r.targetSet10BlowsCm} cm</td>
                  <td className="p-2 text-center font-bold">
                    {r.measuredLast10Cm ? `${r.measuredLast10Cm} cm` : '-'}
                  </td>
                  <td className="p-2 text-center font-bold">
                    <span
                      className={
                        r.isSetPassed === true
                          ? 'text-emerald-600'
                          : r.isSetPassed === false
                          ? 'text-rose-600'
                          : 'text-slate-400'
                      }
                    >
                      {r.isSetPassed === true
                        ? 'PASS'
                        : r.isSetPassed === false
                        ? 'RE-DRIVE'
                        : 'PENDING'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    {r.netDeviationCm !== undefined && r.netDeviationCm !== null
                      ? `${r.netDeviationCm} cm`
                      : '-'}
                  </td>
                  <td className="p-2 text-center font-bold">
                    <span
                      className={
                        r.deviationStatus === 'NORMAL'
                          ? 'text-emerald-600'
                          : r.deviationStatus === 'WARNING'
                          ? 'text-amber-600'
                          : r.deviationStatus === 'CRITICAL'
                          ? 'text-rose-600'
                          : 'text-slate-400'
                      }
                    >
                      {r.deviationStatus || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
