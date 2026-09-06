import { getActiveProject } from '@/lib/activeProject';
import Link from 'next/link';
import { Calculator, Building2 } from 'lucide-react';
import PileNumberMatrix from '@/components/piles/PileNumberMatrix';

export const dynamic = 'force-dynamic';

export default async function PilesListPage() {
  const project = await getActiveProject({
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
  });

  const piles = project?.piles || [];

  return (
    <main className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>โครงการ: {project ? `${project.code} - ${project.name}` : 'กำลังโหลด...'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800">
            ผังสถานะและรายการเสาเข็มในโครงการ (Piles Register)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ระบุจำนวนเสาเข็มทั้งหมด, ตรวจสอบสถานะสีรายต้น, บันทึกการตอก, ตรวจสอบ Last 10 Blows และจัดการสเปก
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/calculator"
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-lg transition shadow-xs"
          >
            <Calculator className="w-4 h-4" />
            <span>คำนวณสูตร Hiley</span>
          </Link>
        </div>
      </div>

      {/* Unified Interactive Pile Matrix & Detailed Records */}
      <PileNumberMatrix
        key={project?.id || 'no-project'}
        initialPiles={piles}
        projectId={project?.id}
        projectCriteria={project?.criteria ? JSON.parse(JSON.stringify(project.criteria)) : []}
      />
    </main>
  );
}
