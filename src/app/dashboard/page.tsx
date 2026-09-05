import { prisma } from '@/lib/db';
import ProjectKpiCards from '@/components/dashboard/ProjectKpiCards';
import PileTableGrid from '@/components/dashboard/PileTableGrid';
import Link from 'next/link';
import { Calculator, ClipboardList, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const project = await prisma.project.findFirst({
    include: {
      settings: true,
      criteria: true,
      piles: {
        include: {
          criteria: true,
          drivingRecord: true,
          qcInspection: true,
        },
        orderBy: {
          pileNo: 'asc',
        },
      },
    },
  });

  const piles = project?.piles || [];

  // Compute KPIs
  const totalPiles = piles.length;
  const completedPiles = piles.filter((p) => p.status === 'COMPLETED').length;
  const issuePiles = piles.filter((p) => p.status === 'ISSUE').length;
  const plannedPiles = piles.filter((p) => p.status === 'PLANNED').length;

  const setPassedCount = piles.filter((p) => p.drivingRecord?.isSetPassed === true).length;
  const qcNormalCount = piles.filter((p) => p.qcInspection?.deviationStatus === 'NORMAL').length;
  const qcWarningCount = piles.filter((p) => p.qcInspection?.deviationStatus === 'WARNING').length;
  const qcCriticalCount = piles.filter((p) => p.qcInspection?.deviationStatus === 'CRITICAL').length;

  return (
    <main className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Construction Management Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {project?.name || 'Grand Horizon Tower'}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            ที่ปรึกษา (Consultant): <strong>{project?.consultantName}</strong> | ผู้รับเหมา: <strong>{project?.contractorName}</strong>
          </p>
        </div>

        {/* Quick Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/calculator"
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Calculator className="w-4 h-4" />
            <span>คำนวณ Hiley</span>
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ออกรายงาน (PDF/Excel)</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <ProjectKpiCards
        totalPiles={totalPiles}
        completedPiles={completedPiles}
        plannedPiles={plannedPiles}
        issuePiles={issuePiles}
        setPassedCount={setPassedCount}
        qcNormalCount={qcNormalCount}
        qcWarningCount={qcWarningCount}
        qcCriticalCount={qcCriticalCount}
      />

      {/* Pile Status Grid */}
      <PileTableGrid piles={piles} />
    </main>
  );
}
