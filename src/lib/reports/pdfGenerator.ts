import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PileReportRow } from './excelGenerator';

export function exportDailyLogPDF(
  projectName: string,
  projectCode: string,
  contractor: string,
  consultant: string,
  rows: PileReportRow[]
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DAILY PILE DRIVING & QA/QC SUMMARY REPORT', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(251, 191, 36); // Amber 400
  doc.text(`PROJECT: ${projectName.toUpperCase()} (${projectCode})`, 14, 18);

  doc.setTextColor(203, 213, 225);
  doc.text(`DATE: ${today}`, pageWidth - 14, 18, { align: 'right' });

  // Sub-header Info Box
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.text(`Contractor: ${contractor || '-'}`, 14, 30);
  doc.text(`Consultant: ${consultant || '-'}`, 110, 30);
  doc.text(`Standard: Hiley Dynamic Formula (FS=2.5)`, 210, 30);

  // Table Data
  const tableData = rows.map((r, idx) => [
    idx + 1,
    r.pileNo,
    r.gridLine,
    r.pileType,
    `${r.safeWorkingLoadT} T`,
    `${r.targetSet10BlowsCm} cm`,
    r.drivenLengthM ? `${r.drivenLengthM}m (${(r.drivenLengthM * 3.281).toFixed(0)}ft)` : '-',
    r.recordUnit === 'METER'
      ? (r.avgBlowsPerMeter ? `${r.avgBlowsPerMeter} blw/m` : '-')
      : (r.avgBlowsPerFoot ? `${r.avgBlowsPerFoot} blw/ft` : '-'),
    r.measuredLast10Cm ? `${r.measuredLast10Cm} cm` : '-',
    r.isSetPassed === true ? 'PASS' : r.isSetPassed === false ? 'RE-DRIVE' : 'PENDING',
    r.netDeviationCm !== undefined && r.netDeviationCm !== null ? `${r.netDeviationCm} cm` : '-',
    r.deviationStatus || '-',
    r.inspectorName || '-',
  ]);

  autoTable(doc, {
    startY: 34,
    head: [[
      '#',
      'Pile No',
      'Grid',
      'Pile Type',
      'Ra (SWL)',
      'Target S10',
      'Depth',
      'Avg Rate',
      'Meas. S10',
      'Set Status',
      'Dev. Net',
      'QC Triage',
      'Inspector',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', halign: 'center', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      9: { halign: 'center', cellWidth: 18 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
    },
    didParseCell: (data) => {
      // Highlight Set Status
      if (data.column.index === 8) {
        if (data.cell.raw === 'PASS') {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald
        } else if (data.cell.raw === 'RE-DRIVE') {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
        }
      }
      // Highlight Deviation
      if (data.column.index === 10) {
        if (data.cell.raw === 'CRITICAL') {
          data.cell.styles.textColor = [225, 29, 72];
        } else if (data.cell.raw === 'WARNING') {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
  });

  // Signature Blocks
  // @ts-expect-error - lastAutoTable is injected by jspdf-autotable
  const finalY = (doc.lastAutoTable?.finalY || 140) + 12;
  const sigBoxWidth = 60;
  const sigPositions = [14, 82, 150, 218];

  const signatures = [
    { title: 'Site Engineer', label: 'Recorded By' },
    { title: 'QA/QC Inspector', label: 'Checked By' },
    { title: 'Construction Manager', label: 'Approved By' },
    { title: 'Consultant Engineer', label: 'Acknowledged By' },
  ];

  signatures.forEach((sig, i) => {
    const x = sigPositions[i];
    doc.setDrawColor(203, 213, 225);
    doc.line(x, finalY + 16, x + sigBoxWidth, finalY + 16);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(sig.title, x + sigBoxWidth / 2, finalY + 21, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`(${sig.label})`, x + sigBoxWidth / 2, finalY + 25, { align: 'center' });
    doc.text('Date: ..... / ..... / .........', x + sigBoxWidth / 2, finalY + 30, { align: 'center' });
  });

  doc.save(`${projectCode}_Daily_Pile_Driving_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
