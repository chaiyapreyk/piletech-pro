/**
 * Geotechnical & Driving Log Calculation Helpers
 */

export interface AverageBlowsResult {
  avgBlowsFt: number | null;
  avgBlowsM: number | null;
  primaryUnit: 'FEET' | 'METER';
}

/**
 * Calculates average blow count per foot and per meter from penetration blows JSON.
 * Accurately respects the original recording unit (FEET vs METER).
 */
export function calculateAverageBlows(
  penetrationBlowsJson?: string | null,
  recordUnit?: string | null
): AverageBlowsResult {
  const normalizedUnit: 'FEET' | 'METER' =
    recordUnit?.toUpperCase()?.trim() === 'METER' ? 'METER' : 'FEET';

  if (!penetrationBlowsJson) {
    return { avgBlowsFt: null, avgBlowsM: null, primaryUnit: normalizedUnit };
  }

  try {
    const arr: (number | null)[] = JSON.parse(penetrationBlowsJson);
    const valid = arr.filter((x): x is number => typeof x === 'number' && x > 0);

    if (valid.length === 0) {
      return { avgBlowsFt: null, avgBlowsM: null, primaryUnit: normalizedUnit };
    }

    const rawAvg = valid.reduce((a, b) => a + b, 0) / valid.length;

    if (normalizedUnit === 'FEET') {
      const avgBlowsFt = Math.round(rawAvg);
      const avgBlowsM = Math.round(rawAvg * 3.28084);
      return { avgBlowsFt, avgBlowsM, primaryUnit: normalizedUnit };
    } else {
      const avgBlowsM = Math.round(rawAvg);
      const avgBlowsFt = Math.round(rawAvg / 3.28084);
      return { avgBlowsFt, avgBlowsM, primaryUnit: normalizedUnit };
    }
  } catch {
    return { avgBlowsFt: null, avgBlowsM: null, primaryUnit: normalizedUnit };
  }
}
