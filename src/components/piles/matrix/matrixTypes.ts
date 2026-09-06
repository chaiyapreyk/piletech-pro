export interface PileData {
  id: string;
  pileNo: string;
  gridLine: string;
  building?: string | null;
  status: string;
  criteriaId?: string | null;
  criteria?: {
    id?: string;
    name?: string | null;
    pileType: string;
    safeWorkingLoadT: number;
    targetSet10BlowsCm: number;
    safetyFactor?: number;
    hammerWeightT?: number;
    dropHeightCm?: number;
    pileWeightT?: number | null;
    cushionCoeffE?: number;
    tempCompressionC?: number;
    hammerEfficiency?: number | null;
    concreteStrengthKsc?: number | null;
    elasticModulusKsc?: number | null;
    pileSectionAreaCm2?: number | null;
    pileLengthM?: number | null;
  } | null;
  drivingRecord?: {
    id: string;
    penetrationBlows?: string | null;
    recordUnit?: string;
    recordScope?: string;
    windowLengthFt?: number | null;
    measuredLast10Cm: number;
    measuredTempCCm?: number | null;
    drivenLengthM: number;
    totalPileLengthM?: number | null;
    stickUpLengthM?: number | null;
    cutOffLevelM?: number | null;
    groundLevelM?: number | null;
    tipLevelM?: number | null;
    isSetPassed: boolean;
    inspectorName?: string | null;
    notes?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  } | null;
  qcInspection?: {
    id: string;
    netDeviationCm: number | null;
    deviationStatus: string;
    deltaXCm?: number | null;
    deltaYCm?: number | null;
    isPlumbnessPassed?: boolean;
    jointWeldStatus?: string | null;
    headDamageStatus?: string | null;
    inspectorName?: string | null;
    approvedByCM?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  } | null;
}

export interface ProjectCriteriaOption {
  id: string;
  name?: string | null;
  pileType: string;
  safeWorkingLoadT: number;
  targetSet10BlowsCm: number;
  dropHeightCm?: number;
  hammerWeightT?: number;
}

export function getPileStatusStyle(pile: PileData) {
  const isDriven = !!pile.drivingRecord;
  const isPassed = pile.drivingRecord?.isSetPassed === true;
  const isFailed = isDriven && !isPassed;

  if (isFailed) {
    return {
      container: 'bg-rose-500 border-rose-600 text-white shadow-xs hover:bg-rose-600 ring-2 ring-rose-400',
      badge: 'bg-rose-700 text-white',
      text: 'Re-drive',
    };
  }
  if (isPassed) {
    return {
      container: 'bg-emerald-600 border-emerald-700 text-white shadow-xs hover:bg-emerald-700',
      badge: 'bg-emerald-800 text-white',
      text: pile.drivingRecord?.measuredLast10Cm ? `${pile.drivingRecord.measuredLast10Cm}cm` : 'ผ่าน',
    };
  }
  return {
    container: 'bg-white border-slate-300 text-slate-800 hover:border-slate-500 hover:bg-slate-50',
    badge: 'bg-slate-100 text-slate-500',
    text: 'รอตอก',
  };
}
