import { describe, it, expect } from 'vitest';
import {
  clampEqualizerBlowValue,
  getSoilStrataByBlows,
  applyPresetCurve,
  ensureMinimumIntervals,
  type SoilStrataCategory,
} from '../src/lib/calculations/drivingEqualizer';

describe('Driving Equalizer Calculation & Utilities', () => {
  it('clamps blow value correctly between 1 and 100 or null', () => {
    expect(clampEqualizerBlowValue(0)).toBe(1);
    expect(clampEqualizerBlowValue(-10)).toBe(1);
    expect(clampEqualizerBlowValue(150)).toBe(100);
    expect(clampEqualizerBlowValue(45)).toBe(45);
    expect(clampEqualizerBlowValue(null)).toBeNull();
  });

  it('classifies soil strata category accurately based on blow count', () => {
    expect(getSoilStrataByBlows(null).category).toBe('SKIPPED');
    expect(getSoilStrataByBlows(10).category).toBe('SOFT');
    expect(getSoilStrataByBlows(25).category).toBe('MEDIUM');
    expect(getSoilStrataByBlows(50).category).toBe('HARD');
    expect(getSoilStrataByBlows(85).category).toBe('REFUSAL');
  });

  it('generates preset curve correctly', () => {
    const flat = applyPresetCurve('FLAT', 5, 20);
    expect(flat).toEqual([20, 20, 20, 20, 20]);

    const stepUp = applyPresetCurve('STEP_UP', 5, 15, 35);
    expect(stepUp.length).toBe(5);
    expect(stepUp[0]).toBe(15);
    expect(stepUp[4]).toBe(35);
    expect(stepUp[2]).toBe(25);

    const cleared = applyPresetCurve('CLEAR_ZERO', 5);
    expect(cleared).toEqual([null, null, null, null, null]);
  });

  it('ensures at least 20 intervals with null default', () => {
    const padded = ensureMinimumIntervals([], 20);
    expect(padded.length).toBe(20);
    expect(padded.every((v) => v === null)).toBe(true);

    const partial = ensureMinimumIntervals([15, 20], 20);
    expect(partial.length).toBe(20);
    expect(partial[0]).toBe(15);
    expect(partial[1]).toBe(20);
    expect(partial[2]).toBeNull();
    expect(partial[19]).toBeNull();

    const longer = ensureMinimumIntervals(Array.from({ length: 25 }, () => 30), 20);
    expect(longer.length).toBe(25);
  });
});
