# Guided Field Mode Implementation Plan

> **For agentic workers:** Implement task-by-task with test-first checks and review each ticket before continuing.

**Goal:** Add mobile Guided Field Mode, browser-local Driving Drafts, Dashboard Drafts Inbox, offline last-page reload, and optimistic concurrency protection.

**Architecture:** Keep `DrivingRecordForm` as the source of form state. Add a presentation-only full-screen Field Mode around the existing interval operations, isolate Draft serialization/storage in a pure helper, and protect online writes with the existing `DrivingRecord.updatedAt` field. No schema or external dependency changes.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind, Prisma/PostgreSQL, Vitest, browser localStorage, service worker.

**Spec:** `docs/superpowers/specs/2026-09-07-guided-field-mode-design.md`

## Global Constraints

- Save Draft is explicit only; no new autosave writes.
- One latest Draft per project/pile; Dashboard filters to the active project.
- Save Record requires online connectivity and leaves Drafts intact on failure.
- API conflict checks use `updatedAt`; no Prisma schema migration.
- Offline caching is limited to static assets and the last opened Drive page.

## Tickets

### T0 — Spec, glossary, and ADR

Completed before implementation: the Guided Field Mode spec, `CONTEXT.md` glossary entries, and ADR 0001 document browser-local Draft storage, bounded Drive-page caching, optimistic timestamp checks, and the explicit offline limitations.

### T1 — Versioned Driving Draft storage

Create `src/lib/drivingDrafts.ts` and `tests/drivingDrafts.test.ts`. Define `DrivingDraftV1`, normalized storage keys, central index metadata, safe read/write/remove helpers, active-project filtering, malformed-data handling, and legacy-key normalization. Replace the existing 600ms autosave write with explicit Save Draft actions.

### T2 — Online guard and conflict-safe Drive API

Update `src/app/api/piles/[id]/drive/route.ts` and `DrivingRecordForm.tsx`. Add `expectedRecordUpdatedAt` and `forceOverwrite`, use a transaction for compare/upsert/status update, return structured 409 conflicts, disable Save Record offline, recheck before submission, and preserve Drafts after network errors. Add DB route tests when the database is reachable.

### T3 — Guided Field Mode modal

Create `src/components/driving/GuidedFieldModeModal.tsx` and extend `BlowCountInput.tsx` with field presentation. Reuse existing Save/Skip/Quick Edit behavior, add full-screen responsive layout, Capture/Review toggle, interval progress, Save Draft, and Close/Continue actions.

### T4 — Form integration and conflict UX

Integrate the modal into `DrivingRecordForm.tsx`. Auto-open on mobile, expose a desktop action, remember dismissal in page/session memory, show Draft restore/discard state, and provide Use Server/explicit Overwrite conflict actions.

### T5 — Dashboard Drafts Inbox

Create `src/components/dashboard/DashboardDraftsInbox.tsx` and pass the active project ID from `src/app/dashboard/page.tsx`. Show Draft metadata, Continue to the Drive restore banner, and confirmed Discard.

### T6 — Last Drive page offline cache

Create `public/sw.js` and `src/components/ServiceWorkerRegistrar.tsx`; register from `src/app/layout.tsx`. Cache same-origin static assets and successful Drive-page navigations only. Do not cache API writes.

### T7 — Verification and documentation review

Run focused unit tests, full tests, build, and the mobile/desktop acceptance scenarios. Update `docs/plans/task.md` and review `CONTEXT.md`/ADR for consistency.
