import { describe, it, expect } from 'vitest';

describe('Driving Log with Skipped Intervals and Blow/ft Default', () => {
  it('correctly handles penetration logs with skipped (null) intervals', () => {
    // 20 ft window where intervals 3 and 7 were skipped due to fast hammering
    const blows: (number | null)[] = [
      18, 20, null, 24, 25, 28, null, 32, 35, 40,
      42, 45, 48, 50
    ];

    const validBlows = blows.filter((b): b is number => typeof b === 'number' && b > 0);
    expect(validBlows.length).toBe(12);
    expect(blows.filter((b) => b === null).length).toBe(2);

    // Total driven depth accounts for both recorded and skipped intervals (14 ft total)
    const drivenCount = blows.length;
    expect(drivenCount).toBe(14);

    // Convert to meters: 14 * 0.3048 = 4.2672 -> 4.27 m
    const drivenLengthM = Number((drivenCount * 0.3048).toFixed(2));
    expect(drivenLengthM).toBe(4.27);

    // Calculate average blows excluding skipped null values
    const avgBlowsFt = Math.round(validBlows.reduce((a, b) => a + b, 0) / validBlows.length);
    // (18+20+24+25+28+32+35+40+42+45+48+50) / 12 = 407 / 12 ≈ 33.916 -> 34
    expect(avgBlowsFt).toBe(34);

    const avgBlowsM = Math.round(avgBlowsFt * 3.28084);
    expect(avgBlowsM).toBe(112);
  });

  it('serializes and deserializes (number | null)[] JSON cleanly for database storage', () => {
    const originalLog: (number | null)[] = [22, 25, null, 30, null, 45];
    const jsonStr = JSON.stringify(originalLog);
    expect(jsonStr).toBe('[22,25,null,30,null,45]');

    const parsed: (number | null)[] = JSON.parse(jsonStr);
    expect(parsed).toEqual(originalLog);
    expect(parsed[2]).toBeNull();
    expect(parsed[4]).toBeNull();
  });

  it('correctly calculates unit-aware average blows using calculateAverageBlows helper', async () => {
    const { calculateAverageBlows } = await import('../../src/lib/calculations/drivingLog');

    // Case 1: FEET unit (recorded as 27, 32, 31 blows per foot)
    const feetResult = calculateAverageBlows(JSON.stringify([27, 32, 31]), 'FEET');
    expect(feetResult.primaryUnit).toBe('FEET');
    expect(feetResult.avgBlowsFt).toBe(30);
    expect(feetResult.avgBlowsM).toBe(98); // 30 * 3.28084 ≈ 98.4 -> 98

    // Case 2: METER unit (recorded as 80, 90 blows per meter)
    const meterResult = calculateAverageBlows(JSON.stringify([80, 90]), 'METER');
    expect(meterResult.primaryUnit).toBe('METER');
    expect(meterResult.avgBlowsM).toBe(85);
    expect(meterResult.avgBlowsFt).toBe(26); // 85 / 3.28084 ≈ 25.9 -> 26

    // Case 3: Empty or invalid inputs
    const emptyResult = calculateAverageBlows(null, 'FEET');
    expect(emptyResult.avgBlowsFt).toBeNull();
    expect(emptyResult.avgBlowsM).toBeNull();

    const emptyArrayResult = calculateAverageBlows('[]', 'FEET');
    expect(emptyArrayResult.avgBlowsFt).toBeNull();
    expect(emptyArrayResult.avgBlowsM).toBeNull();

    // Case 4: Array with null/skipped intervals
    const skippedResult = calculateAverageBlows(JSON.stringify([20, null, 40]), 'FEET');
    expect(skippedResult.avgBlowsFt).toBe(30); // (20 + 40) / 2 = 30
    expect(skippedResult.avgBlowsM).toBe(98);
  });
});

describe('Tip Level & Engineering Elevations Calculations', () => {
  it('correctly calculates actual driven depth and tip level with standard stick-up', () => {
    const totalPileLength = 21.0; // 21.00 m
    const stickUpLength = 0.5;   // +0.50 m above ground
    const groundLevel = 3.0;     // +3.00 m MSL
    const cutOffLevel = 2.5;     // +2.50 m MSL

    // Driven depth in soil = L_pile - h_stick = 21.0 - 0.5 = 20.50 m
    const drivenDepth = Number((totalPileLength - stickUpLength).toFixed(2));
    expect(drivenDepth).toBe(20.5);

    // Tip level = GL - Driven Depth = 3.00 - 20.50 = -17.50 m MSL
    const tipLevel = Number((groundLevel - drivenDepth).toFixed(2));
    expect(tipLevel).toBe(-17.5);

    // Actual top of pile = GL + h_stick = 3.00 + 0.50 = +3.50 m MSL
    const actualTopLevel = Number((groundLevel + stickUpLength).toFixed(2));
    expect(actualTopLevel).toBe(3.5);

    // Cut-off waste = Top Level - COL = 3.50 - 2.50 = 1.00 m
    const cutWaste = Number((actualTopLevel - cutOffLevel).toFixed(2));
    expect(cutWaste).toBe(1.0);
  });

  it('correctly handles dolly / follower penetration (negative stick-up)', () => {
    const totalPileLength = 20.0; // 20.00 m
    const stickUpLength = -0.4;  // -0.40 m (driven 0.4m below ground surface)
    const groundLevel = 2.0;     // +2.00 m MSL
    const cutOffLevel = 1.5;     // +1.50 m MSL

    // Driven depth = 20.0 - (-0.4) = 20.40 m
    const drivenDepth = Number((totalPileLength - stickUpLength).toFixed(2));
    expect(drivenDepth).toBe(20.4);

    // Tip level = 2.00 - 20.40 = -18.40 m MSL
    const tipLevel = Number((groundLevel - drivenDepth).toFixed(2));
    expect(tipLevel).toBe(-18.4);

    // Top level = 2.00 + (-0.40) = +1.60 m MSL
    const actualTopLevel = Number((groundLevel + stickUpLength).toFixed(2));
    expect(actualTopLevel).toBe(1.6);

    // Cut-off waste = 1.60 - 1.50 = 0.10 m
    const cutWaste = Number((actualTopLevel - cutOffLevel).toFixed(2));
    expect(cutWaste).toBe(0.1);
  });
});
