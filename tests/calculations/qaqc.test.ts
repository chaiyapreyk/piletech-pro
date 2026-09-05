import { describe, it, expect } from 'vitest';
import {
  calculateDeviation,
  evaluatePlumbness,
  evaluateOverallQC,
  type QACheckInput,
  type DeviationThresholds,
} from '@/lib/calculations/qaqc';

describe('QA/QC Tolerance & Deviation Engine', () => {
  const defaultThresholds: DeviationThresholds = {
    normalThresholdCm: 5.0,
    criticalThresholdCm: 10.0,
  };

  it('calculates net deviation correctly from design and as-built coordinates', () => {
    // Design at (10.00m, 20.00m), As-built at (10.03m, 20.04m)
    // dx = 0.03m = 3cm, dy = 0.04m = 4cm -> net = sqrt(3^2 + 4^2) = 5.0cm
    const result = calculateDeviation(
      { designX: 10.0, designY: 20.0, actualX: 10.03, actualY: 20.04, isMeters: true },
      defaultThresholds
    );

    expect(result.deltaXCm).toBeCloseTo(3.0, 2);
    expect(result.deltaYCm).toBeCloseTo(4.0, 2);
    expect(result.netDeviationCm).toBeCloseTo(5.0, 2);
    expect(result.status).toBe('NORMAL');
  });

  it('flags WARNING when deviation is between 5cm and 10cm', () => {
    // dx = 6cm, dy = 4cm -> net = sqrt(36 + 16) = sqrt(52) ≈ 7.21cm
    const result = calculateDeviation(
      { deltaXCm: 6.0, deltaYCm: 4.0 },
      defaultThresholds
    );

    expect(result.netDeviationCm).toBeCloseTo(7.21, 2);
    expect(result.status).toBe('WARNING');
    expect(result.actionRequired).toContain('Structural engineer');
  });

  it('flags CRITICAL when deviation exceeds 10cm', () => {
    // dx = 8cm, dy = 9cm -> net = sqrt(64 + 81) = sqrt(145) ≈ 12.04cm
    const result = calculateDeviation(
      { deltaXCm: 8.0, deltaYCm: 9.0 },
      defaultThresholds
    );

    expect(result.netDeviationCm).toBeCloseTo(12.04, 2);
    expect(result.status).toBe('CRITICAL');
  });

  it('supports custom project-level deviation thresholds', () => {
    const strictThresholds: DeviationThresholds = {
      normalThresholdCm: 3.0,
      criticalThresholdCm: 6.0,
    };
    // 4cm is WARNING under strict threshold
    const result = calculateDeviation({ deltaXCm: 4.0, deltaYCm: 0 }, strictThresholds);
    expect(result.status).toBe('WARNING');
  });

  it('evaluates verticality (plumbness) against 1% (1:100) standard', () => {
    // Plumbness 0.6% -> PASS
    const passCheck = evaluatePlumbness(0.6, 0.8, 1.0);
    expect(passCheck.isPassed).toBe(true);

    // Plumbness 1.2% in X -> FAIL
    const failCheck = evaluatePlumbness(1.2, 0.5, 1.0);
    expect(failCheck.isPassed).toBe(false);
    expect(failCheck.failedAxis).toBe('X');
  });

  it('aggregates overall pile QC status accurately', () => {
    const perfectInput: QACheckInput = {
      deviationStatus: 'NORMAL',
      isPlumbnessPassed: true,
      jointWeldStatus: 'PASS',
      headDamageStatus: 'NONE',
    };
    expect(evaluateOverallQC(perfectInput).overallStatus).toBe('PASS');

    const warningInput: QACheckInput = {
      deviationStatus: 'WARNING',
      isPlumbnessPassed: true,
      jointWeldStatus: 'PASS',
      headDamageStatus: 'MINOR',
    };
    expect(evaluateOverallQC(warningInput).overallStatus).toBe('WARNING');

    const criticalInput: QACheckInput = {
      deviationStatus: 'CRITICAL',
      isPlumbnessPassed: false,
      jointWeldStatus: 'FAIL',
      headDamageStatus: 'SEVERE',
    };
    expect(evaluateOverallQC(criticalInput).overallStatus).toBe('CRITICAL');
  });
});
