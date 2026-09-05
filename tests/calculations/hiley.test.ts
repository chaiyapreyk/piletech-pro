import { describe, it, expect } from 'vitest';
import {
  calculateHiley,
  calculateBearingCapacityFromSet,
  generateSensitivityMatrix,
  blowsPerMeterToBlowsPerFoot,
  formatBlowsDual,
  calculateElasticModulus,
  calculateShaftCompressionC2,
  calculatePileWeightFromDimensions,
  DEFAULT_HILEY_INPUT,
  STANDARD_PILE_SECTIONS,
  getPileSectionById,
  type HileyInput,
} from '@/lib/calculations/hiley';

describe('Hiley Dynamic Formula Engine', () => {
  const standardInput: HileyInput = {
    safeWorkingLoadTons: 40,      // Required Ra = 40 tons
    safetyFactor: 2.5,            // FS = 2.5 -> Ru = 100 tons
    hammerWeightTons: 4.5,        // Drop hammer W = 4.5 tons
    dropHeightCm: 40,             // H = 40 cm
    pileWeightTons: 2.0,          // P = 2.0 tons (pile + helmet)
    restitutionCoeff: 0.25,       // e = 0.25 (wood cushion)
    tempCompressionCm: 1.2,       // C = 1.2 cm
  };

  it('calculates hammer efficiency eta correctly', () => {
    // W = 4.5, P = 2.0, e = 0.25
    // eta = (4.5 + 0.25^2 * 2.0) / (4.5 + 2.0) = (4.5 + 0.125) / 6.5 = 4.625 / 6.5 ≈ 0.7115
    const result = calculateHiley(standardInput);
    expect(result.hammerEfficiency).toBeCloseTo(0.7115, 3);
  });

  it('calculates target set per 10 blows correctly', () => {
    const result = calculateHiley(standardInput);
    // Ru = 40 * 2.5 = 100 tons
    // Energy = eta * W * H = 0.711538 * 4.5 * 40 = 128.0769 ton-cm
    // S + C/2 = 128.0769 / 100 = 1.280769 cm
    // S = 1.280769 - 0.6 = 0.680769 cm per blow
    // S10 = 10 * 0.680769 = 6.808 cm
    expect(result.targetSetPerBlowCm).toBeCloseTo(0.681, 2);
    expect(result.targetSet10BlowsCm).toBeCloseTo(6.81, 2);
    expect(result.targetSet10BlowsMm).toBeCloseTo(68.1, 1);
    expect(result.status).toBe('VALID');
  });

  it('re-calculates allowable load Ra from measured field set', () => {
    // If measured set S10 = 5.0 cm -> S = 0.5 cm
    // S + C/2 = 0.5 + 0.6 = 1.1 cm
    // Ru = 128.0769 / 1.1 = 116.43 tons
    // Ra = 116.43 / 2.5 = 46.57 tons (> 40 tons, PASSED)
    const capacity = calculateBearingCapacityFromSet(standardInput, 5.0);
    expect(capacity.ultimateCapacityTons).toBeCloseTo(116.43, 1);
    expect(capacity.safeWorkingLoadTons).toBeCloseTo(46.57, 1);
    expect(capacity.isSetAchieved).toBe(true);
  });

  it('flags failure when measured field set exceeds target set', () => {
    // If measured set is 8.0 cm (> target set 6.81 cm)
    // S = 0.8 cm -> S + C/2 = 1.4 cm
    // Ru = 128.0769 / 1.4 = 91.48 tons
    // Ra = 91.48 / 2.5 = 36.59 tons (< 40 tons, FAILED)
    const capacity = calculateBearingCapacityFromSet(standardInput, 8.0);
    expect(capacity.safeWorkingLoadTons).toBeLessThan(standardInput.safeWorkingLoadTons);
    expect(capacity.isSetAchieved).toBe(false);
  });

  it('warns when required set is negative (unachievable with given hammer/energy)', () => {
    // Extreme requirement: Ra = 200 tons (Ru = 500 tons) with low hammer energy
    const extremeInput: HileyInput = {
      ...standardInput,
      safeWorkingLoadTons: 200,
    };
    const result = calculateHiley(extremeInput);
    expect(result.status).toBe('WARNING_NEGATIVE_SET');
    expect(result.targetSet10BlowsCm).toBeLessThanOrEqual(0);
  });

  it('generates a 5x5 sensitivity matrix for site drop height and compression', () => {
    const matrix = generateSensitivityMatrix(standardInput);
    expect(matrix.dropHeights.length).toBe(5);
    expect(matrix.compressions.length).toBe(5);
    expect(matrix.grid.length).toBe(5); // rows
    expect(matrix.grid[0].length).toBe(5); // columns
    // Verify higher drop height yields larger allowable set
    const lowHeightSet = matrix.grid[0][2]; // lowest H, nominal C
    const highHeightSet = matrix.grid[4][2]; // highest H, nominal C
    expect(highHeightSet).toBeGreaterThan(lowHeightSet);
  });

  it('converts blows/meter to blows/foot accurately', () => {
    // 33 blows/m -> ~10 blows/ft
    expect(blowsPerMeterToBlowsPerFoot(33)).toBe(10);
    // 66 blows/m -> ~20 blows/ft
    expect(blowsPerMeterToBlowsPerFoot(66)).toBe(20);
    expect(formatBlowsDual(33)).toBe('33 blw/m (10 blw/ft)');
  });

  describe('Pile Material & Geometry Parameters', () => {
    it('has standard default values for concrete strength, Ec, area, and length', () => {
      expect(DEFAULT_HILEY_INPUT.concreteStrengthKsc).toBe(350);
      expect(DEFAULT_HILEY_INPUT.elasticModulusKsc).toBe(280000);
      expect(DEFAULT_HILEY_INPUT.pileSectionAreaCm2).toBe(484);
      expect(DEFAULT_HILEY_INPUT.pileLengthM).toBe(20.0);
    });

    it('calculates concrete elastic modulus Ec from compressive strength fc', () => {
      // Ec = 15,100 * sqrt(fc')
      // For fc' = 400 ksc: Ec = 15,100 * 20 = 302,000 ksc
      expect(calculateElasticModulus(400)).toBe(302000);
      // For fc' = 350 ksc: Ec ≈ 282,496 ksc
      expect(calculateElasticModulus(350)).toBeCloseTo(282496, -2);
    });

    it('calculates theoretical pile shaft elastic compression C2', () => {
      // Ru = 100 tons = 100,000 kg
      // L = 20 m = 2,000 cm
      // A = 500 cm2, E = 280,000 ksc
      // C2 = (100,000 * 2,000) / (500 * 280,000) = 200,000,000 / 140,000,000 = 1.4286 cm
      const C2 = calculateShaftCompressionC2(100, 20, 500, 280000);
      expect(C2).toBeCloseTo(1.4286, 3);
    });

    it('estimates pile weight from cross-sectional area and length', () => {
      // Area = 500 cm2 = 0.05 m2, L = 20 m, unit weight = 2.4 t/m3, cap = 0.3 t
      // Pile self-weight = 0.05 * 20 * 2.4 = 2.4 tons
      // Total weight with cap = 2.4 + 0.3 = 2.7 tons
      const weight = calculatePileWeightFromDimensions(500, 20, 2.4, 0.3);
      expect(weight).toBeCloseTo(2.7, 1);
    });

    it('includes theoretical C2 and estimated pile weight in calculateHiley result', () => {
      const inputWithMaterial: HileyInput = {
        ...standardInput,
        concreteStrengthKsc: 350,
        elasticModulusKsc: 280000,
        pileSectionAreaCm2: 484,
        pileLengthM: 20.0,
      };
      const result = calculateHiley(inputWithMaterial);
      expect(result.theoreticalC2Cm).toBeDefined();
      expect(result.theoreticalC2Cm).toBeGreaterThan(0);
      expect(result.estimatedPileWeightTons).toBeDefined();
      expect(result.estimatedPileWeightTons).toBeGreaterThan(0);
    });

    it('provides standard pile sections catalog with correct section areas', () => {
      expect(STANDARD_PILE_SECTIONS.length).toBeGreaterThanOrEqual(10);
      
      const i26 = getPileSectionById('I_026');
      expect(i26).toBeDefined();
      expect(i26?.areaCm2).toBe(484);

      const i30 = getPileSectionById('I_030');
      expect(i30?.areaCm2).toBe(650);

      const sq35 = getPileSectionById('SQ_035');
      expect(sq35?.areaCm2).toBe(1225);

      const spun40 = getPileSectionById('SPUN_040');
      expect(spun40?.areaCm2).toBe(766);
    });
  });
});
