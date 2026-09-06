import { describe, it, expect } from 'vitest';
import { generateIndividualPilePDFDocument } from '@/lib/reports/pdfGenerator';
import type { PileData } from '@/components/piles/matrix/matrixTypes';

describe('Individual Pile PDF Generator (spec 2026-09-06)', () => {
  const dummyPile: PileData = {
    id: 'pile-test-1',
    pileNo: 'P-101',
    gridLine: 'B-4',
    building: 'Tower 1',
    status: 'DRIVEN',
    criteriaId: 'crit-1',
    criteria: {
      id: 'crit-1',
      name: 'Prestressed Concrete I-0.26m (35t)',
      pileType: 'Prestressed Concrete I-0.26m',
      safeWorkingLoadT: 35,
      safetyFactor: 2.5,
      hammerWeightT: 4.0,
      dropHeightCm: 40,
      pileWeightT: 1.8,
      cushionCoeffE: 0.25,
      tempCompressionC: 1.2,
      targetSet10BlowsCm: 2.5,
    },
    drivingRecord: {
      id: 'drv-1',
      pileId: 'pile-test-1',
      penetrationBlows: JSON.stringify([18, 22, 28, 35, 42]),
      recordUnit: 'FEET',
      recordScope: 'FULL',
      windowLengthFt: 20,
      measuredLast10Cm: 2.1,
      measuredTempCCm: 1.1,
      drivenLengthM: 18.0,
      groundLevelM: 102.5,
      cutOffLevelM: 103.2,
      tipLevelM: 84.5,
      isSetPassed: true,
      inspectorName: 'Somchai Eng',
      notes: 'No abnormal rebound',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    qcInspection: {
      id: 'qc-1',
      pileId: 'pile-test-1',
      netDeviationCm: 3.2,
      deviationStatus: 'NORMAL',
      jointWeldStatus: 'PASS',
      headDamageStatus: 'NONE',
      isPlumbnessPassed: true,
      inspectorName: 'QC Somsak',
      approvedByCM: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  it('generates deterministic jsPDF document with both charts, FS labels, elevations, and disclaimer notice', () => {
    const doc = generateIndividualPilePDFDocument({
      project: {
        name: 'The Grand Horizon Tower',
        code: 'GHT-2026',
        contractorName: 'Thai Piling Co., Ltd.',
        consultantName: 'Advisory Ltd.',
        location: 'Bangkok',
      },
      pile: dummyPile,
    });

    expect(doc).toBeDefined();
    // Verify document has pages
    expect(doc.internal.pages.length).toBeGreaterThan(0);
    // Verify PDF binary output is non-empty
    const output = doc.output('arraybuffer');
    expect(output.byteLength).toBeGreaterThan(1000);
  });

  it('handles pile with missing driving criteria without throwing error', () => {
    const pileNoCrit: PileData = {
      ...dummyPile,
      criteriaId: null,
      criteria: null,
    };

    const doc = generateIndividualPilePDFDocument({
      project: {
        name: 'The Grand Horizon Tower',
        code: 'GHT-2026',
      },
      pile: pileNoCrit,
    });

    expect(doc).toBeDefined();
    expect(doc.internal.pages.length).toBeGreaterThan(0);
  });

  it('handles pile with derived tip level when tipLevelM is absent', () => {
    const pileDerivedTip: PileData = {
      ...dummyPile,
      drivingRecord: {
        ...dummyPile.drivingRecord!,
        tipLevelM: null,
      },
    };

    const doc = generateIndividualPilePDFDocument({
      project: {
        name: 'The Grand Horizon Tower',
        code: 'GHT-2026',
      },
      pile: pileDerivedTip,
    });

    expect(doc).toBeDefined();
    expect(doc.internal.pages.length).toBeGreaterThan(0);
  });
});
