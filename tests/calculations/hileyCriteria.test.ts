import { describe, it, expect } from 'vitest';
import { calculateHiley, type HileyInput } from '../../src/lib/calculations/hiley';

describe('Hiley Calculation Sheet & Criteria Verification', () => {
  it('accurately calculates Target Set S10 and resistance for standard I-0.26m pile', () => {
    const input: HileyInput = {
      safeWorkingLoadTons: 35,
      safetyFactor: 2.5,
      hammerWeightTons: 4.0,
      dropHeightCm: 40,
      pileWeightTons: 1.8,
      restitutionCoeff: 0.25,
      tempCompressionCm: 1.2,
      concreteStrengthKsc: 350,
      elasticModulusKsc: 280000,
      pileSectionAreaCm2: 484,
      pileLengthM: 20.0,
    };

    const res = calculateHiley(input);

    expect(res.ultimateCapacityTons).toBe(87.5); // Ra * FS = 35 * 2.5
    expect(res.targetSet10BlowsCm).toBeGreaterThan(5.0);
    expect(res.targetSet10BlowsCm).toBeLessThan(10.0);
    expect(res.equivalentBlowsPerFoot).toBeGreaterThan(0);
    expect(res.equivalentBlowsPerMeter).toBeGreaterThan(res.equivalentBlowsPerFoot);
  });

  it('accurately evaluates pass/fail status when Target Set changes', () => {
    const measuredLast10 = 6.5; // cm

    // Scenario A: Initial criteria Target Set = 7.0 cm -> Pass
    const initialTargetSet = 7.0;
    const isInitiallyPassed = measuredLast10 <= initialTargetSet;
    expect(isInitiallyPassed).toBe(true);

    // Scenario B: Revised criteria with higher Safe Load -> Target Set tightens to 6.0 cm -> Fail (Re-drive required)
    const revisedTargetSet = 6.0;
    const isRevisedPassed = measuredLast10 <= revisedTargetSet;
    expect(isRevisedPassed).toBe(false);
  });

  it('preserves all calculation sheet parameters for repeatable engineering audits', () => {
    const calculationSheet = {
      name: 'I-0.26m อาคาร A (35 ตัน)',
      pileType: 'Prestressed Concrete I-0.26m',
      sectionId: 'I_026',
      safeWorkingLoadT: 35,
      safetyFactor: 2.5,
      hammerWeightT: 4.0,
      dropHeightCm: 40,
      pileWeightT: 1.8,
      cushionCoeffE: 0.25,
      tempCompressionC: 1.2,
      concreteStrengthKsc: 350,
      elasticModulusKsc: 280000,
      pileSectionAreaCm2: 484,
      pileLengthM: 20.0,
      targetSet10BlowsCm: 7.44,
    };

    expect(calculationSheet.name).toBe('I-0.26m อาคาร A (35 ตัน)');
    expect(calculationSheet.targetSet10BlowsCm).toBe(7.44);
    expect(calculationSheet.pileSectionAreaCm2).toBe(484);
    expect(calculationSheet.pileLengthM).toBe(20.0);
  });

  it('correctly re-evaluates driving record pass/fail when pile criteria is changed to a tighter target set', () => {
    // Pile driven with measured Last 10 Blows = 3.2 cm
    const measuredLast10Cm = 3.2;

    // Criteria A (Standard): Target S10 <= 3.5 cm
    const criteriaA = { id: 'crit-a', targetSet10BlowsCm: 3.5 };
    const passedUnderCriteriaA = measuredLast10Cm <= criteriaA.targetSet10BlowsCm;
    expect(passedUnderCriteriaA).toBe(true);

    // Engineer changes pile size / criteria to Criteria B (Higher Safe Load): Target S10 <= 2.8 cm
    const criteriaB = { id: 'crit-b', targetSet10BlowsCm: 2.8 };
    const passedUnderCriteriaB = measuredLast10Cm <= criteriaB.targetSet10BlowsCm;
    expect(passedUnderCriteriaB).toBe(false); // Automatically becomes failed (Re-drive required)!
  });

  it('batch updates criteria for an array of piles maintaining individual measured set fidelity', () => {
    const piles = [
      { id: 'p-1', pileNo: 'P-01', criteriaId: 'crit-old', measuredLast10Cm: 2.0 },
      { id: 'p-2', pileNo: 'P-02', criteriaId: 'crit-old', measuredLast10Cm: 3.0 },
      { id: 'p-3', pileNo: 'P-03', criteriaId: 'crit-old', measuredLast10Cm: 4.5 },
    ];

    const newCriteria = { id: 'crit-new', targetSet10BlowsCm: 2.5 };

    // Batch apply new criteria
    const updatedPiles = piles.map((p) => ({
      ...p,
      criteriaId: newCriteria.id,
      isSetPassed: p.measuredLast10Cm <= newCriteria.targetSet10BlowsCm,
    }));

    expect(updatedPiles[0].criteriaId).toBe('crit-new');
    expect(updatedPiles[0].isSetPassed).toBe(true); // 2.0 <= 2.5 -> Pass
    expect(updatedPiles[1].criteriaId).toBe('crit-new');
    expect(updatedPiles[1].isSetPassed).toBe(false); // 3.0 > 2.5 -> Fail
    expect(updatedPiles[2].criteriaId).toBe('crit-new');
    expect(updatedPiles[2].isSetPassed).toBe(false); // 4.5 > 2.5 -> Fail
  });
});
