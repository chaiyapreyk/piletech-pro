# Pile Engineering & QA/QC Tool Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a field-ready, zero-cost, responsive full-stack web application for Construction Managers and Site Engineers to compute Hiley's dynamic formula, log pile driving records with real-time Last 10 Blows validation, automate QA/QC eccentricity and plumbness checks, and export professional PDF/Excel reports.

**Architecture:** Next.js full-stack app with React 19/18, TypeScript, and Tailwind CSS. Business logic (Hiley engine and QA/QC tolerance engine) is decoupled and unit-tested with Vitest. Data persistence uses Prisma ORM with SQLite for zero-friction local/offline-first development and ready compatibility with Supabase PostgreSQL for free-tier cloud deployment.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons, Prisma ORM, SQLite / PostgreSQL, Vitest, Recharts, jsPDF / html2canvas / xlsx.

---

### Task 1: Project Initialization & Environment Setup
**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Step 1: Scaffold Next.js project dependencies**
Set up `package.json` with Next.js, React, Tailwind CSS, Lucide Icons, Prisma, and Vitest.
Run: `npm install`
Expected: Dependencies installed with zero errors.

**Step 2: Configure Vitest and verification smoke test**
Run: `npx vitest run`
Expected: Test runner initiates and passes.

**Step 3: Commit**
```bash
git add .
git commit -m "chore: initialize nextjs project with tailwind and vitest"
```

---

### Task 2: Hiley Formula Dynamic Calculator Engine (TDD)
**Files:**
- Create: `src/lib/calculations/hiley.ts`
- Test: `tests/calculations/hiley.test.ts`

**Step 1: Write failing tests for Hiley Formula calculations**
Test calculation of:
1. Impact efficiency $\eta = \frac{W + e^2 P}{W + P}$
2. Ultimate capacity $R_u = \frac{\eta W H}{S + C/2}$
3. Safe working load $R_a = \frac{R_u}{FS}$
4. Target Set per 10 blows $S_{10} = 10 \cdot \left(\frac{\eta W H}{FS \cdot R_a} - \frac{C}{2}\right)$
5. Sensitivity table generation for varying drop heights $H$ and temporary compressions $C$.

**Step 2: Run test to verify it fails**
Run: `npx vitest run tests/calculations/hiley.test.ts`
Expected: FAIL (module not implemented)

**Step 3: Implement Hiley calculation engine**
Implement complete mathematical logic with safety checks for zero division and negative sets.

**Step 4: Run test to verify it passes**
Run: `npx vitest run tests/calculations/hiley.test.ts`
Expected: PASS (100% assertions satisfied)

**Step 5: Commit**
```bash
git add src/lib/calculations/hiley.ts tests/calculations/hiley.test.ts
git commit -m "feat(calc): implement and verify hiley formula calculation engine"
```

---

### Task 3: QA/QC Tolerance & Deviation Engine (TDD)
**Files:**
- Create: `src/lib/calculations/qaqc.ts`
- Test: `tests/calculations/qaqc.test.ts`

**Step 1: Write failing tests for QA/QC evaluations**
Test:
1. Plumbness evaluation: $Plumbness \le Tolerance\%$ -> Pass/Fail.
2. Net deviation: $\Delta = \sqrt{\Delta X^2 + \Delta Y^2}$.
3. Tolerance triage: Normal ($\le 5\text{ cm}$), Warning ($5 - 10\text{ cm}$), Critical ($> 10\text{ cm}$).
4. Configurable threshold overrides per project settings.

**Step 2: Run test to verify it fails**
Run: `npx vitest run tests/calculations/qaqc.test.ts`
Expected: FAIL

**Step 3: Implement QA/QC tolerance engine**
Implement deviation calculations, status tagging, and plumbness verification logic.

**Step 4: Run test to verify it passes**
Run: `npx vitest run tests/calculations/qaqc.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/lib/calculations/qaqc.ts tests/calculations/qaqc.test.ts
git commit -m "feat(qc): implement and verify qaqc tolerance and deviation engine"
```

---

### Task 4: Prisma Database Schema & Initial Data Seeding
**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`

**Step 1: Define Prisma Schema**
Define models: `Project`, `ProjectSettings`, `DrivingCriteria`, `Pile`, `DrivingRecord`, `QCInspection`.

**Step 2: Run migration and generate Prisma Client**
Run: `npx prisma db push`
Expected: Database schema created successfully in local SQLite file.

**Step 3: Seed standard prestressed concrete pile profiles**
Seed standard Thai construction pile types (I-22, I-26, I-30, Sq-26, Sq-30, Spun 400) and sample demo project.
Run: `npx prisma db seed`
Expected: Seed completed with initial project and pile records.

**Step 4: Commit**
```bash
git add prisma/ src/lib/db.ts
git commit -m "feat(db): setup prisma schema and initial pile data seed"
```

---

### Task 5: Interactive Hiley Calculator UI & Preset Manager
**Files:**
- Create: `src/components/calculator/HileyCalculator.tsx`
- Create: `src/components/calculator/SensitivityTable.tsx`
- Create: `src/app/calculator/page.tsx`

**Step 1: Build Hiley Calculator UI component**
- Input form for Pile parameters ($A$, $L$, $P$, $E$), Hammer parameters ($W$, $H$), Cushion ($e$), and Design Load ($R_a$, $FS$).
- Interactive dropdown to pick standard preset piles or enter custom dimensions.
- Target Set display card with prominent 10-Blow target (cm and mm).

**Step 2: Build Sensitivity Matrix Component**
- Matrix displaying target set across varying Drop Heights ($H \pm 20\text{ cm}$) and Compressions ($C \pm 0.5\text{ cm}$).

**Step 3: Verify in browser**
Run Next.js dev server, test input values, verify real-time recalculation without page reload.

**Step 4: Commit**
```bash
git add src/components/calculator/ src/app/calculator/
git commit -m "feat(ui): add interactive hiley calculator and sensitivity matrix"
```

---

### Task 6: Mobile-First Field Pile Driving Record Form
**Files:**
- Create: `src/components/driving/BlowCountInput.tsx`
- Create: `src/components/driving/DrivingRecordForm.tsx`
- Create: `src/components/driving/DepthSoilChart.tsx`
- Create: `src/app/piles/[id]/drive/page.tsx`

**Step 1: Implement Rapid Blow Count Logger**
- Meter-by-meter blow count input with quick numeric increment buttons.
- Real-time soil resistance curve plotting depth vs blows.

**Step 2: Implement Last 10 Blows & Real-time Verification**
- Inputs for measured 10-Blow Set and measured temporary compression $C$.
- Instant smart badge indicator: 🟢 **PASS** vs 🔴 **RE-DRIVE REQUIRED**.

**Step 3: Verify status feedback**
Submit test records and verify database persistence and instant UI validation badges.

**Step 4: Commit**
```bash
git add src/components/driving/ src/app/piles/[id]/drive/
git commit -m "feat(ui): add mobile-friendly pile driving record log with real-time pass/fail"
```

---

### Task 7: QA/QC Inspection & As-built Deviation Form
**Files:**
- Create: `src/components/qc/DeviationCalculatorInput.tsx`
- Create: `src/components/qc/QCInspectionForm.tsx`
- Create: `src/app/piles/[id]/qc/page.tsx`

**Step 1: Implement Coordinate & Deviation Input**
- Input fields for Designed $(X, Y)$ and As-built $(X, Y)$ coordinates.
- Dynamic calculation of $\Delta X$, $\Delta Y$, and Net Deviation $\Delta$.
- Automatic status badge: 🟢 Pass / 🟡 Warning / 🔴 Critical.

**Step 2: Implement Plumbness & Visual Checklist**
- Verticality $X, Y$ percentages.
- Weld joint check & physical head condition with photo upload preview.

**Step 3: Commit**
```bash
git add src/components/qc/ src/app/piles/[id]/qc/
git commit -m "feat(qc): add site inspection and as-built deviation check form"
```

---

### Task 8: Construction Manager Overview Dashboard & Pile Grid
**Files:**
- Create: `src/components/dashboard/ProjectKpiCards.tsx`
- Create: `src/components/dashboard/PileTableGrid.tsx`
- Create: `src/components/dashboard/FilterBar.tsx`
- Create: `src/app/dashboard/page.tsx`

**Step 1: Implement KPI Summary Cards**
- Total Piles, Completed %, Set Passed %, Warning/Critical Deviation counts.

**Step 2: Implement Filterable Pile Grid**
- Filter by Grid Line, Status, Set Status, and Deviation Triage.
- Quick navigation to individual pile details.

**Step 3: Commit**
```bash
git add src/components/dashboard/ src/app/dashboard/
git commit -m "feat(dashboard): add CM executive dashboard and pile status grid"
```

---

### Task 9: Professional Engineering Reports (PDF & Excel Export)
**Files:**
- Create: `src/lib/reports/pdfGenerator.ts`
- Create: `src/lib/reports/excelGenerator.ts`
- Create: `src/components/reports/ExportReportButtons.tsx`

**Step 1: Build Daily Pile Driving Log PDF Template**
- Professional header with project title, contractor, consultant, pile details table, Last 10 Blows results, and 4-tier signature blocks.

**Step 2: Build Individual Pile Certificate PDF**
- Detailed single-page certificate containing Hiley design criteria, penetration graph, and QC inspection summary.

**Step 3: Build Deviation Summary Excel (.xlsx) Exporter**
- Formatted Excel sheet ready for submission to structural consultants.

**Step 4: Commit**
```bash
git add src/lib/reports/ src/components/reports/
git commit -m "feat(reports): add PDF and Excel engineering report generator"
```

---

### Task 10: PWA Configuration & Offline Field Resilience
**Files:**
- Create: `public/manifest.json`
- Create: `src/app/offline/page.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Configure PWA Manifest and Service Worker**
- Enable Add-to-Home-Screen on iOS/Android devices.
- Cache core app shell and calculation engines for zero-latency offline performance.

**Step 2: Verify offline readiness**
Simulate offline network mode in browser dev tools; verify calculations and form caching work without network.

**Step 3: Commit**
```bash
git add public/manifest.json src/app/offline/
git commit -m "feat(pwa): add progressive web app manifest and offline caching"
```
