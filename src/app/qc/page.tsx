import { getActiveProject } from '@/lib/activeProject';
import Link from 'next/link';
import { Building2, FileSpreadsheet } from 'lucide-react';
import QCInspectionTable from '@/components/qc/QCInspectionTable';

export const dynamic = 'force-dynamic';

export default async function QCOverviewPage() {
  const project = await getActiveProject({
    piles: {
      include: {
        criteria: true,
        qcInspection: true,
      },
      orderBy: {
        pileNo: 'asc',
      },
    },
  });

  const piles = (project?.piles || []) as any[];

  const inspectedPiles = piles.filter((p) => p.qcInspection !== null);
  const normalCount = inspectedPiles.filter((p) => p.qcInspection?.deviationStatus === 'NORMAL' && p.qcInspection?.isPlumbnessPassed).length;
  const warningCount = inspectedPiles.filter((p) => p.qcInspection?.deviationStatus === 'WARNING').length;
  const criticalCount = inspectedPiles.filter((p) => p.qcInspection?.deviationStatus === 'CRITICAL' || p.qcInspection?.isPlumbnessPassed === false).length;

  return (
    <main className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>โครงการ: {project ? `${project.code} - ${project.name}` : 'กำลังโหลด...'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800">
            ระบบตรวจสอบและควบคุมคุณภาพ (QA/QC Inspection)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ติดตามการหนีศูนย์ (Eccentricity), ความเอียงดิ่ง (Plumbness), และสภาพหัวเสาเข็ม
          </p>
        </div>

        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg transition self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export รายงาน QC</span>
        </Link>
      </div>

      {/* QC KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">ตรวจแล้วทั้งหมด</span>
          <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
            {inspectedPiles.length} <span className="text-xs text-slate-400 font-normal">/ {piles.length} ต้น</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">🟢 ผ่านเกณฑ์ปกติ (&le;5cm)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {normalCount} <span className="text-xs text-emerald-500 font-normal">ต้น</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 block">🟡 เฝ้าระวัง (5-10cm)</span>
          <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
            {warningCount} <span className="text-xs text-amber-500 font-normal">ต้น</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 block">🔴 วิกฤต (&gt;10cm / ดิ่งตก)</span>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono">
            {criticalCount} <span className="text-xs text-rose-500 font-normal">ต้น</span>
          </div>
        </div>
      </div>

      {/* QC Interactive Table with Search & Filters */}
      <QCInspectionTable piles={piles} />
    </main>
  );
}
