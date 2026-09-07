# Guided Field Mode & Drafts Inbox Design

- Date: 2026-09-07
- Status: Approved for implementation
- Scope: Mobile-first Driving Record capture, browser-local Drafts, and safe online submission

## Goal

Provide a fast one-handed field workflow for pile driving data while preserving the existing full engineering form and preventing accidental server overwrites.

## User Experience

- Mobile opens Guided Field Mode as a full-screen modal by default.
- Desktop keeps the standard form and provides an explicit Field Mode action.
- Save and Skip append the current interval and auto-advance.
- Capture and Review are toggles in the same modal.
- Existing intervals support Quick Edit.
- Save Draft is explicit, keeps the modal open, and returns to the standard form only when the user closes/continues.
- Dismissal is remembered only for the current page/session.

## Drafts

- Drafts contain the complete form state, not only blow counts.
- Storage is versioned browser localStorage, with one latest Draft per project/pile and a central index.
- Dashboard shows only Drafts for the active project.
- Continue opens the Drive page and the existing restore banner; it never restores silently.
- Discard requires confirmation.
- Successful Save Record removes the Draft.
- Legacy per-pile Draft keys remain readable and are normalized into the versioned format.

## Offline and Caching

- Save Draft works offline.
- Save Record is disabled offline, with a clear explanation, and rechecks connectivity at submission.
- A small service worker caches static assets and the last opened Drive page so that page can reload offline.
- No offline submission queue, automatic sync, QC offline mode, full-app offline navigation, or external service is included.

## Conflict Safety

The Drive POST accepts optional `expectedRecordUpdatedAt` and `forceOverwrite` fields. New UI sends the timestamp captured with the form/Draft. A mismatch returns HTTP 409 with conflict metadata and leaves the record unchanged. The user may use the server version or explicitly confirm an overwrite using the latest server timestamp. The compare and write happen in one transaction. Clients that omit the fields remain backward-compatible.

## Data Contract

```ts
type DrivingDraftV1 = {
  version: 1;
  projectId: string;
  pileId: string;
  pileNo: string;
  gridLine: string;
  building: string | null;
  savedAt: string;
  serverRecordUpdatedAt: string | null;
  form: {
    blowCounts: (number | null)[];
    recordUnit: 'METER' | 'FEET';
    recordScope: 'FULL' | 'WINDOW';
    windowLength: number;
    measuredLast10: number;
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
  };
};
```

## Acceptance Criteria

1. Mobile Guided Field Mode supports Save, Skip, auto-advance, Capture/Review, and Quick Edit.
2. Draft save/restore/discard works per project/pile and appears only for the active project.
3. Offline Save Record is unavailable while offline; offline Draft save and cached Drive reload work.
4. Stale online submissions return 409 and cannot overwrite silently.
5. `rtk proxy npm test` focused tests and `rtk proxy npm run build` pass; database-backed verification is run when the configured database is reachable.
