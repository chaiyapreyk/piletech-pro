import { getActiveProject } from '@/lib/activeProject';
import ReportExporter from '@/components/reports/ReportExporter';
import type { PileReportRow } from '@/lib/reports/excelGenerator';
import { calculateAverageBlows } from '@/lib/calculations/drivingLog';

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
    const { avgBlowsFt, avgBlowsM, primaryUnit } = calculateAverageBlows(
      p.drivingRecord?.penetrationBlows,
      p.drivingRecord?.recordUnit
    );

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
      recordUnit: primaryUnit,
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
