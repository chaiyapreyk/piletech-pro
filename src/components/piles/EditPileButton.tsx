'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit3, X, Save, Loader2 } from 'lucide-react';

export interface EditPileCriteriaOption {
  id: string;
  name?: string | null;
  pileType: string;
  safeWorkingLoadT: number;
  targetSet10BlowsCm: number;
  dropHeightCm?: number;
  hammerWeightT?: number;
}

interface EditPileButtonProps {
  pile: {
    id: string;
    pileNo: string;
    gridLine: string;
    building?: string | null;
    status: string;
    criteriaId?: string | null;
    criteria?: {
      id?: string;
      name?: string | null;
      pileType: string;
      safeWorkingLoadT: number;
      targetSet10BlowsCm: number;
    } | null;
  };
  criteriaList?: EditPileCriteriaOption[];
  className?: string;
}

export default function EditPileButton({
  pile,
  criteriaList = [],
  className = '',
}: EditPileButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pileNo, setPileNo] = useState(pile.pileNo);
  const [gridLine, setGridLine] = useState(pile.gridLine);
  const [building, setBuilding] = useState(pile.building || 'Building A');
  const [status, setStatus] = useState(pile.status);
  const [criteriaId, setCriteriaId] = useState(
    pile.criteriaId || pile.criteria?.id || criteriaList[0]?.id || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if pile prop changes
  useEffect(() => {
    setPileNo(pile.pileNo);
    setGridLine(pile.gridLine);
    setBuilding(pile.building || 'Building A');
    setStatus(pile.status);
    setCriteriaId(pile.criteriaId || pile.criteria?.id || criteriaList[0]?.id || '');
  }, [pile, criteriaList]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedCriteria = useMemo(
    () => criteriaList.find((c) => c.id === criteriaId),
    [criteriaList, criteriaId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pileNo.trim() || !gridLine.trim()) {
      alert('กรุณากรอกรหัสเสาเข็มและ Grid Line');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/piles/${pile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pileNo: pileNo.trim(),
          gridLine: gridLine.trim(),
          building: building.trim(),
          status,
          criteriaId: criteriaId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update pile');
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={`แก้ไขข้อมูลเสาเข็ม ${pile.pileNo}`}
        className={`inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition shadow-2xs ${className}`}
      >
        <Edit3 className="w-3 h-3" />
        <span>แก้ไข</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 text-left">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-indigo-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-base font-black">
                  แก้ไขข้อมูลเสาเข็ม: {pile.pileNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัส / หมายเลขเสาเข็ม (Pile No.)
                </label>
                <input
                  type="text"
                  required
                  value={pileNo}
                  onChange={(e) => setPileNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ตำแหน่งกริดไลน์ (Grid Line)
                </label>
                <input
                  type="text"
                  required
                  value={gridLine}
                  onChange={(e) => setGridLine(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อาคาร / โซน (Building / Zone)
                </label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สถานะการตอก (Status)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PLANNED">PLANNED (วางแผน/รอตอก)</option>
                  <option value="PENDING">PENDING (ยังไม่ตอก)</option>
                  <option value="DRIVING">DRIVING (กำลังตอก)</option>
                  <option value="DRIVEN">DRIVEN (ตอกเสร็จแล้ว)</option>
                  <option value="COMPLETED">COMPLETED (เสร็จสมบูรณ์)</option>
                  <option value="ISSUE">ISSUE (พบปัญหา/รอ Re-drive)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ขนาดเสาเข็ม / รายการคำนวณ (Pile Size & Criteria)
                  </label>
                  <Link
                    href="/calculator"
                    target="_blank"
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                  >
                    + ไปจัดการในสูตร Hiley
                  </Link>
                </div>
                {criteriaList.length > 0 ? (
                  <select
                    value={criteriaId}
                    onChange={(e) => setCriteriaId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {criteriaList.map((crit) => (
                      <option key={crit.id} value={crit.id}>
                        {crit.name || crit.pileType} (Ra: {crit.safeWorkingLoadT}t, S₁₀ ≤ {crit.targetSet10BlowsCm}cm)
                      </option>
                    ))}
                    <option value="">-- ไม่ระบุสเปก (Unassigned) --</option>
                  </select>
                ) : (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    ยังไม่มีรายการคำนวณในโครงการ
                  </p>
                )}
              </div>

              {selectedCriteria && (
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Safe Load (Ra)</span>
                    <span className="font-bold text-indigo-950">{selectedCriteria.safeWorkingLoadT} ตัน</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Target Set (S₁₀)</span>
                    <span className="font-bold text-amber-600 font-mono">≤ {selectedCriteria.targetSet10BlowsCm} cm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Drop / Hammer</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {selectedCriteria.dropHeightCm}cm / {selectedCriteria.hammerWeightT}t
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>บันทึกการแก้ไข</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
