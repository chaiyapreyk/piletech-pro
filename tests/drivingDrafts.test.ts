import { describe, expect, it } from 'vitest';
import {
  createDrivingDraft,
  listDrivingDrafts,
  readDrivingDraft,
  removeDrivingDraft,
  saveDrivingDraft,
  type DraftStorage,
  type DrivingDraftForm,
} from '@/lib/drivingDrafts';

class MemoryStorage implements DraftStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const form: DrivingDraftForm = {
  blowCounts: [20, null, 32],
  recordUnit: 'FEET',
  recordScope: 'WINDOW',
  windowLength: 20,
  measuredLast10: 4.5,
  measuredTempC: 1.2,
  totalPileLength: 21,
  isStickUpAuto: true,
  manualStickUpLength: 0.5,
  groundLevel: 3,
  cutOffLevel: 2.5,
  isTipLevelAuto: true,
  manualTipLevel: -17.5,
  inspectorName: 'Field Engineer',
  notes: 'Dense layer at 3 ft',
};

function draft(overrides: Partial<Parameters<typeof createDrivingDraft>[0]> = {}) {
  return createDrivingDraft({
    projectId: 'project-1',
    pileId: 'pile-1',
    pileNo: 'P-001',
    gridLine: 'A-1',
    building: 'Building A',
    serverRecordUpdatedAt: '2026-09-07T01:00:00.000Z',
    form,
    savedAt: '2026-09-07T02:00:00.000Z',
    ...overrides,
  });
}

describe('versioned Driving Draft storage', () => {
  it('round-trips the complete form and creates index metadata', () => {
    const storage = new MemoryStorage();
    const value = draft();

    saveDrivingDraft(storage, value);

    expect(readDrivingDraft(storage, { projectId: 'project-1', pileId: 'pile-1' })).toEqual(value);
    expect(listDrivingDrafts(storage, 'project-1')).toEqual([
      expect.objectContaining({
        projectId: 'project-1',
        pileId: 'pile-1',
        pileNo: 'P-001',
        intervalCount: 3,
        recordedCount: 2,
        skippedCount: 1,
      }),
    ]);
  });

  it('keeps one latest draft per pile', () => {
    const storage = new MemoryStorage();
    saveDrivingDraft(storage, draft({ savedAt: '2026-09-07T02:00:00.000Z' }));
    saveDrivingDraft(storage, draft({ savedAt: '2026-09-07T03:00:00.000Z', form: { ...form, blowCounts: [45] } }));

    expect(listDrivingDrafts(storage, 'project-1')).toHaveLength(1);
    expect(readDrivingDraft(storage, { projectId: 'project-1', pileId: 'pile-1' })?.savedAt).toBe(
      '2026-09-07T03:00:00.000Z'
    );
  });

  it('filters the central index by active project', () => {
    const storage = new MemoryStorage();
    saveDrivingDraft(storage, draft());
    saveDrivingDraft(storage, draft({ projectId: 'project-2', pileId: 'pile-2', pileNo: 'P-002' }));

    expect(listDrivingDrafts(storage, 'project-1').map((item) => item.pileNo)).toEqual(['P-001']);
    expect(listDrivingDrafts(storage, 'project-2').map((item) => item.pileNo)).toEqual(['P-002']);
  });

  it('removes both the payload and its index entry', () => {
    const storage = new MemoryStorage();
    saveDrivingDraft(storage, draft());

    removeDrivingDraft(storage, { projectId: 'project-1', pileId: 'pile-1' });

    expect(readDrivingDraft(storage, { projectId: 'project-1', pileId: 'pile-1' })).toBeNull();
    expect(listDrivingDrafts(storage, 'project-1')).toEqual([]);
  });

  it('ignores malformed payloads and index entries', () => {
    const storage = new MemoryStorage();
    storage.setItem('piletech:driving-draft:v1:project-1:pile-1', '{not-json');
    storage.setItem('piletech:driving-draft:index:v1', '[{"projectId":"project-1","pileId":"missing"}]');

    expect(readDrivingDraft(storage, { projectId: 'project-1', pileId: 'pile-1' })).toBeNull();
    expect(listDrivingDrafts(storage, 'project-1')).toEqual([]);
  });

  it('migrates the legacy per-pile draft shape when identity is available', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'piledrive_draft_pile-1',
      JSON.stringify({ ...form, savedAt: '14:30' })
    );

    const migrated = readDrivingDraft(storage, {
      projectId: 'project-1',
      pileId: 'pile-1',
      pileNo: 'P-001',
      gridLine: 'A-1',
      building: 'Building A',
    });

    expect(migrated).toEqual(
      expect.objectContaining({
        version: 1,
        projectId: 'project-1',
        pileId: 'pile-1',
        pileNo: 'P-001',
        serverRecordUpdatedAt: null,
      })
    );
    expect(listDrivingDrafts(storage, 'project-1')).toHaveLength(1);
  });

  it('normalizes invalid legacy blow values instead of crashing restore', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'piledrive_draft_pile-1',
      JSON.stringify({ ...form, blowCounts: [20, 'bad', -1, null] })
    );

    const migrated = readDrivingDraft(storage, {
      projectId: 'project-1',
      pileId: 'pile-1',
    });

    expect(migrated?.form.blowCounts).toEqual([20, null]);
  });
});
