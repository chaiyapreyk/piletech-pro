# Design Document: Construction Pile Engineering & QA/QC Tool

- **Date**: 2026-09-05
- **Author**: Construction Engineering Software Team
- **Target Role**: Field Engineers (วิศวกรหน้างาน) & Construction Managers (CM)
- **Status**: Approved by User

---

## 1. Executive Summary & Objective

The **Construction Pile Engineering & QA/QC Tool** is a field-oriented, responsive full-stack web application designed to eliminate calculation errors, replace paper driving records, automate QA/QC tolerance evaluations, and provide Construction Managers with real-time site oversight.

### Key Pain Points Solved
1. **Calculation Errors**: Manual Hiley's formula calculations and table lookups at site lead to inaccurate Target Set requirements.
2. **Delayed Set Verification**: Field engineers often determine whether a pile has met final set after the rig moves away. The app computes and validates Last 10 Blows in real time (🟢 Pass / 🔴 Fail).
3. **Manual QA/QC & Tolerance Tracking**: Tracking pile verticality and eccentricity (deviation) across hundreds of piles on paper is error-prone. The app automates deviation calculations ($\Delta = \sqrt{\Delta X^2 + \Delta Y^2}$) and flags out-of-tolerance piles immediately.
4. **Scattered Records & Delayed Reporting**: Preparing daily driving logs for consultants takes hours. The app provides 1-click generation of signed Daily Pile Driving Reports and Individual Pile As-Built Certificates in PDF and Excel formats.

---

## 2. System Architecture & Free-Tier Strategy

### 2.1 Technology Stack
- **Frontend & API Gateway**: **Next.js 14/15** (App Router, React 19/18, TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI components).
- **Progressive Web App (PWA)**: Offline-first service worker cache. Allows field engineers to enter data even when cellular signal drops on deep foundation sites.
- **Database & ORM**: **Prisma ORM** with dual-target capability:
  - *Local Development / Zero-cost initial deploy*: SQLite (`better-sqlite3` or Turso libSQL).
  - *Cloud Production Deploy*: PostgreSQL via Supabase or Neon.
- **Reporting Engine**: `@react-pdf/renderer` / `jspdf` for client/serverless PDF rendering and `xlsx` for Excel export.
- **Charting**: `Recharts` for dynamic Blow Count vs Depth soil resistance profiles.

### 2.2 100% Free-Tier Deployment Strategy
- **Hosting**: Vercel Hobby Tier ($0/month) — includes global CDN, automatic HTTPS, and serverless compute.
- **Database & Auth**: Supabase Free Tier ($0/month) — provides 500 MB Postgres database, authentication for up to 50,000 monthly active users, and 1 GB object storage for site inspection photos.
- **Future Paid Upgrade Path (SaaS Expansion)**:
  - Upgrade Supabase to Pro ($25/month) when projects exceed 500 MB or need dedicated compute.
  - Multi-tenant Organization management for construction firms.
  - Custom contractor branding on exported PDF documents.
  - Role-based permissions (Admin, Project Manager, Site Engineer, Consultant Read-Only).

---

## 3. Core Engineering Modules

### 3.1 Module 1: Hiley's Dynamic Formula Calculator
Computes the Ultimate Bearing Capacity ($R_u$) and Allowable Working Load ($R_a$), as well as the Target Set per 10 blows ($S_{10}$):

$$R_u = \frac{\eta \cdot W \cdot H}{S + \frac{C}{2}}$$

$$R_a = \frac{R_u}{FS}$$

Where:
- $W$: Ram / Hammer weight (tons)
- $H$: Drop height / stroke (cm)
- $P$: Pile weight + helmet weight (tons)
- $e$: Coefficient of restitution for cushion material (configurable, default 0.25 - 0.40)
- $\eta$: Hammer impact efficiency:
  $$\eta = \frac{W + e^2 P}{W + P} \quad (\text{for } W > e P)$$
- $C$: Total temporary elastic compression ($C = C_1 + C_2 + C_3$ or field-measured paper trace)
- $S$: Final set per blow (cm)
- $FS$: Factor of Safety (configurable, default 2.5)

**Outputs**:
- Target Set per 10 blows: $S_{10} = 10 \cdot S$ (cm or mm)
- Sensitivity Table: Evaluates target set variations when drop height $H$ or compression $C$ fluctuates on site.

### 3.2 Module 2: Field Pile Driving Record Log
- **Identification**: Pile Number, Grid Line (e.g., A-1, B-4), Casting Date, Driving Date & Time.
- **Blow Count Logging**:
  - Incremental blow count per 1 meter of penetration from ground surface to tip elevation.
  - Dynamic Soil-Resistance Graph (Blows vs Depth) plotting in real time.
- **Final Set Validation**:
  - Field entry of Last 10 Blows measurement (cm) and field-measured elastic compression ($C$).
  - **Instant Smart Status**:
    - 🟢 **PASS**: Measured Set $\le$ Target Set.
    - 🔴 **FAIL / RE-DRIVE**: Measured Set > Target Set.

### 3.3 Module 3: QA/QC & Tolerance Engine
- **Verticality / Plumbness**:
  - Dual-axis ($X$ and $Y$) plumbness measurement (%).
  - Evaluated against project tolerance (configurable, default $\le 1.0\%$ or 1:100).
- **Position Eccentricity (Deviation)**:
  - Coordinate comparison: Designed $(X_{des}, Y_{des})$ vs As-built $(X_{act}, Y_{act})$.
  - Net deviation: $\Delta = \sqrt{(X_{act} - X_{des})^2 + (Y_{act} - Y_{des})^2}$.
  - **Automated Risk Triage**:
    - $\Delta \le 5.0\text{ cm}$: 🟢 **Normal / Pass**
    - $5.0\text{ cm} < \Delta \le 10.0\text{ cm}$: 🟡 **Warning** (Requires structural engineer review for footing moment capacity)
    - $\Delta > 10.0\text{ cm}$: 🔴 **Critical** (Flagged for remedial pile addition or footing redesign)
- **Visual & Joint Integrity**:
  - Splice joint weld inspection checklist (full penetration, no slag inclusion).
  - Concrete integrity check (spalling, hairline crack, pile head damage) with on-site photo capture.

---

## 4. Data Model & Schema

```prisma
model Project {
  id              String           @id @default(cuid())
  name            String
  code            String           @unique
  location        String?
  clientName      String?
  consultantName  String?
  contractorName  String?
  settings        ProjectSettings?
  piles           Pile[]
  criteria        DrivingCriteria[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model ProjectSettings {
  id                    String   @id @default(cuid())
  projectId             String   @unique
  project               Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  defaultSafetyFactor   Float    @default(2.5)
  maxPlumbnessPercent   Float    @default(1.0) // 1:100
  devNormalThresholdCm  Float    @default(5.0)
  devCriticalThresholdCm Float   @default(10.0)
}

model DrivingCriteria {
  id                String   @id @default(cuid())
  projectId         String
  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  pileType          String   // e.g. "I-0.26", "Square 0.35", "Spun 0.40"
  safeWorkingLoadT  Float    // Ra in tons
  safetyFactor      Float    @default(2.5)
  hammerWeightT     Float    // W in tons
  dropHeightCm      Float    // H in cm
  cushionCoeffE     Float    @default(0.25)
  tempCompressionC  Float    // C in cm
  targetSet10BlowsCm Float   // Calculated S10
  piles             Pile[]
}

model Pile {
  id              String           @id @default(cuid())
  projectId       String
  project         Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  criteriaId      String?
  criteria        DrivingCriteria? @relation(fields: [criteriaId], references: [id])
  pileNo          String           // e.g. "P-042"
  gridLine        String           // e.g. "B-3"
  status          String           @default("PLANNED") // PLANNED, DRIVING, COMPLETED, ISSUE
  castDate        DateTime?
  driveDate       DateTime?
  drivingRecord   DrivingRecord?
  qcInspection    QCInspection?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model DrivingRecord {
  id                String   @id @default(cuid())
  pileId            String   @unique
  pile              Pile     @relation(fields: [pileId], references: [id], onDelete: Cascade)
  penetrationBlows  String   // JSON array of blow counts per meter
  measuredLast10Cm  Float    // Measured set for last 10 blows
  measuredTempCCm   Float?   // Measured C
  drivenLengthM     Float
  cutOffLevelM      Float?
  groundLevelM      Float?
  tipLevelM         Float?
  isSetPassed       Boolean
  inspectorName     String?
  notes             String?
}

model QCInspection {
  id                String   @id @default(cuid())
  pileId            String   @unique
  pile              Pile     @relation(fields: [pileId], references: [id], onDelete: Cascade)
  plumbnessXPercent Float?
  plumbnessYPercent Float?
  isPlumbnessPassed Boolean  @default(true)
  designCoordX      Float?
  designCoordY      Float?
  actualCoordX      Float?
  actualCoordY      Float?
  netDeviationCm    Float?
  deviationStatus   String   @default("NORMAL") // NORMAL, WARNING, CRITICAL
  jointWeldStatus   String   @default("PASS")   // PASS, FAIL, NA
  headDamageStatus  String   @default("NONE")   // NONE, MINOR, SEVERE
  photoUrls         String?  // JSON array of photo URLs
  inspectorName     String?
  approvedByCM      Boolean  @default(false)
}
```

---

## 5. UI/UX Workflow & Reporting

### 5.1 Mobile Field View (Site Engineer)
- Simplified high-contrast layout for sunlight readability.
- Rapid numeric input with quick step progression (Blows -> Last 10 Blows -> As-built Coordinates).
- Real-time status indicators (Instant Set validation).

### 5.2 Desktop & Tablet View (Construction Manager)
- Project KPI cards: Total Piles, Completed, In-Progress, Set Passed %, Deviation Issues.
- Interactive Pile Grid with status color coding (Green: Pass, Yellow: Warning, Red: Action required).
- Inspection approval workflow and quick PDF/Excel export.

### 5.3 Reporting Engine Deliverables
1. **Daily Pile Driving Summary Report**: Formal PDF log with signature blocks for Site Engineer, QA/QC Inspector, CM, and Consultant.
2. **Individual Pile Certificate**: Complete engineering sheet including Hiley calculation parameters, Blows vs Depth chart, and QC photo proof.
3. **Eccentricity & Deviation Table**: Structured Excel (.xlsx) data export for structural designers.

---

## 6. Verification & Quality Assurance Plan
- **Calculation Verification**: Unit tests cross-checking Hiley calculation results against certified civil engineering design tables.
- **Offline Data Integrity**: Tests confirming that local storage caches input during network disconnections and syncs cleanly upon reconnection.
- **Tolerance Bounds**: Automated testing of deviation and plumbness thresholds ensuring all edge cases (exact threshold values, zero deviation, extreme offsets) trigger correct status badges.
