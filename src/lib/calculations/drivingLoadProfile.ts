import {
  calculateBearingCapacityFromSet,
  calculateHiley,
  type HileyInput,
} from './hiley';

export interface LoadProfileIntervalPoint {
  intervalIndex: number; // 0-indexed
  depthDisplay: number; // e.g. 1, 2, 3 (ft or m)
  depthDisplayUnit: 'ft' | 'm';
  cumulativePenetrationM: number; // in meters at end of interval
  actualDepthM?: number; // actual depth from ground level in meters
  elevationM: number | null; // GL - cumulativePenetrationM (if GL available)
  recordedBlows: number | null; // null if skipped, invalid, or 0
  setCmPerBlow: number | null; // cm per blow
  estimatedUltimateLoadT: number | null; // dynamic Ru (tons)
  estimatedSafeWorkingLoadT: number | null; // Ru / criteria.safetyFactor
  compressionSource: 'MEASURED' | 'CRITERIA' | 'NONE';
  compressionUsedCm: number | null;
}

export interface FsReferenceLine {
  factor: number; // 2.5, 3.0, 3.5, 4.0
  ultimateLoadT: number; // SWL * factor
  label: string; // e.g. "FS 3.0 · 105 t"
}

export interface TargetBlowsLine {
  targetBlows: number; // e.g. 41
  targetSet10Cm: number; // e.g. 7.44
  unit: 'Blow/ft' | 'Blow/m';
  label: string; // e.g. "Refusal ≥ 41"
  pdfLabel: string; // e.g. "Refusal >= 41"
  fullLabel: string; // e.g. "Refusal ≥ 41 Blow/ft"
}

export interface ElevationMarkers {
  groundLevelM: number | null;
  cutOffLevelM: number | null;
  tipLevelM: number | null;
  derivedTipLevelM: number | null;
  isTipDerived: boolean;
  effectiveTipLevelM: number | null;
}

export interface MissingCriteriaValidation {
  isCriteriaValid: boolean;
  missingFields: string[];
  criteriaName?: string | null;
}

export interface DrivingCriteriaInput {
  id?: string;
  name?: string | null;
  pileType?: string | null;
  safeWorkingLoadT?: number | null;
  safetyFactor?: number | null;
  hammerWeightT?: number | null;
  dropHeightCm?: number | null;
  pileWeightT?: number | null;
  cushionCoeffE?: number | null;
  tempCompressionC?: number | null;
  hammerEfficiency?: number | null;
  concreteStrengthKsc?: number | null;
  elasticModulusKsc?: number | null;
  pileSectionAreaCm2?: number | null;
  pileLengthM?: number | null;
  targetSet10BlowsCm?: number | null;
}

export interface DrivingRecordInput {
  penetrationBlows?: string | null; // JSON array string
  recordUnit?: string | null; // "FEET" | "METER"
  recordScope?: string | null; // "FULL" | "WINDOW" | "LAST_N"
  windowLengthFt?: number | null;
  measuredTempCCm?: number | null;
  drivenLengthM?: number | null;
  groundLevelM?: number | null;
  cutOffLevelM?: number | null;
  tipLevelM?: number | null;
}

export interface DrivingLoadProfileResult {
  recordUnit: 'FEET' | 'METER';
  recordScope: 'FULL' | 'WINDOW';
  isWindowScope: boolean;
  points: LoadProfileIntervalPoint[];
  fsLines: FsReferenceLine[];
  targetBlowsLine: TargetBlowsLine | null;
  elevations: ElevationMarkers;
  validation: MissingCriteriaValidation;
  maxBlows: number;
  maxLoadT: number;
  minElevationM: number | null;
  maxElevationM: number | null;
  hasValidLoadPoints: boolean;
  criteriaSummary?: {
    name: string;
    pileType: string;
    safeWorkingLoadT: number;
    safetyFactor: number;
    hammerWeightT: number;
    dropHeightCm: number;
    tempCompressionC: number;
    pileWeightT?: number | null;
  } | null;
}

/**
 * Parses penetration blows from JSON string or returns an empty array.
 */
export function parsePenetrationBlows(rawBlows?: string | null): (number | null)[] {
  if (!rawBlows) return [];
  try {
    const parsed = JSON.parse(rawBlows);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (item === null || item === undefined || item === '') return null;
      const num = Number(item);
      return !isNaN(num) && num > 0 ? num : null;
    });
  } catch {
    return [];
  }
}

/**
 * Calculates penetration set in cm per blow.
 * FEET: 1 foot = 30.48 cm -> S = 30.48 / N
 * METER: 1 meter = 100 cm -> S = 100 / N
 */
export function calculatePenetrationSet(blows: number, recordUnit: 'FEET' | 'METER'): number {
  if (!blows || blows <= 0 || !isFinite(blows)) return 0;
  return recordUnit === 'FEET' ? 30.48 / blows : 100 / blows;
}

/**
 * Formats an elevation value in meters with appropriate +/- sign (e.g. "+3.00 m", "-18.00 m", "0.00 m").
 * Avoids broken display like "+-18.00 m".
 */
export function formatElevation(elev: number | null | undefined): string {
  if (elev === null || elev === undefined || isNaN(Number(elev))) return '-';
  const num = Number(elev);
  if (num > 0) return `+${num.toFixed(2)} m`;
  if (num < 0) return `${num.toFixed(2)} m`;
  return `0.00 m`;
}

/**
 * Validates whether the assigned driving criteria has all required fields for Hiley calculation.
 */
export function validateDrivingCriteria(criteria?: DrivingCriteriaInput | null): MissingCriteriaValidation {
  const missingFields: string[] = [];
  if (!criteria) {
    return {
      isCriteriaValid: false,
      missingFields: [
        'safeWorkingLoadT (น้ำหนักปลอดภัย Ra)',
        'hammerWeightT (น้ำหนักลูกตุ้ม W)',
        'dropHeightCm (ระยะตก H)',
        'tempCompressionC (การยุบตัวชั่วคราว C)',
      ],
      criteriaName: null,
    };
  }

  if (!criteria.safeWorkingLoadT || criteria.safeWorkingLoadT <= 0) {
    missingFields.push('safeWorkingLoadT (น้ำหนักปลอดภัย Ra)');
  }
  if (!criteria.hammerWeightT || criteria.hammerWeightT <= 0) {
    missingFields.push('hammerWeightT (น้ำหนักลูกตุ้ม W)');
  }
  if (!criteria.dropHeightCm || criteria.dropHeightCm <= 0) {
    missingFields.push('dropHeightCm (ระยะตก H)');
  }
  if (
    criteria.tempCompressionC === undefined ||
    criteria.tempCompressionC === null ||
    criteria.tempCompressionC < 0
  ) {
    missingFields.push('tempCompressionC (การยุบตัวชั่วคราว C)');
  }

  return {
    isCriteriaValid: missingFields.length === 0,
    missingFields,
    criteriaName: criteria.name || criteria.pileType || null,
  };
}

/**
 * Pure adapter calculating the entire Driving Load Profile and elevation markers.
 */
export function calculateDrivingLoadProfile(
  record?: DrivingRecordInput | null,
  criteria?: DrivingCriteriaInput | null
): DrivingLoadProfileResult {
  const recordUnit: 'FEET' | 'METER' =
    record?.recordUnit?.toUpperCase() === 'METER' ? 'METER' : 'FEET';
  const rawBlows = parsePenetrationBlows(record?.penetrationBlows);

  // 1. Validation
  const validation = validateDrivingCriteria(criteria);

  // 2. Elevation markers
  const gl = record?.groundLevelM !== undefined && record?.groundLevelM !== null ? Number(record.groundLevelM) : null;
  const col = record?.cutOffLevelM !== undefined && record?.cutOffLevelM !== null ? Number(record.cutOffLevelM) : null;
  const storedTip = record?.tipLevelM !== undefined && record?.tipLevelM !== null ? Number(record.tipLevelM) : null;

  let derivedTip: number | null = null;
  let isTipDerived = false;

  if (storedTip !== null) {
    isTipDerived = false;
  } else if (gl !== null && record?.drivenLengthM !== undefined && record?.drivenLengthM !== null && Number(record.drivenLengthM) > 0) {
    derivedTip = Number((gl - Number(record.drivenLengthM)).toFixed(3));
    isTipDerived = true;
  }

  const effectiveTip = storedTip !== null ? storedTip : derivedTip;

  const elevations: ElevationMarkers = {
    groundLevelM: gl,
    cutOffLevelM: col,
    tipLevelM: storedTip,
    derivedTipLevelM: derivedTip,
    isTipDerived,
    effectiveTipLevelM: effectiveTip,
  };

  // 3. FS Reference lines
  const fsLines: FsReferenceLine[] = [];
  if (validation.isCriteriaValid && criteria?.safeWorkingLoadT && criteria.safeWorkingLoadT > 0) {
    const swl = criteria.safeWorkingLoadT;
    const fsFactors = [2.5, 3.0, 3.5, 4.0];
    fsFactors.forEach((factor) => {
      const ultimateLoadT = Number((swl * factor).toFixed(1));
      fsLines.push({
        factor,
        ultimateLoadT,
        label: `FS ${factor.toFixed(1)} · ${ultimateLoadT} t`,
      });
    });
  }

  // 4. Temporary compression precedence
  const measuredC =
    record?.measuredTempCCm !== undefined &&
    record?.measuredTempCCm !== null &&
    Number(record.measuredTempCCm) > 0
      ? Number(record.measuredTempCCm)
      : null;

  let compressionSource: 'MEASURED' | 'CRITERIA' | 'NONE' = 'NONE';
  let compressionUsedCm: number | null = null;

  if (measuredC !== null) {
    compressionSource = 'MEASURED';
    compressionUsedCm = measuredC;
  } else if (
    criteria?.tempCompressionC !== undefined &&
    criteria?.tempCompressionC !== null &&
    criteria.tempCompressionC >= 0
  ) {
    compressionSource = 'CRITERIA';
    compressionUsedCm = criteria.tempCompressionC;
  }

  // 5. Setup Hiley Input if criteria is valid
  let hileyInput: HileyInput | null = null;
  if (validation.isCriteriaValid && criteria && compressionUsedCm !== null) {
    hileyInput = {
      safeWorkingLoadTons: criteria.safeWorkingLoadT || 30,
      safetyFactor: criteria.safetyFactor || 2.5,
      hammerWeightTons: criteria.hammerWeightT || 4.0,
      dropHeightCm: criteria.dropHeightCm || 40,
      pileWeightTons: criteria.pileWeightT || 1.8,
      restitutionCoeff: criteria.cushionCoeffE ?? 0.25,
      tempCompressionCm: compressionUsedCm,
      hammerEfficiency: criteria.hammerEfficiency ?? undefined,
      concreteStrengthKsc: criteria.concreteStrengthKsc ?? undefined,
      elasticModulusKsc: criteria.elasticModulusKsc ?? undefined,
      pileSectionAreaCm2: criteria.pileSectionAreaCm2 ?? undefined,
      pileLengthM: criteria.pileLengthM ?? undefined,
    };
  }

  // 5.1 Calculate Target Blows / Stopping Criteria line (Refusal Line)
  let targetBlowsLine: TargetBlowsLine | null = null;
  let targetSet10Cm: number | null = null;

  if (criteria?.targetSet10BlowsCm && Number(criteria.targetSet10BlowsCm) > 0) {
    targetSet10Cm = Number(criteria.targetSet10BlowsCm);
  } else if (hileyInput) {
    const nominalHiley = calculateHiley(hileyInput);
    if (nominalHiley.status === 'VALID' && nominalHiley.targetSet10BlowsCm > 0) {
      targetSet10Cm = nominalHiley.targetSet10BlowsCm;
    }
  }

  if (targetSet10Cm !== null && targetSet10Cm > 0) {
    const isFt = recordUnit === 'FEET';
    const targetBlows = isFt
      ? Math.round(304.8 / targetSet10Cm)
      : Math.round(1000 / targetSet10Cm);
    const unitLabel = isFt ? 'Blow/ft' : 'Blow/m';

    if (targetBlows > 0 && isFinite(targetBlows)) {
      targetBlowsLine = {
        targetBlows,
        targetSet10Cm: Number(targetSet10Cm.toFixed(2)),
        unit: unitLabel,
        label: `Refusal ≥ ${targetBlows}`,
        pdfLabel: `Refusal >= ${targetBlows}`,
        fullLabel: `Refusal ≥ ${targetBlows} ${unitLabel}`,
      };
    }
  }

  // 6. Calculate interval points
  const points: LoadProfileIntervalPoint[] = [];
  let maxBlows = 0;
  let maxLoadT = 0;
  let hasValidLoadPoints = false;

  const rawScope = record?.recordScope?.toUpperCase()?.trim();
  const isExplicitWindow = rawScope === 'WINDOW' || rawScope === 'LAST_N';
  const isExplicitFull = rawScope === 'FULL';

  const drivenLengthM =
    record?.drivenLengthM !== undefined &&
    record?.drivenLengthM !== null &&
    Number(record.drivenLengthM) > 0
      ? Number(record.drivenLengthM)
      : null;

  const totalRawCount = rawBlows.length;

  // Depth Interval Step:
  // When recordUnit is FEET, each interval is recorded per foot (0.3048 m ~ 30 cm).
  // When recordUnit is METER, each interval is recorded per meter (1.0 m).
  const depthIntervalStepM = recordUnit === 'METER' ? 1.0 : 0.3048;
  const initialRecordedSpanM = totalRawCount * depthIntervalStepM;

  // Smart Scope Resolution:
  // If explicitly WINDOW, or if record is NOT explicitly FULL and total recorded depth is <= 75% of driven length
  // (e.g. last 20 ft recorded out of 21m pile without explicit scope tag), anchor the curve directly to the pile tip level.
  const isWindowScope =
    isExplicitWindow ||
    (!isExplicitFull &&
      drivenLengthM !== null &&
      initialRecordedSpanM > 0 &&
      initialRecordedSpanM <= drivenLengthM * 0.75);

  const resolvedScope: 'FULL' | 'WINDOW' = isWindowScope ? 'WINDOW' : 'FULL';

  rawBlows.forEach((blows, idx) => {
    const intervalIndex = idx;
    const depthDisplay = idx + 1;

    let cumulativePenetrationM: number;
    let elevationM: number | null = null;
    let actualDepthM: number | undefined = undefined;

    if (isWindowScope && drivenLengthM !== null) {
      // In WINDOW mode, the final recorded interval (idx = totalRawCount - 1) reaches drivenLengthM (effectiveTip).
      // Each preceding interval is depthIntervalStepM higher.
      const remainingIntervalsToTip = totalRawCount - 1 - idx;
      cumulativePenetrationM = Number(
        (drivenLengthM - remainingIntervalsToTip * depthIntervalStepM).toFixed(4)
      );
      actualDepthM = cumulativePenetrationM;

      if (effectiveTip !== null) {
        elevationM = Number(
          (effectiveTip + remainingIntervalsToTip * depthIntervalStepM).toFixed(3)
        );
      } else if (gl !== null) {
        elevationM = Number((gl - cumulativePenetrationM).toFixed(3));
      }
    } else {
      // FULL mode (starts from ground surface downwards)
      cumulativePenetrationM = Number(((idx + 1) * depthIntervalStepM).toFixed(4));
      actualDepthM = cumulativePenetrationM;
      elevationM = gl !== null ? Number((gl - cumulativePenetrationM).toFixed(3)) : null;
    }

    let setCmPerBlow: number | null = null;
    let estimatedUltimateLoadT: number | null = null;
    let estimatedSafeWorkingLoadT: number | null = null;

    if (blows !== null && blows > 0) {
      if (blows > maxBlows) maxBlows = blows;
      setCmPerBlow = calculatePenetrationSet(blows, recordUnit);

      if (hileyInput && setCmPerBlow > 0) {
        // Equivalent to 10 blows for hiley engine calculation
        const set10Cm = setCmPerBlow * 10;
        const capResult = calculateBearingCapacityFromSet(
          hileyInput,
          set10Cm,
          compressionUsedCm ?? undefined
        );
        if (capResult.ultimateCapacityTons > 0 && isFinite(capResult.ultimateCapacityTons)) {
          estimatedUltimateLoadT = Number(capResult.ultimateCapacityTons.toFixed(1));
          estimatedSafeWorkingLoadT = Number(capResult.safeWorkingLoadTons.toFixed(1));
          if (estimatedUltimateLoadT > maxLoadT) {
            maxLoadT = estimatedUltimateLoadT;
          }
          hasValidLoadPoints = true;
        }
      }
    }

    points.push({
      intervalIndex,
      depthDisplay,
      depthDisplayUnit: depthIntervalStepM === 1.0 ? 'm' : 'ft',
      cumulativePenetrationM,
      actualDepthM,
      elevationM,
      recordedBlows: blows,
      setCmPerBlow: setCmPerBlow !== null ? Number(setCmPerBlow.toFixed(4)) : null,
      estimatedUltimateLoadT,
      estimatedSafeWorkingLoadT,
      compressionSource: estimatedUltimateLoadT !== null ? compressionSource : 'NONE',
      compressionUsedCm: estimatedUltimateLoadT !== null ? compressionUsedCm : null,
    });
  });

  // Calculate elevation boundaries for chart domain
  const elevationsList: number[] = [];
  if (gl !== null) elevationsList.push(gl);
  if (col !== null) elevationsList.push(col);
  if (effectiveTip !== null) elevationsList.push(effectiveTip);
  points.forEach((p) => {
    if (p.elevationM !== null) elevationsList.push(p.elevationM);
  });

  const minElevationM = elevationsList.length > 0 ? Math.min(...elevationsList) : null;
  const maxElevationM = elevationsList.length > 0 ? Math.max(...elevationsList) : null;

  // Account for FS lines in maxLoadT domain
  fsLines.forEach((line) => {
    if (line.ultimateLoadT > maxLoadT) {
      maxLoadT = line.ultimateLoadT;
    }
  });

  const criteriaSummary = criteria && criteria.safeWorkingLoadT
    ? {
        name: criteria.name || 'มาตรฐานโครงการ',
        pileType: criteria.pileType || 'คอนกรีตอัดแรง',
        safeWorkingLoadT: criteria.safeWorkingLoadT,
        safetyFactor: criteria.safetyFactor || 2.5,
        hammerWeightT: criteria.hammerWeightT || 4.0,
        dropHeightCm: criteria.dropHeightCm || 40,
        tempCompressionC: compressionUsedCm ?? (criteria.tempCompressionC || 1.2),
        pileWeightT: criteria.pileWeightT || 1.8,
      }
    : null;

  return {
    recordUnit,
    recordScope: resolvedScope,
    isWindowScope,
    points,
    fsLines,
    targetBlowsLine,
    elevations,
    validation,
    maxBlows: Math.max(maxBlows, targetBlowsLine ? targetBlowsLine.targetBlows : 0, 30),
    maxLoadT: Math.max(maxLoadT, 50),
    minElevationM,
    maxElevationM,
    hasValidLoadPoints,
    criteriaSummary,
  };
}
