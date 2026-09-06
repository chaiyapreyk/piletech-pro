import { getActiveProject } from '@/lib/activeProject';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Edit3, Building2 } from 'lucide-react';

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

  const piles = project?.piles || [];

  const inspectedPiles = piles.filter((p) => p.qcInspection !== null);
  const normalCount = inspectedPiles.filter((p) => p.qcInspection?.deviationStatus === 'NORMAL').length;
  const warningCount = inspectedPiles.filter((p) => p.qcInspection?.deviationStatus === 'WARNING').length;
  const criticalCount = inspectedPiles.filter((p) => p.qcInspection?.deviationStatus === 'CRITICAL').length;
  const plumbFailCount = inspectedPiles.filter((p) => p.qcInspection?.isPlumbnessPassed === false).length;

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
          className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg transition self-start sm:self-auto"
        >
          Export รายงาน QC
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
          <span className="text-[11px] font-semibold text-emerald-700 block">ผ่านเกณฑ์ปกติ (&le;5cm)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {normalCount} <span className="text-xs text-emerald-500 font-normal">ต้น</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 block">เฝ้าระวัง (5-10cm)</span>
          <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
            {warningCount} <span className="text-xs text-amber-500 font-normal">ต้น</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 block">วิกฤต (&gt;10cm / ดิ่งตก)</span>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono">
            {criticalCount + plumbFailCount} <span className="text-xs text-rose-500 font-normal">ต้น</span>
          </div>
        </div>
      </div>

      {/* QC Piles Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">รายการตรวจสอบ As-Built รายต้น</h2>
          <span className="text-xs text-slate-400">คลิก "ตรวจ/แก้ไข" เพื่อบันทึกข้อมูลหน้างาน</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3.5 font-bold">รหัสเสาเข็ม</th>
                <th className="p-3.5 font-bold">Grid Line</th>
                <th className="p-3.5 font-bold text-center">ความเอียงดิ่ง (%)</th>
                <th className="p-3.5 font-bold text-center">&Delta;X / &Delta;Y (cm)</th>
                <th className="p-3.5 font-bold text-center">ระยะหนีศูนย์สุทธิ (&Delta;)</th>
                <th className="p-3.5 font-bold text-center">สถานะหนีศูนย์</th>
                <th className="p-3.5 font-bold text-center">สภาพรอยต่อ</th>
                <th className="p-3.5 font-bold text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {piles.map((pile) => {
                const qc = pile.qcInspection;
                const hasQC = qc !== null;

                return (
                  <tr key={pile.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold font-mono text-slate-900">
                      {pile.pileNo}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">
                      {pile.gridLine}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {hasQC && qc?.plumbnessXPercent !== null ? (
                        <span
                          className={`font-semibold ${
                            qc.isPlumbnessPassed ? 'text-slate-800' : 'text-rose-600 font-bold'
                          }`}
                        >
                          X:{qc.plumbnessXPercent}% Y:{qc.plumbnessYPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-600">
                      {hasQC && qc.deltaXCm !== null ? (
                        <span>
                          {qc.deltaXCm} / {qc.deltaYCm}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {hasQC && qc.netDeviationCm !== null ? (
                        <strong className="text-slate-900 text-xs">
                          {qc.netDeviationCm} cm
                        </strong>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {hasQC ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            qc.deviationStatus === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : qc.deviationStatus === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {qc.deviationStatus}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">รอตรวจ</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {hasQC ? (
                        <span className="text-[11px] font-medium text-slate-600">
                          {qc.jointWeldStatus === 'PASS'
                            ? '🟢 สมบูรณ์'
                            : qc.jointWeldStatus === 'FAIL'
                            ? '🔴 ไม่ผ่าน'
                            : '⚪ N/A'}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/piles/${pile.id}/qc`}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-3 py-1.5 rounded-md text-[11px] font-bold transition"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{hasQC ? 'แก้ไข QC' : 'ตรวจ As-built'}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
