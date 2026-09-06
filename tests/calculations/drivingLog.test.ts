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
});
