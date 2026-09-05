/**
 * Hiley's Dynamic Pile Driving Formula Engine
 * 
 * Formula:
 *   Ru = (eta * W * H) / (S + C / 2)
 *   Ra = Ru / FS
 * 
 * Where:
 *   Ru = Ultimate bearing capacity (tons)
 *   Ra = Safe working load (SWL) (tons)
 *   FS = Factor of Safety (usually 2.5 or 3.0)
 *   W  = Weight of ram/hammer (tons)
 *   H  = Height of fall / stroke (cm)
 *   P  = Weight of pile + helmet/anvil (tons)
 *   e  = Coefficient of restitution of cushion/packing
 *   C  = Total temporary elastic compression (cm)
 *   S  = Set per blow (cm)
 *   eta = Hammer impact efficiency
 */

export interface HileyInput {
  safeWorkingLoadTons: number; // Required Safe Working Load (Ra) in tons
  safetyFactor: number;        // Factor of safety (FS, default 2.5)
  hammerWeightTons: number;    // Ram/Hammer weight (W) in tons
  dropHeightCm: number;        // Drop height (H) in cm
  pileWeightTons: number;      // Pile weight + Cap (P) in tons
  restitutionCoeff: number;    // Restitution coefficient (e)
  tempCompressionCm: number;   // Temporary compression (C) in cm
  hammerEfficiency?: number;   // Optional manual efficiency override
  concreteStrengthKsc?: number; // Concrete compressive strength fc' (ksc), default 350
  elasticModulusKsc?: number;   // Concrete modulus of elasticity Ec (ksc), default 280,000
  pileSectionAreaCm2?: number;  // Pile cross-sectional area (cm2), default 484
  pileLengthM?: number;         // Pile total length (m), default 20.0
}

export const DEFAULT_HILEY_INPUT: Required<HileyInput> = {
  safeWorkingLoadTons: 35,
  safetyFactor: 2.5,
  hammerWeightTons: 4.0,
  dropHeightCm: 40,
  pileWeightTons: 1.8,
  restitutionCoeff: 0.25,
  tempCompressionCm: 1.2,
  hammerEfficiency: 0,
  concreteStrengthKsc: 350,
  elasticModulusKsc: 280000,
  pileSectionAreaCm2: 484,
  pileLengthM: 20.0,
};

export interface HileyResult {
  ultimateCapacityTons: number;
  safeWorkingLoadTons: number;
  hammerEfficiency: number;
  targetSetPerBlowCm: number;
  targetSetPerBlowMm: number;
  targetSet10BlowsCm: number;
  targetSet10BlowsMm: number;
  equivalentBlowsPerFoot: number;  // 30.48 / S_cm (e.g. 45 blows/ft)
  equivalentBlowsPerMeter: number; // 100 / S_cm (e.g. 147 blows/m)
  equivalentBlowsPerInch: number;  // 2.54 / S_cm (e.g. 3.7 blows/in)
  theoreticalC2Cm?: number;        // Theoretical pile shaft elastic compression (cm)
  estimatedPileWeightTons?: number;// Estimated self-weight + cap from area and length (tons)
  status: 'VALID' | 'WARNING_NEGATIVE_SET' | 'INVALID_INPUT';
  message?: string;
}

export interface SetCapacityCheckResult {
  ultimateCapacityTons: number;
  safeWorkingLoadTons: number;
  isSetAchieved: boolean;
  marginPercent: number;
  measuredSet10BlowsCm: number;
  targetSet10BlowsCm: number;
  measuredBlowsPerFoot: number;
  measuredBlowsPerMeter: number;
  targetBlowsPerFoot: number;
}

export interface SensitivityMatrix {
  dropHeights: number[];        // array of H (cm)
  compressions: number[];       // array of C (cm)
  grid: number[][];             // grid[heightIndex][compressionIndex] = target S10 (cm)
  gridBlowsPerFoot: number[][]; // grid[heightIndex][compressionIndex] = equivalent blows/ft
}

export interface StandardPileSection {
  id: string;
  category: 'I-SECTION' | 'SQUARE' | 'SPUN' | 'CUSTOM';
  label: string;
  areaCm2: number;
  dimensionsText: string;
}

export const STANDARD_PILE_SECTIONS: StandardPileSection[] = [
  // I-Section Piles (เสาเข็มรูปตัวไอ)
  { id: 'I_022', category: 'I-SECTION', label: 'I-0.22x0.22 m (เข็มไอ 22)', areaCm2: 360, dimensionsText: '0.22x0.22 m' },
  { id: 'I_026', category: 'I-SECTION', label: 'I-0.26x0.26 m (เข็มไอ 26 - มาตรฐาน)', areaCm2: 484, dimensionsText: '0.26x0.26 m' },
  { id: 'I_030', category: 'I-SECTION', label: 'I-0.30x0.30 m (เข็มไอ 30)', areaCm2: 650, dimensionsText: '0.30x0.30 m' },
  { id: 'I_035', category: 'I-SECTION', label: 'I-0.35x0.35 m (เข็มไอ 35)', areaCm2: 890, dimensionsText: '0.35x0.35 m' },
  { id: 'I_040', category: 'I-SECTION', label: 'I-0.40x0.40 m (เข็มไอ 40)', areaCm2: 1160, dimensionsText: '0.40x0.40 m' },

  // Square Solid Piles (เสาเข็มสี่เหลี่ยมตัน)
  { id: 'SQ_020', category: 'SQUARE', label: 'Square 0.20x0.20 m (สี่เหลี่ยม 20)', areaCm2: 400, dimensionsText: '0.20x0.20 m' },
  { id: 'SQ_025', category: 'SQUARE', label: 'Square 0.25x0.25 m (สี่เหลี่ยม 25)', areaCm2: 625, dimensionsText: '0.25x0.25 m' },
  { id: 'SQ_030', category: 'SQUARE', label: 'Square 0.30x0.30 m (สี่เหลี่ยม 30)', areaCm2: 900, dimensionsText: '0.30x0.30 m' },
  { id: 'SQ_035', category: 'SQUARE', label: 'Square 0.35x0.35 m (สี่เหลี่ยม 35)', areaCm2: 1225, dimensionsText: '0.35x0.35 m' },
  { id: 'SQ_040', category: 'SQUARE', label: 'Square 0.40x0.40 m (สี่เหลี่ยม 40)', areaCm2: 1600, dimensionsText: '0.40x0.40 m' },

  // Spun Hollow Piles (เสาเข็มแรงเหวี่ยงกลวง)
  { id: 'SPUN_030', category: 'SPUN', label: 'Spun Pile Dia 0.30 m (หนา 6.0 cm)', areaCm2: 452, dimensionsText: 'OD 30cm, t 6cm' },
  { id: 'SPUN_035', category: 'SPUN', label: 'Spun Pile Dia 0.35 m (หนา 7.0 cm)', areaCm2: 616, dimensionsText: 'OD 35cm, t 7cm' },
  { id: 'SPUN_040', category: 'SPUN', label: 'Spun Pile Dia 0.40 m (หนา 7.5 cm)', areaCm2: 766, dimensionsText: 'OD 40cm, t 7.5cm' },
  { id: 'SPUN_050', category: 'SPUN', label: 'Spun Pile Dia 0.50 m (หนา 9.0 cm)', areaCm2: 1159, dimensionsText: 'OD 50cm, t 9cm' },
  { id: 'SPUN_060', category: 'SPUN', label: 'Spun Pile Dia 0.60 m (หนา 10.0 cm)', areaCm2: 1571, dimensionsText: 'OD 60cm, t 10cm' },
];

export function getPileSectionById(id: string): StandardPileSection | undefined {
  return STANDARD_PILE_SECTIONS.find((s) => s.id === id);
}

export function findClosestPileSectionByArea(areaCm2: number): StandardPileSection | undefined {
  return STANDARD_PILE_SECTIONS.find((s) => Math.abs(s.areaCm2 - areaCm2) < 5);
}

/**
 * Computes hammer impact efficiency (eta)
 */
export function calculateHammerEfficiency(
  W: number,
  P: number,
  e: number
): number {
  if (W <= 0 || P < 0) return 0;
  
  if (W > e * P) {
    return (W + Math.pow(e, 2) * P) / (W + P);
  } else {
    const term1 = (W + Math.pow(e, 2) * P) / (W + P);
    const term2 = Math.pow((e * P - W) / (W + P), 2);
    return Math.max(0, term1 - term2);
  }
}

/**
 * Calculates target set per blow and target set per 10 blows using Hiley's Formula
 */
export function calculateHiley(input: HileyInput): HileyResult {
  const {
    safeWorkingLoadTons,
    safetyFactor,
    hammerWeightTons,
    dropHeightCm,
    pileWeightTons,
    restitutionCoeff,
    tempCompressionCm,
  } = input;

  if (safeWorkingLoadTons <= 0 || safetyFactor <= 0 || hammerWeightTons <= 0 || dropHeightCm <= 0) {
    return {
      ultimateCapacityTons: 0,
      safeWorkingLoadTons: 0,
      hammerEfficiency: 0,
      targetSetPerBlowCm: 0,
      targetSetPerBlowMm: 0,
      targetSet10BlowsCm: 0,
      targetSet10BlowsMm: 0,
      equivalentBlowsPerFoot: 0,
      equivalentBlowsPerMeter: 0,
      equivalentBlowsPerInch: 0,
      status: 'INVALID_INPUT',
      message: 'Invalid input parameters: values must be greater than zero.',
    };
  }

  const eta = input.hammerEfficiency ?? calculateHammerEfficiency(hammerWeightTons, pileWeightTons, restitutionCoeff);
  const Ru = safeWorkingLoadTons * safetyFactor;
  const energy = eta * hammerWeightTons * dropHeightCm;

  // S = (energy / Ru) - (C / 2)
  const S_cm = (energy / Ru) - (tempCompressionCm / 2);
  const S10_cm = S_cm * 10;

  if (S_cm <= 0) {
    return {
      ultimateCapacityTons: Ru,
      safeWorkingLoadTons,
      hammerEfficiency: eta,
      targetSetPerBlowCm: S_cm,
      targetSetPerBlowMm: S_cm * 10,
      targetSet10BlowsCm: S10_cm,
      targetSet10BlowsMm: S10_cm * 10,
      equivalentBlowsPerFoot: 0,
      equivalentBlowsPerMeter: 0,
      equivalentBlowsPerInch: 0,
      status: 'WARNING_NEGATIVE_SET',
      message: 'Target set is zero or negative. Hammer energy is insufficient for the required safe working load.',
    };
  }

  const equivalentBlowsPerFoot = Math.round(30.48 / S_cm);
  const equivalentBlowsPerMeter = Math.round(100 / S_cm);
  const equivalentBlowsPerInch = Number((2.54 / S_cm).toFixed(1));

  const theoreticalC2Cm = (input.pileLengthM && input.pileSectionAreaCm2 && input.elasticModulusKsc)
    ? Number(calculateShaftCompressionC2(Ru, input.pileLengthM, input.pileSectionAreaCm2, input.elasticModulusKsc).toFixed(2))
    : undefined;

  const estimatedPileWeightTons = (input.pileSectionAreaCm2 && input.pileLengthM)
    ? calculatePileWeightFromDimensions(input.pileSectionAreaCm2, input.pileLengthM)
    : undefined;

  return {
    ultimateCapacityTons: Ru,
    safeWorkingLoadTons,
    hammerEfficiency: eta,
    targetSetPerBlowCm: S_cm,
    targetSetPerBlowMm: S_cm * 10,
    targetSet10BlowsCm: S10_cm,
    targetSet10BlowsMm: S10_cm * 10,
    equivalentBlowsPerFoot,
    equivalentBlowsPerMeter,
    equivalentBlowsPerInch,
    theoreticalC2Cm,
    estimatedPileWeightTons,
    status: 'VALID',
  };
}

/**
 * Calculates concrete elastic modulus (Ec) from compressive strength (fc') in ksc
 * Standard formula: Ec = 15,100 * sqrt(fc')
 */
export function calculateElasticModulus(fcKsc: number): number {
  if (fcKsc <= 0) return 0;
  return Math.round(15100 * Math.sqrt(fcKsc));
}

/**
 * Calculates theoretical pile shaft elastic compression C2 in cm
 * C2 = (Ru * L) / (A * E)
 * where Ru is in kg, L is in cm, A is in cm2, E is in ksc (kg/cm2)
 */
export function calculateShaftCompressionC2(
  RuTons: number,
  lengthM: number,
  areaCm2: number,
  elasticModulusKsc: number
): number {
  if (RuTons <= 0 || lengthM <= 0 || areaCm2 <= 0 || elasticModulusKsc <= 0) return 0;
  const RuKg = RuTons * 1000;
  const lengthCm = lengthM * 100;
  return (RuKg * lengthCm) / (areaCm2 * elasticModulusKsc);
}

/**
 * Calculates estimated pile self-weight + cap in tons
 * Concrete unit weight default = 2.4 t/m3, Driving Cap default = 0.3 tons
 */
export function calculatePileWeightFromDimensions(
  areaCm2: number,
  lengthM: number,
  concreteUnitWeightTonsM3: number = 2.4,
  capWeightTons: number = 0.3
): number {
  if (areaCm2 <= 0 || lengthM <= 0) return 0;
  const pileVolumeM3 = (areaCm2 / 10000) * lengthM;
  const pileWeightTons = pileVolumeM3 * concreteUnitWeightTonsM3;
  return Number((pileWeightTons + capWeightTons).toFixed(2));
}

/**
 * Calculates allowable safe capacity (Ra) and ultimate capacity (Ru) given a measured field set
 */
export function calculateBearingCapacityFromSet(
  input: HileyInput,
  measuredSet10BlowsCm: number,
  measuredC_cm?: number
): SetCapacityCheckResult {
  const eta = input.hammerEfficiency ?? calculateHammerEfficiency(input.hammerWeightTons, input.pileWeightTons, input.restitutionCoeff);
  const C = measuredC_cm ?? input.tempCompressionCm;
  const S = measuredSet10BlowsCm / 10;
  const energy = eta * input.hammerWeightTons * input.dropHeightCm;

  const denominator = S + (C / 2);
  const Ru = denominator > 0 ? energy / denominator : 0;
  const Ra = Ru / input.safetyFactor;

  const hileyNominal = calculateHiley(input);
  const targetSet10 = hileyNominal.targetSet10BlowsCm;

  // A pile achieves set if measured penetration is less than or equal to target set
  // (which yields a capacity >= required safe working load)
  const isSetAchieved = measuredSet10BlowsCm <= targetSet10 && measuredSet10BlowsCm > 0;
  const marginPercent = input.safeWorkingLoadTons > 0 
    ? ((Ra - input.safeWorkingLoadTons) / input.safeWorkingLoadTons) * 100 
    : 0;

  const measuredBlowsPerFoot = measuredSet10BlowsCm > 0 ? Math.round(304.8 / measuredSet10BlowsCm) : 0;
  const measuredBlowsPerMeter = measuredSet10BlowsCm > 0 ? Math.round(1000 / measuredSet10BlowsCm) : 0;
  const targetBlowsPerFoot = targetSet10 > 0 ? Math.round(304.8 / targetSet10) : 0;

  return {
    ultimateCapacityTons: Ru,
    safeWorkingLoadTons: Ra,
    isSetAchieved,
    marginPercent,
    measuredSet10BlowsCm,
    targetSet10BlowsCm: targetSet10,
    measuredBlowsPerFoot,
    measuredBlowsPerMeter,
    targetBlowsPerFoot,
  };
}

/**
 * Generates a 5x5 sensitivity matrix around nominal drop height H and compression C
 */
export function generateSensitivityMatrix(input: HileyInput): SensitivityMatrix {
  const nominalH = input.dropHeightCm;
  const nominalC = input.tempCompressionCm;

  const dropHeights = [
    Math.max(10, Math.round(nominalH - 20)),
    Math.max(15, Math.round(nominalH - 10)),
    Math.round(nominalH),
    Math.round(nominalH + 10),
    Math.round(nominalH + 20),
  ];

  const compressions = [
    Math.max(0.2, Number((nominalC - 0.4).toFixed(2))),
    Math.max(0.4, Number((nominalC - 0.2).toFixed(2))),
    Number(nominalC.toFixed(2)),
    Number((nominalC + 0.2).toFixed(2)),
    Number((nominalC + 0.4).toFixed(2)),
  ];

  const grid: number[][] = [];
  const gridBlowsPerFoot: number[][] = [];

  for (let i = 0; i < dropHeights.length; i++) {
    const row: number[] = [];
    const rowFt: number[] = [];
    for (let j = 0; j < compressions.length; j++) {
      const cellResult = calculateHiley({
        ...input,
        dropHeightCm: dropHeights[i],
        tempCompressionCm: compressions[j],
      });
      row.push(Number(cellResult.targetSet10BlowsCm.toFixed(2)));
      rowFt.push(cellResult.equivalentBlowsPerFoot);
    }
    grid.push(row);
    gridBlowsPerFoot.push(rowFt);
  }

  return {
    dropHeights,
    compressions,
    grid,
    gridBlowsPerFoot,
  };
}

/**
 * Converts Blows per meter to Blows per foot (1 meter = 3.28084 ft)
 */
export function blowsPerMeterToBlowsPerFoot(blowsPerMeter: number): number {
  if (blowsPerMeter <= 0) return 0;
  return Math.round(blowsPerMeter / 3.28084);
}

/**
 * Formats both Blows/m and Blows/ft for dual engineering display
 */
export function formatBlowsDual(blowsPerMeter: number): string {
  const blowsPerFoot = blowsPerMeterToBlowsPerFoot(blowsPerMeter);
  return `${blowsPerMeter} blw/m (${blowsPerFoot} blw/ft)`;
}
