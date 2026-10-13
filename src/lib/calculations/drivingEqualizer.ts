/**
 * Geotechnical Soil Strata & Equalizer Blow-Count Utilities
 */

export type SoilStrataCategory = 'SKIPPED' | 'SOFT' | 'MEDIUM' | 'HARD' | 'REFUSAL';

export interface SoilStrataInfo {
  category: SoilStrataCategory;
  label: string;
  colorClass: string;
  badgeBg: string;
}

/**
 * Clamps blow count to standard 1 - 100 range for Equalizer Faders, preserving null (skipped).
 */
export function clampEqualizerBlowValue(value: number | null): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(100, Math.round(value)));
}

/**
 * Classifies soil strata hardness from penetration blow count.
 */
export function getSoilStrataByBlows(blows: number | null): SoilStrataInfo {
  if (blows === null) {
    return {
      category: 'SKIPPED',
      label: 'ข้าม / Skipped',
      colorClass: 'text-slate-400',
      badgeBg: 'bg-slate-700 text-slate-300',
    };
  }

  if (blows < 15) {
    return {
      category: 'SOFT',
      label: 'ดินอ่อน (Soft Soil)',
      colorClass: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    };
  }

  if (blows <= 40) {
    return {
      category: 'MEDIUM',
      label: 'ดินปานกลาง (Medium)',
      colorClass: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };
  }

  if (blows <= 70) {
    return {
      category: 'HARD',
      label: 'ดินแน่น (Hard Strata)',
      colorClass: 'text-orange-400',
      badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    };
  }

  return {
    category: 'REFUSAL',
    label: 'แน่นจัด / ดาน (Refusal)',
    colorClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };
}

/**
 * Generates preset equalizer curves (e.g. flat curve, linear step-up penetration curve, or clear to zero/null).
 */
export function applyPresetCurve(
  curveType: 'FLAT' | 'STEP_UP' | 'CLEAR_ZERO',
  count: number,
  startVal: number = 20,
  endVal: number = 40
): (number | null)[] {
  if (count <= 0) return [];
  if (curveType === 'CLEAR_ZERO') {
    return Array.from({ length: count }, () => null);
  }
  if (curveType === 'FLAT') {
    return Array.from({ length: count }, () => clampEqualizerBlowValue(startVal));
  }

  if (count === 1) {
    return [clampEqualizerBlowValue(startVal)];
  }

  const step = (endVal - startVal) / (count - 1);
  return Array.from({ length: count }, (_, i) => clampEqualizerBlowValue(startVal + i * step));
}

/**
 * Ensures the blow counts array has at least minCount elements.
 * Unfilled intervals default to null (N/A / Skipped).
 */
export function ensureMinimumIntervals(
  blows: (number | null)[] | undefined | null,
  minCount: number = 20
): (number | null)[] {
  const current = Array.isArray(blows) ? [...blows] : [];
  if (current.length >= minCount) return current;
  const padding = Array.from({ length: minCount - current.length }, () => null);
  return [...current, ...padding];
}
