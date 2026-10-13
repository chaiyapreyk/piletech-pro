export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DrivingDraftForm {
  blowCounts: (number | null)[];
  recordUnit: 'METER' | 'FEET';
  recordScope: 'FULL' | 'WINDOW';
  windowLength: number;
  measuredLast10: number;
  measuredLast10Rounds?: [number, number, number];
  measuredTempC: number;
  totalPileLength: number;
  isStickUpAuto: boolean;
  manualStickUpLength: number;
  groundLevel: number;
  cutOffLevel: number;
  isTipLevelAuto: boolean;
  manualTipLevel: number;
  inspectorName: string;
  notes: string;
  plumbnessXPercent?: number | null;
  plumbnessYPercent?: number | null;
  deltaXCm?: number | null;
  deltaYCm?: number | null;
}

export interface DrivingDraftV1 {
  version: 1;
  projectId: string;
  pileId: string;
  pileNo: string;
  gridLine: string;
  building: string | null;
  savedAt: string;
  serverRecordUpdatedAt: string | null;
  form: DrivingDraftForm;
}

export interface DraftIdentity {
  projectId: string;
  pileId: string;
  pileNo?: string;
  gridLine?: string;
  building?: string | null;
}

export interface DraftIndexItem {
  projectId: string;
  pileId: string;
  pileNo: string;
  gridLine: string;
  building: string | null;
  savedAt: string;
  intervalCount: number;
  recordedCount: number;
  skippedCount: number;
  recordUnit: 'METER' | 'FEET';
  recordScope: 'FULL' | 'WINDOW';
  windowLength: number;
}

export interface CreateDrivingDraftInput extends DraftIdentity {
  savedAt?: string;
  serverRecordUpdatedAt?: string | null;
  form: DrivingDraftForm;
}

export const DRIVING_DRAFT_INDEX_KEY = 'piletech:driving-draft:index:v1';
const DRIVING_DRAFT_KEY_PREFIX = 'piletech:driving-draft:v1:';

function draftKey(projectId: string, pileId: string) {
  return `${DRIVING_DRAFT_KEY_PREFIX}${projectId}:${pileId}`;
}

function legacyDraftKey(pileId: string) {
  return `piledrive_draft_${pileId}`;
}

function safeGet(storage: DraftStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUnit(value: unknown): value is 'METER' | 'FEET' {
  return value === 'METER' || value === 'FEET';
}

function isScope(value: unknown): value is 'FULL' | 'WINDOW' {
  return value === 'FULL' || value === 'WINDOW';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isForm(value: unknown): value is DrivingDraftForm {
  if (!isRecord(value) || !Array.isArray(value.blowCounts)) return false;

  return (
    value.blowCounts.every((blow) => blow === null || (isFiniteNumber(blow) && blow > 0)) &&
    isUnit(value.recordUnit) &&
    isScope(value.recordScope) &&
    isFiniteNumber(value.windowLength) &&
    isFiniteNumber(value.measuredLast10) &&
    isFiniteNumber(value.measuredTempC) &&
    isFiniteNumber(value.totalPileLength) &&
    typeof value.isStickUpAuto === 'boolean' &&
    isFiniteNumber(value.manualStickUpLength) &&
    isFiniteNumber(value.groundLevel) &&
    isFiniteNumber(value.cutOffLevel) &&
    typeof value.isTipLevelAuto === 'boolean' &&
    isFiniteNumber(value.manualTipLevel) &&
    typeof value.inspectorName === 'string' &&
    typeof value.notes === 'string'
  );
}

function isDraft(value: unknown): value is DrivingDraftV1 {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.projectId === 'string' &&
    typeof value.pileId === 'string' &&
    typeof value.pileNo === 'string' &&
    typeof value.gridLine === 'string' &&
    (typeof value.building === 'string' || value.building === null) &&
    typeof value.savedAt === 'string' &&
    (typeof value.serverRecordUpdatedAt === 'string' || value.serverRecordUpdatedAt === null) &&
    isForm(value.form)
  );
}

function readIndex(storage: DraftStorage): DraftIndexItem[] {
  const value = safeParse(safeGet(storage, DRIVING_DRAFT_INDEX_KEY));
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is DraftIndexItem => {
    if (!isRecord(item)) return false;
    return (
      typeof item.projectId === 'string' &&
      typeof item.pileId === 'string' &&
      typeof item.pileNo === 'string' &&
      typeof item.gridLine === 'string' &&
      (typeof item.building === 'string' || item.building === null) &&
      typeof item.savedAt === 'string' &&
      isFiniteNumber(item.intervalCount) &&
      isFiniteNumber(item.recordedCount) &&
      isFiniteNumber(item.skippedCount) &&
      isUnit(item.recordUnit) &&
      isScope(item.recordScope) &&
      isFiniteNumber(item.windowLength)
    );
  });
}

function toIndexItem(draft: DrivingDraftV1): DraftIndexItem {
  const recordedCount = draft.form.blowCounts.filter(
    (blow): blow is number => typeof blow === 'number' && blow > 0
  ).length;

  return {
    projectId: draft.projectId,
    pileId: draft.pileId,
    pileNo: draft.pileNo,
    gridLine: draft.gridLine,
    building: draft.building,
    savedAt: draft.savedAt,
    intervalCount: draft.form.blowCounts.length,
    recordedCount,
    skippedCount: draft.form.blowCounts.filter((blow) => blow === null).length,
    recordUnit: draft.form.recordUnit,
    recordScope: draft.form.recordScope,
    windowLength: draft.form.windowLength,
  };
}

export function createDrivingDraft(input: CreateDrivingDraftInput): DrivingDraftV1 {
  return {
    version: 1,
    projectId: input.projectId,
    pileId: input.pileId,
    pileNo: input.pileNo ?? '',
    gridLine: input.gridLine ?? '',
    building: input.building ?? null,
    savedAt: input.savedAt ?? new Date().toISOString(),
    serverRecordUpdatedAt: input.serverRecordUpdatedAt ?? null,
    form: {
      ...input.form,
      blowCounts: [...input.form.blowCounts],
    },
  };
}

export function saveDrivingDraft(storage: DraftStorage, draft: DrivingDraftV1): void {
  if (!isDraft(draft)) throw new Error('Invalid Driving Draft');

  const payloadKey = draftKey(draft.projectId, draft.pileId);
  const previousPayload = safeGet(storage, payloadKey);
  const previousIndex = safeGet(storage, DRIVING_DRAFT_INDEX_KEY);
  const nextIndex = [
    ...readIndex(storage).filter(
      (item) => !(item.projectId === draft.projectId && item.pileId === draft.pileId)
    ),
    toIndexItem(draft),
  ];
  try {
    storage.setItem(payloadKey, JSON.stringify(draft));
    storage.setItem(DRIVING_DRAFT_INDEX_KEY, JSON.stringify(nextIndex));
  } catch (error) {
    try {
      if (previousPayload === null) storage.removeItem(payloadKey);
      else storage.setItem(payloadKey, previousPayload);
      if (previousIndex === null) storage.removeItem(DRIVING_DRAFT_INDEX_KEY);
      else storage.setItem(DRIVING_DRAFT_INDEX_KEY, previousIndex);
    } catch {
      // Best-effort rollback when browser storage is unavailable or full.
    }
    throw error;
  }
}

function migrateLegacyDraft(storage: DraftStorage, identity: DraftIdentity): DrivingDraftV1 | null {
  const legacy = safeParse(safeGet(storage, legacyDraftKey(identity.pileId)));
  if (!isRecord(legacy) || !Array.isArray(legacy.blowCounts)) return null;

  const legacyBlowCounts = legacy.blowCounts.filter(
    (blow): blow is number | null => blow === null || (isFiniteNumber(blow) && blow > 0)
  );

  const form: DrivingDraftForm = {
    blowCounts: legacyBlowCounts,
    recordUnit: isUnit(legacy.recordUnit) ? legacy.recordUnit : 'FEET',
    recordScope: isScope(legacy.recordScope) ? legacy.recordScope : 'WINDOW',
    windowLength: isFiniteNumber(legacy.windowLength) ? legacy.windowLength : 20,
    measuredLast10: isFiniteNumber(legacy.measuredLast10) ? legacy.measuredLast10 : 5,
    measuredTempC: isFiniteNumber(legacy.measuredTempC) ? legacy.measuredTempC : 1.2,
    totalPileLength: isFiniteNumber(legacy.totalPileLength) ? legacy.totalPileLength : 21,
    isStickUpAuto: true,
    manualStickUpLength: 0.5,
    groundLevel: isFiniteNumber(legacy.groundLevel) ? legacy.groundLevel : 3,
    cutOffLevel: isFiniteNumber(legacy.cutOffLevel) ? legacy.cutOffLevel : 2.5,
    isTipLevelAuto: true,
    manualTipLevel: -17.5,
    inspectorName: typeof legacy.inspectorName === 'string' ? legacy.inspectorName : '',
    notes: typeof legacy.notes === 'string' ? legacy.notes : '',
  };

  const migrated = createDrivingDraft({
    ...identity,
    form,
    savedAt: typeof legacy.savedAt === 'string' ? legacy.savedAt : undefined,
  });

  try {
    saveDrivingDraft(storage, migrated);
    storage.removeItem(legacyDraftKey(identity.pileId));
  } catch {
    // The recovered value is still returned even if migration cannot persist.
  }

  return migrated;
}

export function readDrivingDraft(storage: DraftStorage, identity: DraftIdentity): DrivingDraftV1 | null {
  const current = safeParse(safeGet(storage, draftKey(identity.projectId, identity.pileId)));
  if (isDraft(current)) return current;

  return migrateLegacyDraft(storage, identity);
}

export function listDrivingDrafts(storage: DraftStorage, projectId: string): DraftIndexItem[] {
  return readIndex(storage)
    .filter((item) => item.projectId === projectId)
    .filter((item) => isDraft(safeParse(safeGet(storage, draftKey(item.projectId, item.pileId)))))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function removeDrivingDraft(storage: DraftStorage, identity: DraftIdentity): void {
  try { storage.removeItem(draftKey(identity.projectId, identity.pileId)); } catch {}
  try { storage.removeItem(legacyDraftKey(identity.pileId)); } catch {}
  try {
    storage.setItem(
      DRIVING_DRAFT_INDEX_KEY,
      JSON.stringify(
        readIndex(storage).filter(
          (item) => !(item.projectId === identity.projectId && item.pileId === identity.pileId)
        )
      )
    );
  } catch {}
}

export function getBrowserDraftStorage(): DraftStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
