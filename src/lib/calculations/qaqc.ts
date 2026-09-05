/**
 * QA/QC Tolerance & Deviation Evaluation Engine for Foundation Piles
 */

export interface DeviationThresholds {
  normalThresholdCm: number;   // default 5.0 cm
  criticalThresholdCm: number; // default 10.0 cm
}

export type DeviationStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type QCStatus = 'PASS' | 'WARNING' | 'CRITICAL';
export type JointStatus = 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
export type HeadDamageStatus = 'NONE' | 'MINOR' | 'SEVERE';

export interface DeviationInput {
  designX?: number;
  designY?: number;
  actualX?: number;
  actualY?: number;
  isMeters?: boolean;
  deltaXCm?: number;
  deltaYCm?: number;
}

export interface DeviationResult {
  deltaXCm: number;
  deltaYCm: number;
  netDeviationCm: number;
  status: DeviationStatus;
  description: string;
  actionRequired: string;
}

export interface PlumbnessResult {
  plumbnessXPercent: number;
  plumbnessYPercent: number;
  maxAllowedPercent: number;
  isPassed: boolean;
  failedAxis?: 'X' | 'Y' | 'BOTH';
  ratioText: string;
}

export interface QACheckInput {
  deviationStatus: DeviationStatus;
  isPlumbnessPassed: boolean;
  jointWeldStatus: JointStatus;
  headDamageStatus: HeadDamageStatus;
}

export interface OverallQCResult {
  overallStatus: QCStatus;
  summary: string;
  issues: string[];
}

export const DEFAULT_THRESHOLDS: DeviationThresholds = {
  normalThresholdCm: 5.0,
  criticalThresholdCm: 10.0,
};

/**
 * Calculates net deviation and assigns engineering triage status
 */
export function calculateDeviation(
  input: DeviationInput,
  thresholds: DeviationThresholds = DEFAULT_THRESHOLDS
): DeviationResult {
  let deltaXCm = 0;
  let deltaYCm = 0;

  if (input.deltaXCm !== undefined && input.deltaYCm !== undefined) {
    deltaXCm = Math.abs(input.deltaXCm);
    deltaYCm = Math.abs(input.deltaYCm);
  } else if (
    input.designX !== undefined &&
    input.designY !== undefined &&
    input.actualX !== undefined &&
    input.actualY !== undefined
  ) {
    const scale = input.isMeters ? 100 : 1;
    deltaXCm = Math.abs(input.actualX - input.designX) * scale;
    deltaYCm = Math.abs(input.actualY - input.designY) * scale;
  }

  const netDeviationCm = Math.sqrt(Math.pow(deltaXCm, 2) + Math.pow(deltaYCm, 2));

  let status: DeviationStatus = 'NORMAL';
  let description = 'Within acceptable design tolerances (<= 5 cm).';
  let actionRequired = 'Standard construction approval.';

  if (netDeviationCm > thresholds.criticalThresholdCm) {
    status = 'CRITICAL';
    description = `Critical eccentricity of ${netDeviationCm.toFixed(1)} cm exceeds critical threshold of ${thresholds.criticalThresholdCm} cm.`;
    actionRequired = 'Urgent: Structural engineer review required. Remedial pile or enlarged footing redesign likely needed.';
  } else if (netDeviationCm > thresholds.normalThresholdCm) {
    status = 'WARNING';
    description = `Warning: Eccentricity of ${netDeviationCm.toFixed(1)} cm exceeds normal tolerance of ${thresholds.normalThresholdCm} cm.`;
    actionRequired = 'Structural engineer calculation required to verify additional footing moment & shear capacity.';
  }

  return {
    deltaXCm: Number(deltaXCm.toFixed(2)),
    deltaYCm: Number(deltaYCm.toFixed(2)),
    netDeviationCm: Number(netDeviationCm.toFixed(2)),
    status,
    description,
    actionRequired,
  };
}

/**
 * Evaluates pile plumbness (verticality)
 */
export function evaluatePlumbness(
  plumbnessXPercent: number,
  plumbnessYPercent: number,
  maxAllowedPercent: number = 1.0 // 1:100 = 1%
): PlumbnessResult {
  const absX = Math.abs(plumbnessXPercent);
  const absY = Math.abs(plumbnessYPercent);

  const passedX = absX <= maxAllowedPercent;
  const passedY = absY <= maxAllowedPercent;
  const isPassed = passedX && passedY;

  let failedAxis: 'X' | 'Y' | 'BOTH' | undefined = undefined;
  if (!passedX && !passedY) failedAxis = 'BOTH';
  else if (!passedX) failedAxis = 'X';
  else if (!passedY) failedAxis = 'Y';

  const maxVal = Math.max(absX, absY);
  const ratio = maxVal > 0 ? `1:${Math.round(100 / maxVal)}` : '1:inf';

  return {
    plumbnessXPercent: absX,
    plumbnessYPercent: absY,
    maxAllowedPercent,
    isPassed,
    failedAxis,
    ratioText: ratio,
  };
}

/**
 * Evaluates overall QA/QC status combining deviation, plumbness, joints, and spalling
 */
export function evaluateOverallQC(input: QACheckInput): OverallQCResult {
  const issues: string[] = [];

  if (input.deviationStatus === 'CRITICAL') {
    issues.push('Critical pile eccentricity exceeding limit');
  } else if (input.deviationStatus === 'WARNING') {
    issues.push('Pile eccentricity exceeds 5cm normal limit');
  }

  if (!input.isPlumbnessPassed) {
    issues.push('Pile verticality / plumbness exceeds allowable 1%');
  }

  if (input.jointWeldStatus === 'FAIL') {
    issues.push('Splice joint weld inspection failed');
  }

  if (input.headDamageStatus === 'SEVERE') {
    issues.push('Severe concrete spalling or structural damage at pile head');
  } else if (input.headDamageStatus === 'MINOR') {
    issues.push('Minor hairline cracks observed at pile head');
  }

  let overallStatus: QCStatus = 'PASS';
  let summary = 'Pile passed all standard QA/QC checks.';

  if (
    input.deviationStatus === 'CRITICAL' ||
    !input.isPlumbnessPassed ||
    input.jointWeldStatus === 'FAIL' ||
    input.headDamageStatus === 'SEVERE'
  ) {
    overallStatus = 'CRITICAL';
    summary = 'QA/QC rejection: Critical non-conformances detected. Action required before casting footing.';
  } else if (input.deviationStatus === 'WARNING' || input.headDamageStatus === 'MINOR') {
    overallStatus = 'WARNING';
    summary = 'QA/QC warning: Minor non-conformances require structural review or superficial repair.';
  }

  return {
    overallStatus,
    summary,
    issues,
  };
}
