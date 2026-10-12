# Dual-Loop Execution Program & Guidelines (PileTech Pro)

## 1. System Objective & Overview (เป้าหมายและภาพรวม)
- **Project**: PileTech Pro (Construction Pile Engineering Tool)
- **Architecture**: Dual-Loop Engineering (Karpathy Auto-Researcher + Meta-Loop Self-Evolution)
- **Inner Loop**: Autonomous Subagent builds features and verifies against locked checks/tests.
- **Outer Loop**: Meta-learning agent reviews execution logs (`results.jsonl`), extracts habits/patterns, and evolves `program.md`.

---

## 2. The 4 Immutable Rules (ข้อกำหนดเหล็ก 4 ประการ)
1. **Locked Checks Only**: 에เจนต์ห้ามแก้ไขไฟล์ทดสอบใน `tests/` หรือชุด Checks เด็ดขาด (Strictly Read-Only).
2. **Context Isolation**: แต่ละฟีเจอร์ต้องรันด้วย Fresh Subagent แยกบริบทชัดเจน ไม่นำขยะ context มาปนกัน.
3. **Autonomous Rollback**: หาก Checks ไม่ผ่าน ให้ทำการ `git checkout -- .` / `git revert` กลับสู่สถานะ baseline ที่เสถียรล่าสุดก่อนลองใหม่ (จำกัดรอบ retry 3-5 ครั้ง).
4. **Strict Learning Boundary**: Outer Loop ปรับแต่งได้เฉพาะหัวข้อ `Learned Habits & Working Rules` ด้านล่างเท่านั้น ห้ามลดทอนเกณฑ์การทดสอบ.

---

## 3. Project Toolchain & Verification Commands (คำสั่งตรวจสอบ)
- **Unit & Integration Tests**: `npm run test` (Vitest)
- **Database Schema Sync**: `npm run prisma:generate`
- **Build Check**: `npm run build`

---

## 4. Learned Habits & Working Rules (นิสัยและกฎการทำงานที่เรียนรู้)
*(Outer Loop จะอัปเดตกฎและแนวทางแก้ไขข้อผิดพลาดซ้ำซากที่นี่โดยอัตโนมัติ / The Meta-Loop dynamically updates recurring habits here)*

- **[Baseline Rule]**: ตรวจสอบ TypeScript Types และ Database Schema ให้ตรงกันเสมอเมื่อมี schema changes.
- **[Baseline Rule]**: ก่อนแก้โค้ด ให้รัน `npm run test` ล่วงหน้าเพื่อยืนยัน baseline ปัจจุบัน.
- **[Baseline Rule]**: ให้คงคอมเมนต์และฟังก์ชันที่มีอยู่เดิมไว้เสมอ (Documentation integrity).
