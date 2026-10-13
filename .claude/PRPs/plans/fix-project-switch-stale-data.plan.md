# Plan: Fix "switch project → data doesn't change" (active-project cookie clobber race + calculator stale state)

## Summary

Switching projects in the navbar sometimes leaves the page showing the **old (or default) project's data**. Root cause (empirically reproduced): `ProjectSwitcher.fetchProjects()` **silently rewrites the `active_project_id` cookie on every component mount** with `data[0]`, guarded by a **stale first-render closure** (`!selectedProjectId`). When that fetch resolves *after* the user has picked a project (likely: remote Neon DB is slow; `reactStrictMode: true` double-fires the effect in dev), it clobbers the cookie (but not localStorage). All server pages (`force-dynamic` + `getActiveProject()` read the cookie) then render the **wrong project** on the next `router.refresh()`/navigation — while the navbar label (client state) shows the **selected** one. Secondary bug: `HileyCalculator` copies `initialProject` into `useState` with no remount key, so it can keep stale state and **save criteria into the old project's id** ([HileyCalculator.tsx:391](src/components/calculator/HileyCalculator.tsx:391)).

## User Story

As a field engineer working across multiple projects/buildings,
I want every page to always show the data of the project I selected in the switcher,
So that I never read, enter, or save records against the wrong project.

**ภาษาไทย**: ในฐานะวิศวกรงานสนามที่ทำงานหลายโครงการ/อาคาร ฉันต้องการให้ทุกหน้าแสดงข้อมูลของโครงการที่เลือกไว้เสมอ เพื่อไม่ให้อ่านหรือบันทึกข้อมูลผิดโครงการ

## Problem → Solution

**Current**: Three independent writers of `active_project_id` —
1. `handleSelectProject` (cookie + localStorage) — the authoritative user action;
2. `fetchProjects()` on mount (cookie **only**, from `data[0]`, stale-closure guard, **no refresh**) — a silent clobber that races user clicks and SSR;
3. `handleDeleteProject` (cookie + localStorage) — fine.

Once writer #2 lands after a user click, **cookie ≠ selected ≠ localStorage** persistently → SSR renders the wrong project → "data doesn't change".

**Desired**: `handleSelectProject` / `handleDeleteProject` are the **only** writers (cookie + localStorage + `router.refresh()`). Mount-time `fetchProjects()` becomes **read-only** for state hydration (cookie → localStorage → list order for display). `/calculator` gets a project-keyed remount so client state can never outlive a project switch.

## Metadata

- **Complexity**: Medium
- **Source PRD**: N/A (user-reported bug, confirmed by live debugging session 2026-10-13)
- **PRD Phase**: N/A (standalone bug fix)
- **Estimated Files**: 4 (2 updated, 2 created)

---

## UX Design

### Before

```
┌──────────── Navbar ────────────────────────────────────────────┐
│ PileTech Pro    …nav…    [● PROJ-2026-01 : MCLA ▾]  ← label (client state)   │
└──────────────────────────────────────────────────────────────┘
┌──────────── Page (/piles) ────────────────────────────────────┐
│ โครงการ: GHT-2026 - The Grand Horizon Tower   ← SERVER data (cookie) ❌≠label│
│ เมทริกซ์ 5 ต้น …                                                        │
└──────────────────────────────────────────────────────────────┘
   ↑ user picked "MCLA" a second ago; a late mount fetch rewrote the cookie
     → next refresh renders GHT-2026 again. Feels like "switch did nothing".
```

### After

```
┌──────────── Navbar ────────────────────────────────────────────┐
│ PileTech Pro    …nav…    [● PROJ-2026-01 : MCLA ▾]  ← label                    │
└──────────────────────────────────────────────────────────────┘
┌──────────── Page (/piles) ────────────────────────────────────┐
│ โครงการ: PROJ-2026-01 - MCLA   ← SERVER data (cookie) ✅=label                │
│ เมทริกซ์ 233 ต้น …                                                       │
└──────────────────────────────────────────────────────────────┘
   Single source of truth: only explicit user actions write the cookie.
   Mount fetch never writes → no race → label always matches page.
```

### Interaction Changes

| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Project dropdown → click a project | Page may revert/keep old project after refresh (cookie clobber race) | Page always renders selected project; label & page never disagree | The core fix |
| First visit (no cookie/localStorage) | Mount fetch writes cookie to `data[0]` (racy) | No write; server fallback (`findFirst createdAt desc`) renders newest; label falls back to `projects[0]` — **same orderBy, same project, so they match** | Display-only hydration |
| `/calculator` after a switch | Header may keep old project state; saving can target the **old** `project.id` | `key`ed remount on project id → state always fresh | Mirrors `piles/page.tsx` pattern |
| Projects list fetch failure | `console.error` only, silent UI | Toast error (matches existing in-file error style) | Silent-failure hardening |
| Detail pages (`/piles/[id]/drive`, `/piles/[id]/qc`) after a switch | Show the URL's pile (old project) | Unchanged — **user explicitly chose "leave as-is"** | Out of scope by user decision |

**UI state coverage**: Default (populated dropdown) ✅ existing; Empty (0 projects → "สร้างโครงการใหม่" CTA exists) ✅ existing; Loading (`'กำลังโหลด...'` label) ✅ existing; Error (new toast) — added; Overflow (dropdown `max-h-60` scroll, label `truncate`) ✅ existing.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 (critical) | `src/components/navigation/ProjectSwitcher.tsx` | 54-93 | The buggy cookie writer + the fix site |
| P0 (critical) | `src/lib/activeProject.ts` | 1-42 | Server-side reader — must stay compatible |
| P1 (important) | `src/app/api/projects/route.ts` | 4-21 | `orderBy: { createdAt: 'desc' }` — the order both fallbacks rely on |
| P1 (important) | `src/app/piles/page.tsx` | 54-59 | The `key={project?.id}` remount pattern to mirror |
| P1 (important) | `src/app/calculator/page.tsx` | 23-29 | Missing key → stale state + wrong-project saves |
| P2 (reference) | `src/components/piles/PileNumberMatrix.tsx` | 131-158 | Prop-sync effects (defense already present there) |
| P2 (reference) | `tests/drivingDrafts.test.ts` | 1-26 | Vitest style to mirror for the new unit tests |

## External Documentation

None needed — feature uses established internal patterns (Next.js `cookies()`, Prisma `orderBy`, existing component conventions). Next.js 15 `router.refresh()` semantics verified empirically in this session (refresh re-renders `force-dynamic` pages with current cookies — working as documented).

---

## Patterns to Mirror

### NAMING_CONVENTION
// SOURCE: src/lib/drivingIntervals.ts, src/lib/drivingDrafts.ts (lib utilities)
Utilities in `src/lib/` are plain exported pure functions, camelCase, no default export.
```ts
export function listDrivingDrafts(storage: DraftStorage, projectId: string): DrivingDraftForm[]
```

### COOKIE_WRITE (the ONLY sanctioned writers — user action handlers)
// SOURCE: src/components/navigation/ProjectSwitcher.tsx:85-93
```ts
const handleSelectProject = (proj: ProjectItem) => {
  setSelectedProjectId(proj.id);
  if (typeof window !== 'undefined') {
    localStorage.setItem('active_project_id', proj.id);
    setProjectCookie(proj.id);
  }
  setIsOpen(false);
  router.refresh();
};
```

### SERVER_READER
// SOURCE: src/lib/activeProject.ts:5-42
```ts
const cookieStore = await cookies();
activeProjectId = cookieStore.get('active_project_id')?.value;
// ... findUnique({ where: { id: activeProjectId }, include })
// fallback: findFirst({ include, orderBy: { createdAt: 'desc' } })
```

### KEY_REMOUNT (page → keyed client component)
// SOURCE: src/app/piles/page.tsx:54-59
```tsx
<PileNumberMatrix
  key={project?.id || 'no-project'}
  initialPiles={piles}
  projectId={project?.id}
  projectCriteria={project?.criteria ? JSON.parse(JSON.stringify(project.criteria)) : []}
/>
```

### PROP_SYNC_EFFECT (client component keeping state aligned with server props)
// SOURCE: src/components/piles/PileNumberMatrix.tsx:131-134
```ts
React.useEffect(() => {
  setPiles(initialPiles);
}, [initialPiles]);
```

### ERROR_HANDLING (client fetch failures → toast)
// SOURCE: src/components/navigation/ProjectSwitcher.tsx:130-135 (create flow)
```ts
} catch (err: any) {
  toast.error(err.message || 'เกิดข้อผิดพลาดในการสร้างโครงการ');
}
```

### TEST_STRUCTURE (vitest, node env, no DOM)
// SOURCE: tests/drivingDrafts.test.ts:1-26
```ts
import { describe, expect, it } from 'vitest';
describe('drivingDrafts', () => {
  it('lists drafts for the current project only', () => { ... });
});
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `src/lib/activeProjectId.ts` | CREATE | Pure, client-safe resolver: cookie → localStorage → null (no writes). Also tiny `readActiveProjectCookie()`/`readActiveProjectLS()` helpers. Testable without jsdom. |
| `src/components/navigation/ProjectSwitcher.tsx` | UPDATE | Remove mount-time cookie write; read-only hydration via resolver; stale-closure-safe `setSelectedProjectId(prev => prev || chosen)`; toast on fetch failure. |
| `src/app/calculator/page.tsx` | UPDATE | Add `key={project?.id || 'no-project'}` to `HileyCalculator` (mirror piles page). |
| `tests/activeProjectId.test.ts` | CREATE | Unit tests for the resolver (priority order, unknown ids, empty inputs). |

## NOT Building

- No changes to detail pages (`/piles/[id]/drive`, `/piles/[id]/qc`) — **user chose "leave as-is"** (URL names a pile; switching projects elsewhere is unaffected).
- No new UI (banners, badges, indicators) on pages — fix is plumbing; label/page truth alignment only.
- No rewrite of `getActiveProject` server fallback (already correct: `findFirst createdAt desc` matches `/api/projects` order `createdAt desc`).
- No removal of localStorage (still read as secondary source + by `PileNumberMatrix` fallbacks at lines 314/390/433/471).
- No migration of state to URL params or context — out of scope for this bug.
- No performance work on `/api/projects` (include `settings`+`criteria` per project is heavy but works; not the bug).

---

## Step-by-Step Tasks

### Task 1: Create `src/lib/activeProjectId.ts` (pure resolver)

- **ACTION**: Create a client-safe module that resolves which project id should hydrate the switcher, and reads (never writes) the current persisted ids.
- **IMPLEMENT**:
```ts
export const ACTIVE_PROJECT_COOKIE = 'active_project_id';
export const ACTIVE_PROJECT_LS_KEY = 'active_project_id';

export function readActiveProjectCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${ACTIVE_PROJECT_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(ACTIVE_PROJECT_COOKIE.length + 1)) : null;
}

export function readActiveProjectLocalStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_PROJECT_LS_KEY);
  } catch {
    return null; // private mode / storage disabled
  }
}

/**
 * Read-only hydration priority: cookie → localStorage → null.
 * Returns null when the persisted id no longer exists in the project list
 * (e.g. project deleted). Never writes cookie/localStorage.
 */
export function resolveHydratedProjectId(
  projects: { id: string }[],
  cookieId: string | null,
  savedId: string | null
): string | null {
  if (cookieId && projects.some((p) => p.id === cookieId)) return cookieId;
  if (savedId && projects.some((p) => p.id === savedId)) return savedId;
  return null;
}
```
- **MIRROR**: NAMING_CONVENTION (`src/lib/*` pure exports, camelCase).
- **IMPORTS**: none (browser globals only).
- **GOTCHA**: Keep this module **free of `next/headers`** — it must be importable from a `'use client'` component. Do NOT name it `activeProject.ts` — that already exists server-side and imports `prisma`.
- **VALIDATE**: `npx vitest run tests/activeProjectId.test.ts` (Task 4) passes.

### Task 2: Rewrite `ProjectSwitcher` mount logic (remove the cookie clobber)

- **ACTION**: In `fetchProjects()`, stop writing the cookie; hydrate `selectedProjectId` read-only via the resolver; make the guard stale-closure-proof; surface fetch failure.
- **IMPLEMENT** (replace lines 60-77):
```ts
const fetchProjects = async () => {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('โหลดรายการโครงการไม่สำเร็จ');
    const data: ProjectItem[] = await res.json();
    setProjects(data);
    // Read-only hydration — never writes cookie/localStorage (see plan RC1).
    const hydrated = resolveHydratedProjectId(
      data,
      readActiveProjectCookie(),
      readActiveProjectLocalStorage()
    );
    setSelectedProjectId((prev) => prev || hydrated || data[0]?.id || '');
  } catch (err) {
    console.error('Failed to load projects:', err);
    toast.error('โหลดรายการโครงการไม่สำเร็จ ลองรีเฟรชอีกครั้ง');
  }
};
```
  Delete `setProjectCookie(chosenId)` from `fetchProjects`. **Keep** `setProjectCookie` as a helper (still used by `handleSelectProject` and `handleDeleteProject` — the sanctioned writers).
- **MIRROR**: COOKIE_WRITE (user-action writers stay), ERROR_HANDLING (toast in catch).
- **IMPORTS**: add `import { resolveHydratedProjectId, readActiveProjectCookie, readActiveProjectLocalStorage } from '@/lib/activeProjectId';`
- **GOTCHA**:
  - `setSelectedProjectId(prev => prev || …)` uses the functional form so a late-resolving mount fetch (StrictMode double-fire; slow Neon) can **never override** a value set by `handleSelectProject`. The old code compared a captured `selectedProjectId` from the first render — the exact race that clobbered the cookie.
  - First-visit display: when `hydrated` is null, fall back to `data[0]?.id` **for display only**. The server fallback (`getActiveProject` → `findFirst createdAt desc`) and `/api/projects` (`orderBy createdAt desc`) pick the **same** project, so label and page content match without any write.
  - `handleSelectProject` (lines 85-93) is **unchanged** — it remains the single place that persists a selection (cookie + localStorage + `router.refresh()`).
- **VALIDATE**: In dev, with a fresh tab: (a) never see the navbar label flip without a click; (b) after clicking a project, `document.cookie` and `localStorage['active_project_id']` both equal the clicked id and stay equal ≥10s.

### Task 3: Key the calculator remount (`src/app/calculator/page.tsx`)

- **ACTION**: Force a full remount of `HileyCalculator` when the active project changes, so its `useState(initialProject)`/`useState(criteriaList)` state can never outlive a project switch.
- **IMPLEMENT** (page.tsx lines 23-29):
```tsx
<HileyCalculator
  key={project?.id || 'no-project'}
  initialProject={project ? JSON.parse(JSON.stringify(project)) : null}
  initialCriteriaId={initialCriteriaId}
/>
```
- **MIRROR**: KEY_REMOUNT (`src/app/piles/page.tsx:54`).
- **IMPORTS**: none.
- **GOTCHA**: Do **not** add sync effects inside `HileyCalculator` — the component initializes ~10 states from `firstCriteria` (selected preset, input, measuredSet10…). Keyed remount re-initializes all of them atomically; per-state effects would drift. Also note `handleConfirmSave` uses the `project.id` state ([HileyCalculator.tsx:391](src/components/calculator/HileyCalculator.tsx:391)) — remount guarantees it's the current project.
- **VALIDATE**: Switch projects while on `/calculator`: header "โครงการที่กำลังคำนวณสเปกเสาเข็ม" and the criteria list ("รายการคำนวณ… (N ขนาด)") always reflect the selected project; saving shows toast and the criterion appears in **that** project.

### Task 4: Unit tests (`tests/activeProjectId.test.ts`)

- **ACTION**: Cover the resolver's priority + edge cases.
- **IMPLEMENT** (AAA style, mirror drivingDrafts.test.ts):
```ts
import { describe, expect, it } from 'vitest';
import { resolveHydratedProjectId } from '@/lib/activeProjectId';

const projects = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];

describe('resolveHydratedProjectId', () => {
  it('prefers the cookie id when it exists in the list', () => {
    expect(resolveHydratedProjectId(projects, 'p2', 'p3')).toBe('p2');
  });
  it('falls back to the localStorage id when the cookie id is unknown', () => {
    expect(resolveHydratedProjectId(projects, 'deleted-id', 'p3')).toBe('p3');
  });
  it('returns null when both ids are missing from the list', () => {
    expect(resolveHydratedProjectId(projects, 'x', 'y')).toBeNull();
  });
  it('returns null when nothing was persisted', () => {
    expect(resolveHydratedProjectId(projects, null, null)).toBeNull();
  });
  it('handles an empty project list', () => {
    expect(resolveHydratedProjectId([], 'p1', 'p1')).toBeNull();
  });
});
```
- **MIRROR**: TEST_STRUCTURE.
- **IMPORTS**: vitest + `@/lib/activeProjectId`.
- **GOTCHA**: `vitest.config.ts` runs `environment: 'node'` — the pure resolver is the only thing under test; browser-global readers are **not** imported in tests (they'd need jsdom).
- **VALIDATE**: `npm test` — new file passes, existing suite untouched.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| cookie id wins | list p1-p3, cookie=p2, ls=p3 | `'p2'` | — |
| deleted cookie id → ls | cookie='deleted', ls=p3 | `'p3'` | stale id |
| both unknown | cookie=x, ls=y | `null` | |
| nothing persisted | null, null | `null` | first visit |
| empty list | `[]` | `null` | |

### Edge Cases Checklist
- [x] Stale/invalid persisted id (deleted project) → resolver drops it; server fallback handles render
- [x] First visit (no cookie, no ls) → no write; display falls back to `projects[0]`, which equals server fallback by shared `createdAt desc` ordering
- [x] StrictMode double-fetch → functional `setSelectedProjectId(prev => prev || …)` makes second resolution a no-op after a click
- [x] localStorage unavailable (private mode) → `try/catch` returns null
- [x] Network failure on `/api/projects` → toast (not silent)
- [x] Concurrent multi-tab usage → unchanged semantics (last explicit click wins; cookie is the server contract)

### Manual E2E (dev server) — the acceptance path

1. Fresh tab → `/dashboard`: navbar label shows newest project (== SSR fallback) — **no flicker/revert**.
2. Switch to another project on `/piles`: matrix pile count changes immediately (e.g. 6 → 233), `document.cookie` == `localStorage` == selected id, stays stable ≥10s.
3. Repeat switch on `/dashboard`, `/qc`, `/reports`: KPIs/tables/export rows change each time.
4. Repeat on `/calculator`: project header + criteria list change; save a criterion → success toast → verify via `/api/criteria?projectId=<id>` it belongs to the **selected** project.
5. Delete a project → auto-switch to `remaining[0]`, page refreshes to it.
6. Reload (F5) on each page → still shows the selected project (cookie persisted).

## Validation Commands

### Static Analysis
```bash
npx tsc --noEmit
```
EXPECT: Zero type errors.

### Unit Tests
```bash
npm test
```
EXPECT: All pass (including new `tests/activeProjectId.test.ts`).

### Full Build
```bash
npm run build
```
EXPECT: `prisma generate && next build` succeeds.

### Browser Validation
```bash
npm run dev
```
EXPECT: Manual E2E checklist above passes (esp. the ≥10s stability check on `/piles`).

## Acceptance Criteria

- [ ] `fetchProjects()` performs **zero** cookie/localStorage writes (grep: `setProjectCookie` only in `handleSelectProject`/`handleDeleteProject`/helper def)
- [ ] Switching projects on `/piles` (and every page) renders the selected project's data, and it **never reverts** without a click
- [ ] Navbar label and page content never disagree
- [ ] `/calculator` remounts per project; saves target the selected project
- [ ] `npm test`, `tsc --noEmit`, `npm run build` all pass
- [ ] Detail pages + deletion flow unchanged in behavior

## Completion Checklist

- [x] Code follows discovered patterns (`key` remount, prop-sync, toast-on-error, pure lib module)
- [x] Error handling matches codebase style (toast in catch, console.error kept)
- [x] Logging follows codebase conventions
- [x] Tests follow test patterns (vitest, node env, AAA)
- [x] No hardcoded values (constants exported in `activeProjectId.ts`)
- [x] No unnecessary scope additions (detail pages explicitly excluded by user)
- [x] Self-contained — no questions needed during implementation

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Removing mount-time cookie write breaks first-visit selection consistency | Low | Medium | Server fallback (`createdAt desc`) and `/api/projects` order (`createdAt desc`) pick the same project — label and page match with no write. Covered by manual E2E step 1. |
| Some flow depended on the mount-time write (e.g. fixing a corrupted cookie) | Low | Low | Resolver still *reads* both stores; `handleSelectProject` re-syncs on first click. Cookie corruption is out of scope. |
| `key` remount loses in-flight calculator form input on switch | Medium | Low (user intent: switch = new context) | Remount on project change is the intended UX; same trade-off already accepted on `/piles`. |
| Service worker / router cache interplay in production | Low | Medium | SW never intercepts `/api/*` or RSC (verified `public/sw.js:58-94`); Next 15 default `staleTimes.dynamic=0` means dynamic routes aren't client-cached. Re-verify in production build during manual E2E. |

## Notes

- **Empirical evidence from live debugging session (2026-10-13, dev server):** the page content + navbar label flipped `PROJ-2026-02 → GHT-2026` **without any user interaction** between two reads, proving the mount-fetch cookie rewrite fires post-render. Direct clicks (settled page) worked on every page — the user-visible failure is the **race**, not the click path.
- The DB is remote Neon (`ap-southeast-1`) with real project data — `PROJ-2026-01 "MCLA"` (233 piles), `PROJ-2026-02 "MCLA"` (6 piles), `GHT-2026` (seed, 5 piles). Wide race window confirmed. **Do not run destructive tests against this DB.**
- Two projects share the display name "MCLA" — when testing "data changed", compare pile counts/codes, not names.
- `getActiveProject`'s `try { cookies() } catch {}` fallback to newest project is intentional (build/prerender safety) — keep.
- `PileNumberMatrix` localStorage fallbacks (lines 314/390/433/471) only trigger when the `projectId` prop is absent — pages always pass it; left as-is.
- Dev server may still be running on port 3000 from the debugging session (`preview: pile-dev`) — reuse or stop it before the implementer starts.