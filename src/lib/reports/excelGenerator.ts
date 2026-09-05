import * as XLSX from 'xlsx';

export interface PileReportRow {
  pileNo: string;
  gridLine: string;
  pileType: string;
  safeWorkingLoadT: number;
  targetSet10BlowsCm: number;
  status: string;
  drivenLengthM?: number | null;
  avgBlowsPerMeter?: number | null;
  avgBlowsPerFoot?: number | null;
  measuredLast10Cm?: number | null;
  isSetPassed?: boolean | null;
  deltaXCm?: number | null;
  deltaYCm?: number | null;
  netDeviationCm?: number | null;
  deviationStatus?: string | null;
  jointStatus?: string | null;
  headDamage?: string | null;
  inspectorName?: string | null;
}

export function exportPilesToExcel(
  projectName: string,
  projectCode: string,
  rows: PileReportRow[]
) {
  // Build clean worksheet data
  const data = rows.map((r, index) => ({
    'No.': index + 1,
    'Pile ID': r.pileNo,
    'Grid Line': r.gridLine,
    'Pile Specification': r.pileType,
    'Safe Load Ra (tons)': r.safeWorkingLoadT,
    'Target Set (cm/10blw)': r.targetSet10BlowsCm,
    'Driven Depth (m)': r.drivenLengthM ?? '-',
    'Driven Depth (ft)': r.drivenLengthM ? Number((r.drivenLengthM * 3.28084).toFixed(1)) : '-',
    'Avg Rate (blw/m)': r.avgBlowsPerMeter ?? '-',
    'Avg Rate (blw/ft)': r.avgBlowsPerFoot ?? '-',
    'Measured Last 10 (cm)': r.measuredLast10Cm ?? '-',
    'Set Status': r.isSetPassed === true ? 'PASS' : r.isSetPassed === false ? 'FAIL' : 'PENDING',
    'Delta X (cm)': r.deltaXCm ?? '-',
    'Delta Y (cm)': r.deltaYCm ?? '-',
    'Net Deviation (cm)': r.netDeviationCm ?? '-',
    'Deviation Triage': r.deviationStatus ?? '-',
    'Joint Weld': r.jointStatus ?? '-',
    'Head Spalling': r.headDamage ?? '-',
    'Inspector': r.inspectorName ?? '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 10 }, // Pile ID
    { wch: 10 }, // Grid
    { wch: 25 }, // Spec
    { wch: 18 }, // Safe load
    { wch: 20 }, // Target set
    { wch: 15 }, // Depth
    { wch: 20 }, // Measured set
    { wch: 12 }, // Set status
    { wch: 12 }, // dx
    { wch: 12 }, // dy
    { wch: 18 }, // net dev
    { wch: 16 }, // triage
    { wch: 12 }, // joint
    { wch: 14 }, // head
    { wch: 20 }, // inspector
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pile As-Built Record');

  // Trigger download in browser
  const filename = `${projectCode}_Pile_Driving_QC_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
