import { getActiveProject } from '@/lib/activeProject';
import ReportExporter from '@/components/reports/ReportExporter';
import type { PileReportRow } from '@/lib/reports/excelGenerator';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const project = await getActiveProject({
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

  const rows: PileReportRow[] = (project?.piles || []).map((p) => {
    let avgBlowsM: number | null = null;
    let avgBlowsFt: number | null = null;
    if (p.drivingRecord?.penetrationBlows) {
      try {
        const arr: (number | null)[] = JSON.parse(p.drivingRecord.penetrationBlows);
        const valid = arr.filter((x): x is number => typeof x === 'number' && x > 0);
        if (valid.length > 0) {
          avgBlowsM = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
          avgBlowsFt = Math.round(avgBlowsM / 3.28084);
        }
      } catch (e) {}
    }

    return {
      pileNo: p.pileNo,
      gridLine: p.gridLine,
      pileType: p.criteria?.pileType || 'I-0.26x0.26m',
      safeWorkingLoadT: p.criteria?.safeWorkingLoadT ?? 35,
      targetSet10BlowsCm: p.criteria?.targetSet10BlowsCm ?? 7.0,
      status: p.status,
      drivenLengthM: p.drivingRecord?.drivenLengthM,
      avgBlowsPerMeter: avgBlowsM,
      avgBlowsPerFoot: avgBlowsFt,
      measuredLast10Cm: p.drivingRecord?.measuredLast10Cm,
      isSetPassed: p.drivingRecord?.isSetPassed,
      deltaXCm: p.qcInspection?.deltaXCm,
      deltaYCm: p.qcInspection?.deltaYCm,
      netDeviationCm: p.qcInspection?.netDeviationCm,
      deviationStatus: p.qcInspection?.deviationStatus,
      jointStatus: p.qcInspection?.jointWeldStatus,
      headDamage: p.qcInspection?.headDamageStatus,
      inspectorName: p.drivingRecord?.inspectorName || p.qcInspection?.inspectorName,
    };
  });

  return (
    <main className="pb-12">
      <ReportExporter
        project={{
          name: project?.name || 'Grand Horizon Tower',
          code: project?.code || 'GHT-2026',
          contractorName: project?.contractorName,
          consultantName: project?.consultantName,
        }}
        rows={rows}
      />
    </main>
  );
}
