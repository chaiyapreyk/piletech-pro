import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PileReportRow } from './excelGenerator';
import {
  calculateDrivingLoadProfile,
  type DrivingLoadProfileResult,
} from '@/lib/calculations/drivingLoadProfile';
import type { PileData } from '@/components/piles/matrix/matrixTypes';

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

export interface IndividualPilePDFOptions {
  project: {
    name: string;
    code: string;
    contractorName?: string | null;
    consultantName?: string | null;
    location?: string | null;
  };
  pile: PileData;
  profileData?: DrivingLoadProfileResult;
}

/**
 * Builds the jsPDF document instance for an individual pile report.
 * Separated for testability and deterministic output.
 */
export function generateIndividualPilePDFDocument({
  project,
  pile,
  profileData,
}: IndividualPilePDFOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const profile = profileData || calculateDrivingLoadProfile(pile.drivingRecord, pile.criteria);
  const { elevations, fsLines, points, validation, recordUnit, maxBlows, maxLoadT } = profile;
  const driving = pile.drivingRecord;
  const criteria = pile.criteria;

  const nowIso = new Date().toISOString();
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('INDIVIDUAL PILE DRIVING & LOAD PROFILE REPORT', margin, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(251, 191, 36); // Amber 400
  doc.text(`PROJECT: ${project.name.toUpperCase()} (${project.code})`, margin, 16);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(7.5);
  doc.text(`GENERATED: ${todayFormatted}`, pageWidth - margin, 16, { align: 'right' });

  // 2. Project Metadata Sub-header
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(7.5);
  let curY = 27;
  doc.text(`Contractor: ${project.contractorName || '-'}`, margin, curY);
  doc.text(`Consultant: ${project.consultantName || '-'}`, margin + 65, curY);
  doc.text(`Location: ${project.location || '-'}`, margin + 130, curY);

  curY += 4;

  // 3. Pile Summary & Elevations Table
  const isDriven = driving !== null && driving !== undefined;
  const isSetPassed = driving?.isSetPassed;
  const setStatusText = !isDriven ? 'PENDING' : isSetPassed ? 'PASS' : 'RE-DRIVE';

  const tipText = elevations.effectiveTipLevelM !== null
    ? `${elevations.effectiveTipLevelM.toFixed(2)} m (${elevations.isTipDerived ? 'Calc' : 'Stored'})`
    : '-';

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [[
      'Pile No',
      'Grid Line',
      'Building / Zone',
      'Driven Length',
      'Ground (GL)',
      'Cut-Off (COL)',
      'Tip Level',
      'Meas. S10',
      'Set Status',
    ]],
    body: [[
      pile.pileNo,
      pile.gridLine,
      pile.building || 'Building A',
      driving?.drivenLengthM ? `${driving.drivenLengthM} m` : '-',
      elevations.groundLevelM !== null ? `${elevations.groundLevelM.toFixed(2)} m` : '-',
      elevations.cutOffLevelM !== null ? `${elevations.cutOffLevelM.toFixed(2)} m` : '-',
      tipText,
      driving?.measuredLast10Cm ? `${driving.measuredLast10Cm} cm` : '-',
      setStatusText,
    ]],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 24 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
    },
    didParseCell: (data) => {
      if (data.column.index === 8) {
        if (data.cell.raw === 'PASS') data.cell.styles.textColor = [16, 185, 129];
        else if (data.cell.raw === 'RE-DRIVE') data.cell.styles.textColor = [225, 29, 72];
      }
    },
  });

  // @ts-expect-error - lastAutoTable injected by autotable
  curY = doc.lastAutoTable.finalY + 3;

  // 4. Driving Criteria & Hiley Parameters Table
  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [[
      'Assigned Criteria / Section',
      'Safe Load (Ra)',
      'Safety Factor',
      'Target S10',
      'Hammer (W)',
      'Drop (H)',
      'Cushion (e)',
      'Temp C (cm)',
    ]],
    body: [[
      criteria?.name || criteria?.pileType || 'Not Assigned',
      criteria?.safeWorkingLoadT ? `${criteria.safeWorkingLoadT} tons` : '-',
      criteria?.safetyFactor ? `${criteria.safetyFactor}` : '2.5',
      criteria?.targetSet10BlowsCm ? `${criteria.targetSet10BlowsCm} cm` : '-',
      criteria?.hammerWeightT ? `${criteria.hammerWeightT} tons` : '-',
      criteria?.dropHeightCm ? `${criteria.dropHeightCm} cm` : '-',
      criteria?.cushionCoeffE ? `${criteria.cushionCoeffE}` : '0.25',
      driving?.measuredTempCCm ? `${driving.measuredTempCCm} (Meas)` : `${criteria?.tempCompressionC ?? '-'} (Crit)`,
    ]],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, font: 'helvetica' },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 44 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 24 },
    },
  });

  // @ts-expect-error - lastAutoTable injected
  curY = doc.lastAutoTable.finalY + 4;

  // 5. Dual Vector Charts Plotted Directly in jsPDF
  const chartHeight = 70;
  const chartGap = 6;
  const singleChartWidth = (contentWidth - chartGap) / 2;
  const chart1X = margin;
  const chart2X = margin + singleChartWidth + chartGap;

  const totalIntervals = points.length;
  const hasElevation = elevations.groundLevelM !== null && profile.minElevationM !== null && profile.maxElevationM !== null;
  const elevSpan = hasElevation ? Math.max(1.0, profile.maxElevationM! - profile.minElevationM!) : 1.0;
  const domainMinElev = hasElevation ? profile.minElevationM! : 0;
  const domainMaxElev = hasElevation ? profile.maxElevationM! : 1;

  const plotInnerMarginLeft = 14;
  const plotInnerMarginRight = 6;
  const plotInnerMarginTop = 8;
  const plotInnerMarginBottom = 12;
  const plotInnerW = singleChartWidth - plotInnerMarginLeft - plotInnerMarginRight;
  const plotInnerH = chartHeight - plotInnerMarginTop - plotInnerMarginBottom;

  const getYFromIndexPDF = (idx: number) => {
    if (hasElevation) {
      const pt = points[idx];
      if (pt && pt.elevationM !== null) {
        const norm = (domainMaxElev - pt.elevationM) / elevSpan;
        return curY + plotInnerMarginTop + Math.max(0, Math.min(plotInnerH, norm * plotInnerH));
      }
    }
    if (totalIntervals <= 1) return curY + plotInnerMarginTop + plotInnerH / 2;
    return curY + plotInnerMarginTop + (idx / (totalIntervals - 1)) * plotInnerH;
  };

  // --- Draw Chart 1: Blow Count Profile ---
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.rect(chart1X, curY, singleChartWidth, chartHeight, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`1. Blow Count Profile (${recordUnit === 'FEET' ? 'blw/ft' : 'blw/m'})`, chart1X + 3, curY + 5);

  const blowScaleMax = Math.ceil(Math.max(maxBlows, 30) / 10) * 10;
  const getBlowXPDF = (blows: number) => {
    const clamped = Math.min(Math.max(0, blows), blowScaleMax);
    return chart1X + plotInnerMarginLeft + (clamped / blowScaleMax) * plotInnerW;
  };

  // Grid lines & X-ticks Chart 1
  [0.25, 0.5, 0.75, 1.0].forEach((frac) => {
    const val = Math.round(blowScaleMax * frac);
    const x = chart1X + plotInnerMarginLeft + frac * plotInnerW;
    doc.setDrawColor(226, 232, 240);
    doc.line(x, curY + plotInnerMarginTop, x, curY + plotInnerMarginTop + plotInnerH);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${val}`, x, curY + plotInnerMarginTop + plotInnerH + 4, { align: 'center' });
  });

  // Polyline for Blows
  const validBlowPoints = points
    .map((p, idx) => (p.recordedBlows !== null ? { x: getBlowXPDF(p.recordedBlows), y: getYFromIndexPDF(idx) } : null))
    .filter((n): n is { x: number; y: number } => n !== null);

  if (validBlowPoints.length > 1) {
    doc.setDrawColor(245, 158, 11); // Amber 500
    doc.setLineWidth(0.4);
    for (let i = 0; i < validBlowPoints.length - 1; i++) {
      doc.line(validBlowPoints[i].x, validBlowPoints[i].y, validBlowPoints[i + 1].x, validBlowPoints[i + 1].y);
    }
  }

  // Draw node points
  validBlowPoints.forEach((pt) => {
    doc.setFillColor(217, 119, 6);
    doc.circle(pt.x, pt.y, 0.6, 'F');
  });

  // Y-axis label Chart 1
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(hasElevation ? 'Elev (m)' : `Depth (${recordUnit === 'FEET' ? 'ft' : 'm'})`, chart1X + 2, curY + plotInnerMarginTop + 2);

  // --- Draw Chart 2: Estimated Ultimate Load Profile ($R_u$) ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(chart2X, curY, singleChartWidth, chartHeight, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. Estimated Ultimate Load Profile (Ru, tons)', chart2X + 3, curY + 5);

  const loadScaleMax = Math.ceil(Math.max(maxLoadT, 60) / 20) * 20;
  const getLoadXPDF = (loadT: number) => {
    const clamped = Math.min(Math.max(0, loadT), loadScaleMax);
    return chart2X + plotInnerMarginLeft + (clamped / loadScaleMax) * plotInnerW;
  };

  // Grid lines & X-ticks Chart 2
  [0.25, 0.5, 0.75, 1.0].forEach((frac) => {
    const val = Math.round(loadScaleMax * frac);
    const x = chart2X + plotInnerMarginLeft + frac * plotInnerW;
    doc.setDrawColor(226, 232, 240);
    doc.line(x, curY + plotInnerMarginTop, x, curY + plotInnerMarginTop + plotInnerH);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${val}t`, x, curY + plotInnerMarginTop + plotInnerH + 4, { align: 'center' });
  });

  // FS Reference lines in Chart 2
  fsLines.forEach((fs, i) => {
    const x = getLoadXPDF(fs.ultimateLoadT);
    if (x <= chart2X + plotInnerMarginLeft + plotInnerW) {
      doc.setDrawColor(99, 102, 241); // Indigo
      doc.setLineWidth(0.25);
      doc.line(x, curY + plotInnerMarginTop, x, curY + plotInnerMarginTop + plotInnerH);
      doc.setFontSize(5.5);
      doc.setTextColor(79, 70, 229);
      doc.text(`FS ${fs.factor}`, x, curY + plotInnerMarginTop - 1, { align: 'center' });
    }
  });

  // Polyline for Load
  const validLoadPoints = points
    .map((p, idx) => (p.estimatedUltimateLoadT !== null ? { x: getLoadXPDF(p.estimatedUltimateLoadT), y: getYFromIndexPDF(idx) } : null))
    .filter((n): n is { x: number; y: number } => n !== null);

  if (validLoadPoints.length > 1) {
    doc.setDrawColor(79, 70, 229); // Indigo 600
    doc.setLineWidth(0.4);
    for (let i = 0; i < validLoadPoints.length - 1; i++) {
      doc.line(validLoadPoints[i].x, validLoadPoints[i].y, validLoadPoints[i + 1].x, validLoadPoints[i + 1].y);
    }
  }

  // Draw node points
  validLoadPoints.forEach((pt) => {
    doc.setFillColor(67, 56, 202);
    doc.circle(pt.x, pt.y, 0.6, 'F');
  });

  curY += chartHeight + 4;

  // 6. Factor of Safety Reference Table
  const swl = criteria?.safeWorkingLoadT || 30;
  autoTable(doc, {
    startY: curY,
    head: [[
      'Reference Factor of Safety (FS)',
      'FS 2.5 (tons)',
      'FS 3.0 (tons)',
      'FS 3.5 (tons)',
      'FS 4.0 (tons)',
      'Final Set Margin',
    ]],
    body: [[
      `Required Ru for Ra = ${swl} tons`,
      `${(swl * 2.5).toFixed(1)} t`,
      `${(swl * 3.0).toFixed(1)} t`,
      `${(swl * 3.5).toFixed(1)} t`,
      `${(swl * 4.0).toFixed(1)} t`,
      isSetPassed ? 'Compliant with Driving Criteria' : 'Re-drive required / Exceeds target',
    ]],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, font: 'helvetica', halign: 'center' },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  // @ts-expect-error - lastAutoTable injected
  curY = doc.lastAutoTable.finalY + 4;

  // 7. Engineering Use Limitation Notice Box (FHWA Reference)
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, curY, contentWidth, 12, 'FD');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('ENGINEERING USE LIMITATION NOTICE:', margin + 3, curY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const noticeLines = doc.splitTextToSize(
    'Estimated ultimate load is calculated from driving records using a dynamic formula. It is not a substitute for project-required PDA/CAPWAP analysis or static load testing. (Ref: FHWA Design and Construction of Driven Pile Foundations).',
    contentWidth - 6
  );
  doc.text(noticeLines, margin + 3, curY + 7.5);

  curY += 16;

  // 8. 4-Tier Signature Blocks
  const sigBoxWidth = 40;
  const sigPositions = [margin, margin + 47, margin + 94, margin + 141];
  const signatures = [
    { title: 'Site Engineer', label: 'Recorded By' },
    { title: 'QA/QC Inspector', label: 'Checked By' },
    { title: 'Construction Manager', label: 'Approved By' },
    { title: 'Consultant Engineer', label: 'Acknowledged By' },
  ];

  signatures.forEach((sig, i) => {
    const x = sigPositions[i];
    doc.setDrawColor(203, 213, 225);
    doc.line(x, curY + 12, x + sigBoxWidth, curY + 12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(sig.title, x + sigBoxWidth / 2, curY + 16, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`(${sig.label})`, x + sigBoxWidth / 2, curY + 20, { align: 'center' });
    doc.text('Date: ..... / ..... / .........', x + sigBoxWidth / 2, curY + 24, { align: 'center' });
  });

  return doc;
}

export function exportIndividualPilePDF(options: IndividualPilePDFOptions) {
  const doc = generateIndividualPilePDFDocument(options);
  const fileName = `${options.project.code}_Pile_${options.pile.pileNo}_Driving_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

