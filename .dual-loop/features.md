# Feature Registry & Locked Verification Criteria (PileTech Pro)

ตารางรายการฟีเจอร์และเกณฑ์การทดสอบที่ล็อกไว้ (Locked Verification Criteria)
สถานะที่เป็นไปได้: `Pending` | `In-Progress` | `Passed` | `Failed`

---

| ID | ฟีเจอร์ (Feature Description) | สถานะ (Status) | Locked Checks (ไฟล์และเงื่อนไขทดสอบ) |
|---|---|---|---|
| `FEAT-001` | Baseline Verification & Health Check | `Passed` | `npm run test` (83 tests passed across 12 files) |
| `FEAT-002` | Equalizer Method (Multi-band Audio-style Slider UI for Penetration Blows) | `Passed` | `tests/drivingEqualizer.test.ts` & `npm run test` (86 tests passed across 13 files, `npm run build` zero-error) |
