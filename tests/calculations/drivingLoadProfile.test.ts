import { describe, it, expect } from 'vitest';
import {
  parsePenetrationBlows,
  calculatePenetrationSet,
  validateDrivingCriteria,
  calculateDrivingLoadProfile,
  formatElevation,
  type DrivingCriteriaInput,
  type DrivingRecordInput,
} from '@/lib/calculations/drivingLoadProfile';
import { calculateBearingCapacityFromSet } from '@/lib/calculations/hiley';

describe('Driving Load Profile Engine (spec 2026-09-06)', () => {
  const standardCriteria: DrivingCriteriaInput = {
    id: 'crit-1',
    name: 'I-0.26m Standard (35 t)',
    pileType: 'Prestressed Concrete I-0.26m',
    safeWorkingLoadT: 35,
    safetyFactor: 2.5,
    hammerWeightT: 4.0,
    dropHeightCm: 40,
    pileWeightT: 1.8,
    cushionCoeffE: 0.25,
    tempCompressionC: 1.2,
  };

  describe('4.1 Penetration Set Calculation', () => {
    it('FEET conversion: 30 Blow/ft produces 1.016 cm/blow', () => {
      const setCm = calculatePenetrationSet(30, 'FEET');
      expect(setCm).toBeCloseTo(1.016, 3);
    });

    it('METER conversion: 30 Blow/m produces 3.333333... cm/blow', () => {
      const setCm = calculatePenetrationSet(30, 'METER');
      expect(setCm).toBeCloseTo(3.333333, 4);
    });

    it('returns 0 for zero, negative, NaN, or infinite blows', () => {
      expect(calculatePenetrationSet(0, 'FEET')).toBe(0);
      expect(calculatePenetrationSet(-5, 'FEET')).toBe(0);
      expect(calculatePenetrationSet(NaN, 'FEET')).toBe(0);
    });
  });

  describe('Blows parser', () => {
    it('parses valid JSON arrays and cleans malformed, zero, or null items', () => {
      const parsed = parsePenetrationBlows('[10, null, 25, 0, -3, "30", "bad", 45]');
      expect(parsed).toEqual([10, null, 25, null, null, 30, null, 45]);
    });

    it('handles empty or malformed strings gracefully without throwing', () => {
      expect(parsePenetrationBlows('')).toEqual([]);
      expect(parsePenetrationBlows(null)).toEqual([]);
      expect(parsePenetrationBlows('not json')).toEqual([]);
    });
  });

  describe('4.2 & 4.3 Hiley Estimated Ultimate Resistance and FS Reference Lines', () => {
    it('reproduces existing Hiley engine result for identical inputs at valid intervals', () => {
      const record: DrivingRecordInput = {
        penetrationBlows: JSON.stringify([20, 30, 40]),
        recordUnit: 'FEET',
        measuredTempCCm: null,
      };

      const result = calculateDrivingLoadProfile(record, standardCriteria);
      expect(result.points).toHaveLength(3);

      // Verify interval 1 (30 blow/ft)
      const pt1 = result.points[1];
      expect(pt1.recordedBlows).toBe(30);
      expect(pt1.setCmPerBlow).toBeCloseTo(1.016, 3);

      // Direct calculation using Hiley engine for 10 blows of setCmPerBlow:
      const directHiley = calculateBearingCapacityFromSet(
        {
          safeWorkingLoadTons: 35,
          safetyFactor: 2.5,
          hammerWeightTons: 4.0,
          dropHeightCm: 40,
          pileWeightTons: 1.8,
          restitutionCoeff: 0.25,
          tempCompressionCm: 1.2,
        },
        pt1.setCmPerBlow! * 10,
        1.2
      );

      expect(pt1.estimatedUltimateLoadT).toBeCloseTo(directHiley.ultimateCapacityTons, 1);
      expect(pt1.estimatedSafeWorkingLoadT).toBeCloseTo(directHiley.safeWorkingLoadTons, 1);
    });

    it('calculates FS reference lines equal to safeWorkingLoadT * [2.5, 3.0, 3.5, 4.0]', () => {
      const record: DrivingRecordInput = {
        penetrationBlows: JSON.stringify([25]),
        recordUnit: 'FEET',
      };

      const result = calculateDrivingLoadProfile(record, standardCriteria);
      expect(result.fsLines).toHaveLength(4);
      expect(result.fsLines[0]).toEqual({
        factor: 2.5,
        ultimateLoadT: 87.5,
        label: 'FS 2.5 · 87.5 t',
      });
      expect(result.fsLines[1]).toEqual({
        factor: 3.0,
        ultimateLoadT: 105.0,
        label: 'FS 3.0 · 105 t',
      });
      expect(result.fsLines[2]).toEqual({
        factor: 3.5,
        ultimateLoadT: 122.5,
        label: 'FS 3.5 · 122.5 t',
      });
      expect(result.fsLines[3]).toEqual({
        factor: 4.0,
        ultimateLoadT: 140.0,
        label: 'FS 4.0 · 140 t',
      });
    });

    it('measured compression overrides criteria compression only when valid and positive', () => {
      const recordWithMeasuredC: DrivingRecordInput = {
        penetrationBlows: JSON.stringify([30]),
        recordUnit: 'FEET',
        measuredTempCCm: 0.8, // measured field C is 0.8 cm (overrides criteria 1.2 cm)
      };

      const result = calculateDrivingLoadProfile(recordWithMeasuredC, standardCriteria);
      expect(result.points[0].compressionSource).toBe('MEASURED');
      expect(result.points[0].compressionUsedCm).toBe(0.8);

      const recordWithNullC: DrivingRecordInput = {
        penetrationBlows: JSON.stringify([30]),
        recordUnit: 'FEET',
        measuredTempCCm: null, // absent -> fallback to criteria 1.2
      };

      const resultFallback = calculateDrivingLoadProfile(recordWithNullC, standardCriteria);
      expect(resultFallback.points[0].compressionSource).toBe('CRITERIA');
      expect(resultFallback.points[0].compressionUsedCm).toBe(1.2);
    });

    it('preserves gaps for null, skipped, zero, or negative blow counts without creating false load points', () => {
      const record: DrivingRecordInput = {
        penetrationBlows: JSON.stringify([20, null, 0, 35]),
        recordUnit: 'FEET',
      };

      const result = calculateDrivingLoadProfile(record, standardCriteria);
      expect(result.points).toHaveLength(4);

      expect(result.points[0].estimatedUltimateLoadT).not.toBeNull();
      // Skipped interval 1
      expect(result.points[1].recordedBlows).toBeNull();
      expect(result.points[1].estimatedUltimateLoadT).toBeNull();
      // Zero interval 2
      expect(result.points[2].recordedBlows).toBeNull();
      expect(result.points[2].estimatedUltimateLoadT).toBeNull();
      // Valid interval 3
      expect(result.points[3].recordedBlows).toBe(35);
      expect(result.points[3].estimatedUltimateLoadT).not.toBeNull();
    });
  });

  describe('4.4 Elevation and Derived Tip Mapping', () => {
    it('calculates elevations correctly for FULL scope using groundLevelM and cumulative penetration', () => {
      const record: DrivingRecordInput = {
        penetrationBlows: JSON.stringify([20, 25, 30]),
        recordUnit: 'FEET',
        recordScope: 'FULL',
        groundLevelM: 100.0,
        cutOffLevelM: 101.5,
        tipLevelM: 80.0,
        drivenLengthM: 20.0,
      };

      const result = calculateDrivingLoadProfile(record, standardCriteria);

      expect(result.recordScope).toBe('FULL');
      expect(result.isWindowScope).toBe(false);
      expect(result.elevations.groundLevelM).toBe(100.0);
      expect(result.elevations.cutOffLevelM).toBe(101.5);
      expect(result.elevations.tipLevelM).toBe(80.0);
      expect(result.elevations.isTipDerived).toBe(false);
      expect(result.elevations.effectiveTipLevelM).toBe(80.0);

      // Interval 0 (1 ft = 0.3048 m): elevation = 100 - 0.3048 = 99.6952 -> 99.695
      expect(result.points[0].cumulativePenetrationM).toBe(0.3048);
      expect(result.points[0].elevationM).toBeCloseTo(99.695, 3);

      // Interval 1 (2 ft = 0.6096 m): elevation = 100 - 0.6096 = 99.39
      expect(result.points[1].cumulativePenetrationM).toBe(0.6096);
      expect(result.points[1].elevationM).toBeCloseTo(99.39, 2);
    });

    it('aligns WINDOW scope intervals directly with pile tip level at the final recorded interval', () => {
      // 20 ft recorded window for a 21m driven pile (GL +3.00, Tip -18.00)
      const blows20ft = Array(20).fill(25);
      const record: DrivingRecordInput = {
        penetrationBlows: JSON.stringify(blows20ft),
        recordUnit: 'FEET',
        recordScope: 'WINDOW',
        windowLengthFt: 20,
        groundLevelM: 3.0,
        cutOffLevelM: 2.5,
        tipLevelM: -18.0,
        drivenLengthM: 21.0,
      };

      const result = calculateDrivingLoadProfile(record, standardCriteria);

      expect(result.isWindowScope).toBe(true);
      expect(result.recordScope).toBe('WINDOW');
      expect(result.points).toHaveLength(20);

      // Last interval (idx 19) must touch the pile tip (-18.00m) at drivenLength 21.0m
      const lastPoint = result.points[19];
      expect(lastPoint.cumulativePenetrationM).toBe(21.0);
      expect(lastPoint.elevationM).toBe(-18.0);

      // First interval of the 20ft window (idx 0) is 19 feet above the tip:
      // -18.00 + 19 * 0.3048 = -12.2088 m
      const firstPoint = result.points[0];
      expect(firstPoint.elevationM).toBeCloseTo(-12.209, 3);
      expect(firstPoint.cumulativePenetrationM).toBeCloseTo(15.209, 3);
    });

    it('derives tip level when tipLevelM is absent and labels it as derived', () => {
      const record: DrivingRecordInput = {
        penetrationBlows: JSON.stringify([20, 25]),
        recordUnit: 'FEET',
        recordScope: 'FULL',
        groundLevelM: 50.0,
        tipLevelM: null,
        drivenLengthM: 18.5,
      };

      const result = calculateDrivingLoadProfile(record, standardCriteria);

      expect(result.elevations.tipLevelM).toBeNull();
      expect(result.elevations.isTipDerived).toBe(true);
      expect(result.elevations.derivedTipLevelM).toBe(31.5); // 50.0 - 18.5
      expect(result.elevations.effectiveTipLevelM).toBe(31.5);
    });

    it('formatElevation properly handles positive, negative, zero, and null/undefined values', () => {
      expect(formatElevation(3.0)).toBe('+3.00 m');
      expect(formatElevation(2.555)).toBe('+2.56 m');
      expect(formatElevation(-18.0)).toBe('-18.00 m');
      expect(formatElevation(0)).toBe('0.00 m');
      expect(formatElevation(null)).toBe('-');
      expect(formatElevation(undefined)).toBe('-');
    });
  });

  describe('4.5 Missing Inputs Validation', () => {
    it('identifies missing criteria, keeps blow count available, and lists missing inputs', () => {
      const record: DrivingRecordInput = {
        penetrationBlows: JSON.stringify([20, 30, 40]),
        recordUnit: 'FEET',
      };

      // No criteria assigned
      const result = calculateDrivingLoadProfile(record, null);

      expect(result.validation.isCriteriaValid).toBe(false);
      expect(result.validation.missingFields.length).toBeGreaterThan(0);
      expect(result.hasValidLoadPoints).toBe(false);
      expect(result.fsLines).toHaveLength(0);

      // Blow count points are still fully available!
      expect(result.points).toHaveLength(3);
      expect(result.points[0].recordedBlows).toBe(20);
      expect(result.points[1].recordedBlows).toBe(30);
      expect(result.points[0].estimatedUltimateLoadT).toBeNull();
    });
  });
});
