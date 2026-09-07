/**
 * Geotechnical Pile Geometry & Elevation Engineering Engine
 * 
 * Computes geotechnical depths, elevations (GL, COL, Tip Level, Top Level),
 * cut-off waste, and follower/dolly adjustments relative to MSL datum.
 */

export interface PileGeometryInput {
  totalPileLengthM: number;
  stickUpLengthM: number;
  groundLevelM?: number | null;
  cutOffLevelM?: number | null;
}

export interface PileGeometryFormatted {
  drivenDepth: string;
  tipLevel: string;
  actualTopLevel: string;
  cutOffWaste: string;
  groundLevel: string;
  cutOffLevel: string;
}

export interface PileGeometryResult {
  drivenDepthM: number;
  tipLevelM: number | null;
  actualTopLevelM: number | null;
  cutOffWasteM: number | null;
  isFollowerDriven: boolean;
  followerDepthM: number;
  isTipDerived: boolean;
  formatted: PileGeometryFormatted;
}

/**
 * Formats an elevation value in meters with appropriate +/- sign (e.g. "+3.00 m", "-18.00 m", "0.00 m").
 * Avoids broken display like "+-18.00 m" or "NaN".
 */
export function formatElevation(elev: number | null | undefined): string {
  if (elev === null || elev === undefined || isNaN(Number(elev))) return '-';
  const num = Number(elev);
  if (num > 0) return `+${num.toFixed(2)} m`;
  if (num < 0) return `${num.toFixed(2)} m`;
  return `0.00 m`;
}

/**
 * Formats a metric length in meters (e.g. "20.50 m").
 */
export function formatLength(len: number | null | undefined): string {
  if (len === null || len === undefined || isNaN(Number(len))) return '-';
  return `${Number(len).toFixed(2)} m`;
}

/**
 * Computes derived geotechnical depths, elevations, and cut-off waste from pile length and stick-up.
 */
export function calculateDerivedGeometry(input: PileGeometryInput): PileGeometryResult {
  const totalLength = Number(input.totalPileLengthM) || 0;
  const stickUp = Number(input.stickUpLengthM) || 0;

  const gl =
    input.groundLevelM !== undefined && input.groundLevelM !== null && !isNaN(Number(input.groundLevelM))
      ? Number(input.groundLevelM)
      : null;

  const col =
    input.cutOffLevelM !== undefined && input.cutOffLevelM !== null && !isNaN(Number(input.cutOffLevelM))
      ? Number(input.cutOffLevelM)
      : null;

  // Driven depth in soil = L_pile - h_stick
  const drivenDepthM = Number((totalLength - stickUp).toFixed(2));

  // Follower driving detected if stickUp is negative (pile head below ground level)
  const isFollowerDriven = stickUp < 0;
  const followerDepthM = isFollowerDriven ? Math.abs(stickUp) : 0;

  // Tip level = GL - drivenDepth
  const tipLevelM = gl !== null ? Number((gl - drivenDepthM).toFixed(2)) : null;

  // Actual top of pile level before cut-off = GL + h_stick
  const actualTopLevelM = gl !== null ? Number((gl + stickUp).toFixed(2)) : null;

  // Cut-off waste length = Actual Top Level - COL
  const cutOffWasteM =
    actualTopLevelM !== null && col !== null
      ? Number((actualTopLevelM - col).toFixed(2))
      : null;

  return {
    drivenDepthM,
    tipLevelM,
    actualTopLevelM,
    cutOffWasteM,
    isFollowerDriven,
    followerDepthM,
    isTipDerived: true,
    formatted: {
      drivenDepth: formatLength(drivenDepthM),
      tipLevel: formatElevation(tipLevelM),
      actualTopLevel: formatElevation(actualTopLevelM),
      cutOffWaste: formatLength(cutOffWasteM),
      groundLevel: formatElevation(gl),
      cutOffLevel: formatElevation(col),
    },
  };
}

/**
 * Applies a manual tip level override (e.g. from surveyor instrument)
 * and reconciles the active driven depth and formatting accordingly.
 */
export function applyManualTipOverride(
  derived: PileGeometryResult,
  manualTipLevelM: number,
  groundLevelM?: number | null
): PileGeometryResult {
  const manualTip = Number(manualTipLevelM) || 0;

  const gl =
    groundLevelM !== undefined && groundLevelM !== null && !isNaN(Number(groundLevelM))
      ? Number(groundLevelM)
      : null;

  const adjustedDrivenDepth = gl !== null ? Number((gl - manualTip).toFixed(2)) : derived.drivenDepthM;

  return {
    ...derived,
    drivenDepthM: adjustedDrivenDepth,
    tipLevelM: manualTip,
    isTipDerived: false,
    formatted: {
      ...derived.formatted,
      drivenDepth: formatLength(adjustedDrivenDepth),
      tipLevel: formatElevation(manualTip),
    },
  };
}
