'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DepthSoilChart from './DepthSoilChart';
import DecimalRollingPicker from '@/components/ui/DecimalRollingPicker';
import {
  CheckCircle2,
  XCircle,
  Save,
  HardHat,
  Check,
  ArrowLeft,
  Disc3,
  Keyboard,
  Calculator,
  Sparkles,
  Layers,
  AlertTriangle,
  Wifi,
  WifiOff,
  Plus,
  Minus,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastProvider';
import ConfirmModal from '@/components/ui/ConfirmModal';
import GuidedFieldModeModal from './GuidedFieldModeModal';
import {
  createDrivingDraft,
  getBrowserDraftStorage,
  readDrivingDraft,
  removeDrivingDraft,
  saveDrivingDraft,
  type DrivingDraftForm,
} from '@/lib/drivingDrafts';
import {
  calculateDerivedGeometry,
  applyManualTipOverride,
} from '@/lib/calculations/pileGeometry';
import { ensureMinimumIntervals } from '@/lib/calculations/drivingEqualizer';

interface PileData {
  id: string;
  projectId: string;
  pileNo: string;
  gridLine: string;
  building?: string | null;
  status: string;
  criteria?: {
    id?: string;
    name?: string | null;
    pileType: string;
    safeWorkingLoadT: number;
    targetSet10BlowsCm: number;
    dropHeightCm: number;
    hammerWeightT: number;
  } | null;
  drivingRecord?: {
    penetrationBlows: string;
    recordUnit?: string | null;
    recordScope?: string | null;
    windowLengthFt?: number | null;
    measuredLast10Cm: number;
    measuredTempCCm?: number | null;
    drivenLengthM: number;
    totalPileLengthM?: number | null;
    stickUpLengthM?: number | null;
    cutOffLevelM?: number | null;
    groundLevelM?: number | null;
    tipLevelM?: number | null;
    inspectorName?: string | null;
    notes?: string | null;
    isSetPassed: boolean;
    updatedAt?: Date | string;
  } | null;
}

export default function DrivingRecordForm({ pile }: { pile: PileData }) {
  const router = useRouter();
  const toast = useToast();
  const initialBlows: (number | null)[] = pile.drivingRecord?.penetrationBlows
    ? ensureMinimumIntervals(JSON.parse(pile.drivingRecord.penetrationBlows), 20)
    : ensureMinimumIntervals([], 20);

  const [blowCounts, setBlowCounts] = useState<(number | null)[]>(initialBlows);
  // Normalize DB unit: default to FEET unless explicitly saved as METER
  const getInitialRecordUnit = (): 'METER' | 'FEET' => {
    const raw = pile.drivingRecord?.recordUnit?.toUpperCase()?.trim();
    if (raw === 'METER') return 'METER';
    if (raw === 'FEET' || raw === 'FT') return 'FEET';
    return 'FEET';
  };

  const [recordUnit, setRecordUnit] = useState<'METER' | 'FEET'>(getInitialRecordUnit);
  const [recordScope, setRecordScope] = useState<'FULL' | 'WINDOW'>(
    (pile.drivingRecord?.recordScope as 'FULL' | 'WINDOW') || 'WINDOW'
  );
  const [windowLength, setWindowLength] = useState<number>(
    pile.drivingRecord?.windowLengthFt || 20
  );

  const initialMeasuredLast10 = pile.drivingRecord?.measuredLast10Cm ?? 5.0;
  const [measuredLast10, setMeasuredLast10] = useState<number>(initialMeasuredLast10);
  const [last10Rounds, setLast10Rounds] = useState<[number | null, number | null, number | null]>([
    initialMeasuredLast10,
    initialMeasuredLast10,
    initialMeasuredLast10,
  ]);
  const [measuredTempC, setMeasuredTempC] = useState<number>(
    pile.drivingRecord?.measuredTempCCm ?? 1.2
  );

  // Engineering Elevations & Pile Dimensions
  const [totalPileLength, setTotalPileLength] = useState<number>(
    pile.drivingRecord?.totalPileLengthM ?? 21.0
  );
  // Auto-calculated Stick-up from recorded table: only counts recorded/penetrated steps (blows > 0)
  const validDrivenStepsCount = blowCounts.filter((b): b is number => typeof b === 'number' && b > 0).length;
  const isWindowScope = recordScope === 'WINDOW';
  
  // In WINDOW mode (e.g. 20 ft): remaining unpenetrated feet = windowLength - validDrivenStepsCount
  const remainingFeetInWindow = Math.max(0, windowLength - validDrivenStepsCount);
  const calculatedStickUpFromTable = isWindowScope
    ? (recordUnit === 'FEET'
        ? Number((remainingFeetInWindow * 0.3048).toFixed(2))
        : Number(Math.max(0, (windowLength * 0.3048) - validDrivenStepsCount).toFixed(2)))
    : Number(Math.max(0, (Number(totalPileLength) || 21) - (recordUnit === 'FEET' ? validDrivenStepsCount * 0.3048 : validDrivenStepsCount)).toFixed(2));

  // Determine if stick-up was manually overridden by user or should auto-sync from table
  const [isStickUpAuto, setIsStickUpAuto] = useState<boolean>(
    pile.drivingRecord?.stickUpLengthM !== undefined && pile.drivingRecord?.stickUpLengthM !== null ? false : true
  );
  const [manualStickUpLength, setManualStickUpLength] = useState<number>(
    pile.drivingRecord?.stickUpLengthM ?? 0.50
  );

  const activeStickUp = isStickUpAuto ? calculatedStickUpFromTable : manualStickUpLength;

  const [groundLevel, setGroundLevel] = useState<number>(
    pile.drivingRecord?.groundLevelM ?? 3.00
  );
  const [cutOffLevel, setCutOffLevel] = useState<number>(
    pile.drivingRecord?.cutOffLevelM ?? 2.50
  );
  const [isTipLevelAuto, setIsTipLevelAuto] = useState<boolean>(true);
  const [manualTipLevel, setManualTipLevel] = useState<number>(
    pile.drivingRecord?.tipLevelM ?? -17.50
  );

  const [inspectorName, setInspectorName] = useState<string>(
    pile.drivingRecord?.inspectorName || 'สมชาย วิศวกรสนาม'
  );
  const [notes, setNotes] = useState<string>(pile.drivingRecord?.notes || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isFieldModeOpen, setIsFieldModeOpen] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [conflict, setConflict] = useState<{
    serverUpdatedAt: string | null;
  } | null>(null);
  const [isOverwriteConfirmOpen, setIsOverwriteConfirmOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  // Local Draft Autosave State & Lifecycle
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);

  const draftIdentity = {
    projectId: pile.projectId,
    pileId: pile.id,
    pileNo: pile.pileNo,
    gridLine: pile.gridLine,
    building: pile.building,
  };
  const initialServerRecordUpdatedAt = pile.drivingRecord?.updatedAt
    ? new Date(pile.drivingRecord.updatedAt).toISOString()
    : null;
  const [draftServerRecordUpdatedAt, setDraftServerRecordUpdatedAt] = useState<string | null>(initialServerRecordUpdatedAt);

  const getCurrentDraftForm = (): DrivingDraftForm => ({
    blowCounts,
    recordUnit,
    recordScope,
    windowLength,
    measuredLast10,
    measuredLast10Rounds: [
      last10Rounds[0] ?? measuredLast10,
      last10Rounds[1] ?? measuredLast10,
      last10Rounds[2] ?? measuredLast10,
    ],
    measuredTempC,
    totalPileLength,
    isStickUpAuto,
    manualStickUpLength,
    groundLevel,
    cutOffLevel,
    isTipLevelAuto,
    manualTipLevel,
    inspectorName,
    notes,
  });

  const applyDraftForm = (draft: DrivingDraftForm) => {
    setBlowCounts(draft.blowCounts);
    setRecordUnit(draft.recordUnit);
    setRecordScope(draft.recordScope);
    setWindowLength(draft.windowLength);
    setMeasuredLast10(draft.measuredLast10);
    if (draft.measuredLast10Rounds && Array.isArray(draft.measuredLast10Rounds)) {
      setLast10Rounds([
        draft.measuredLast10Rounds[0] ?? draft.measuredLast10,
        draft.measuredLast10Rounds[1] ?? draft.measuredLast10,
        draft.measuredLast10Rounds[2] ?? draft.measuredLast10,
      ]);
    } else {
      setLast10Rounds([draft.measuredLast10, draft.measuredLast10, draft.measuredLast10]);
    }
    setMeasuredTempC(draft.measuredTempC);
    setTotalPileLength(draft.totalPileLength);
    setIsStickUpAuto(draft.isStickUpAuto);
    setManualStickUpLength(draft.manualStickUpLength);
    setGroundLevel(draft.groundLevel);
    setCutOffLevel(draft.cutOffLevel);
    setIsTipLevelAuto(draft.isTipLevelAuto);
    setManualTipLevel(draft.manualTipLevel);
    setInspectorName(draft.inspectorName);
    setNotes(draft.notes);
  };

  const handleSaveDraft = async () => {
    const storage = getBrowserDraftStorage();
    if (!storage) {
      toast.error('Draft storage is unavailable in this browser');
      return;
    }

    setIsDraftSaving(true);
    try {
      saveDrivingDraft(storage, createDrivingDraft({
        ...draftIdentity,
        form: getCurrentDraftForm(),
        serverRecordUpdatedAt: draftServerRecordUpdatedAt,
      }));
      setHasDraft(true);
      setDraftSavedTime(new Date().toLocaleTimeString());
      toast.success('Draft saved on this device');
    } catch {
      toast.error('Unable to save Draft on this device');
    } finally {
      setIsDraftSaving(false);
    }
  };

  const restoreStoredDraft = () => {
    const storage = getBrowserDraftStorage();
    const saved = storage ? readDrivingDraft(storage, draftIdentity) : null;
    if (!saved) {
      toast.info('No Draft was found for this pile');
      return;
    }
    applyDraftForm(saved.form);
    setDraftServerRecordUpdatedAt(saved.serverRecordUpdatedAt);
    setHasDraft(false);
    toast.success('Draft restored');
  };

  const discardStoredDraft = () => {
    const storage = getBrowserDraftStorage();
    if (storage) removeDrivingDraft(storage, draftIdentity);
    setHasDraft(false);
    setDraftSavedTime(null);
    setDraftServerRecordUpdatedAt(initialServerRecordUpdatedAt);
    toast.info('Draft discarded');
  };

  // Check for existing draft on mount
  /*
  React.useEffect(() => {
    if (false) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.blowCounts) && parsed.blowCounts.length > 0) {
          setHasDraft(true);
          setDraftSavedTime(parsed.savedAt || 'ก่อนหน้านี้');
        }
      }
    } catch {}
  }, [draftKey]);
  */

  React.useEffect(() => {
    const storage = getBrowserDraftStorage();
    const saved = storage ? readDrivingDraft(storage, draftIdentity) : null;
    setHasDraft(Boolean(saved));
    setDraftSavedTime(saved ? new Date(saved.savedAt).toLocaleTimeString() : null);
    setDraftServerRecordUpdatedAt(saved?.serverRecordUpdatedAt ?? initialServerRecordUpdatedAt);
  }, [pile.id, pile.projectId]);

  React.useEffect(() => {
    const updateOnlineState = () => setIsOnline(window.navigator.onLine);
    updateOnlineState();
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  React.useEffect(() => {
    const dismissalKey = `piletech:field-mode:dismissed:${pile.id}`;
    const storage = getBrowserDraftStorage();
    const hasStoredDraft = storage ? Boolean(readDrivingDraft(storage, draftIdentity)) : false;
    if (!hasStoredDraft && window.matchMedia('(max-width: 767px)').matches && !sessionStorage.getItem(dismissalKey)) {
      setIsFieldModeOpen(true);
    }
  }, [pile.id]);

  // Restore draft handler
  const handleRestoreDraft = () => {
    restoreStoredDraft();
    return;
    /*
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.blowCounts) setBlowCounts(parsed.blowCounts);
        if (parsed.recordUnit) setRecordUnit(parsed.recordUnit);
        if (parsed.recordScope) setRecordScope(parsed.recordScope);
        if (parsed.windowLength) setWindowLength(parsed.windowLength);
        if (parsed.measuredLast10 !== undefined) setMeasuredLast10(parsed.measuredLast10);
        if (parsed.measuredTempC !== undefined) setMeasuredTempC(parsed.measuredTempC);
        if (parsed.totalPileLength !== undefined) setTotalPileLength(parsed.totalPileLength);
        if (parsed.groundLevel !== undefined) setGroundLevel(parsed.groundLevel);
        if (parsed.cutOffLevel !== undefined) setCutOffLevel(parsed.cutOffLevel);
        if (parsed.inspectorName) setInspectorName(parsed.inspectorName);
        if (parsed.notes) setNotes(parsed.notes);
        setHasDraft(false);
        toast.success('กู้คืนข้อมูลร่างจากการบันทึกอัตโนมัติสำเร็จ');
      }
    } catch {
      toast.error('ไม่สามารถกู้คืนข้อมูลร่างได้');
    }
    */
  };

  const handleDiscardDraft = () => {
    setIsDiscardConfirmOpen(true);
    return;
    /*
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      toast.info('ล้างข้อมูลร่างเรียบร้อยแล้ว');
    } catch {}
    */
  };

  const confirmDiscardDraft = () => {
    discardStoredDraft();
    setIsDiscardConfirmOpen(false);
  };

  const closeFieldMode = () => {
    setIsFieldModeOpen(false);
    sessionStorage.setItem(`piletech:field-mode:dismissed:${pile.id}`, '1');
  };

  const handleUseServer = () => {
    const storage = getBrowserDraftStorage();
    if (storage) removeDrivingDraft(storage, draftIdentity);
    setConflict(null);
    window.location.reload();
  };

  const handleOverwriteWithDraft = () => {
    if (!conflict) return;
    setIsOverwriteConfirmOpen(true);
  };

  const confirmOverwriteWithDraft = () => {
    if (!conflict) return;
    const latestServerTimestamp = conflict.serverUpdatedAt;
    setIsOverwriteConfirmOpen(false);
    setConflict(null);
    void handleSubmit(undefined, {
      expectedRecordUpdatedAt: latestServerTimestamp,
      forceOverwrite: true,
    });
  };

  // Autosave to localStorage on changes
  /*
  React.useEffect(() => {
    if (false && (blowCounts.length > 0 || notes)) {
      const timeout = setTimeout(() => {
        try {
          const draftData = {
            blowCounts,
            recordUnit,
            recordScope,
            windowLength,
            measuredLast10,
            measuredTempC,
            totalPileLength,
            groundLevel,
            cutOffLevel,
            inspectorName,
            notes,
            savedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          };
          localStorage.setItem(draftKey, JSON.stringify(draftData));
        } catch {}
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [blowCounts, recordUnit, recordScope, windowLength, measuredLast10, measuredTempC, totalPileLength, groundLevel, cutOffLevel, inspectorName, notes, draftKey]);
  */

  // Derived Geotechnical Engineering Calculations via deep pileGeometry module
  const totalLengthNum = Number(totalPileLength) || 0;
  const stickUpNum = activeStickUp;
  const groundLevelNum = Number(groundLevel) || 0;
  const cutOffLevelNum = Number(cutOffLevel) || 0;

  const derivedGeometry = calculateDerivedGeometry({
    totalPileLengthM: totalLengthNum,
    stickUpLengthM: stickUpNum,
    groundLevelM: groundLevelNum,
    cutOffLevelM: cutOffLevelNum,
  });

  const activeGeometry = isTipLevelAuto
    ? derivedGeometry
    : applyManualTipOverride(derivedGeometry, Number(manualTipLevel) || 0, groundLevelNum);

  const computedDrivenDepth = derivedGeometry.drivenDepthM;
  const computedTipLevel = derivedGeometry.tipLevelM ?? 0;
  const computedTopLevel = derivedGeometry.actualTopLevelM ?? 0;
  const computedCutWaste = activeGeometry.cutOffWasteM ?? 0;

  const activeTipLevel = activeGeometry.tipLevelM ?? 0;
  const activeDrivenDepth = activeGeometry.drivenDepthM;

  const targetSet = pile.criteria?.targetSet10BlowsCm ?? 7.0;

  // Evaluation Rule: All recorded rounds must pass <= targetSet and be > 0
  const validRounds = last10Rounds.filter((r): r is number => typeof r === 'number' && r > 0);
  const isEvaluated = validRounds.length > 0;
  // All 3 rounds must be entered and each must be <= targetSet
  const isAllThreeFilled = last10Rounds.every((r) => typeof r === 'number' && r > 0);
  const isPassed = isAllThreeFilled && last10Rounds.every((r) => typeof r === 'number' && r > 0 && r <= targetSet);
  const avgMeasuredLast10 = validRounds.length > 0
    ? Number((validRounds.reduce((acc, curr) => acc + curr, 0) / validRounds.length).toFixed(2))
    : measuredLast10;

  const handleSubmit = async (
    e?: React.FormEvent,
    options?: { expectedRecordUpdatedAt?: string | null; forceOverwrite?: boolean }
  ) => {
    e?.preventDefault();
    const currentlyOnline = window.navigator.onLine;
    if (!currentlyOnline) {
      setIsOnline(false);
      toast.error('Save Record is unavailable while offline. Save a Draft instead.');
      return;
    }
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const cleanBlows = [...blowCounts];

      const res = await fetch(`/api/piles/${pile.id}/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penetrationBlows: cleanBlows,
          recordUnit,
          recordScope,
          windowLengthFt: recordScope === 'WINDOW' ? windowLength : null,
          measuredLast10Cm: avgMeasuredLast10,
          measuredTempCCm: measuredTempC,
          drivenLengthM: activeDrivenDepth,
          totalPileLengthM: totalLengthNum,
          stickUpLengthM: stickUpNum,
          cutOffLevelM: cutOffLevelNum,
          groundLevelM: groundLevelNum,
          tipLevelM: activeTipLevel,
          inspectorName,
          notes,
          expectedRecordUpdatedAt: options?.expectedRecordUpdatedAt ?? draftServerRecordUpdatedAt,
          forceOverwrite: options?.forceOverwrite ?? false,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        const storage = getBrowserDraftStorage();
        if (storage) removeDrivingDraft(storage, draftIdentity);
        setHasDraft(false);
        toast.success(`บันทึกผลการตอกเสาเข็ม ${pile.pileNo} สำเร็จ`);
        setTimeout(() => router.push('/piles'), 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.code === 'DRIVING_RECORD_CONFLICT') {
          setConflict({ serverUpdatedAt: data.serverUpdatedAt ?? null });
          return;
        }
        throw new Error(data.error || 'บันทึกข้อมูลการตอกไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error('Error saving record:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกผลการตอก');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Bar with Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/piles"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับหน้ารายการเสาเข็ม</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className={`hidden items-center gap-1 rounded px-2 py-1 text-[10px] font-bold sm:flex ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <button type="button" onClick={() => setIsFieldModeOpen(true)} className="hidden rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-700 sm:inline-flex">
            Field Mode
          </button>
          <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-mono font-bold">
            ID: {pile.pileNo} ({pile.gridLine})
          </span>
        </div>
      </div>

      {/* Draft Restore Notification Banner */}
      {hasDraft && (
        <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-amber-200 text-amber-900 shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h4 className="font-bold text-xs">พบข้อมูลร่างที่บันทึกไว้ในเครื่อง ({draftSavedTime})</h4>
              <p className="text-[11px] text-amber-800 opacity-90">
                คุณสามารถกู้คืนข้อมูลค่าตอกเข็มที่กรอกค้างไว้ในเครื่องนี้ได้ทันที
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-amber-100 transition"
            >
              ละทิ้งร่าง
            </button>
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-xs"
            >
              กู้คืนข้อมูลร่าง
            </button>
          </div>
        </div>
      )}

      {/* Pile Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs mb-1">
              <HardHat className="w-4 h-4" />
              <span>FIELD PILE DRIVING LOG</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800">
              บันทึกการตอก: {pile.pileNo} (Grid: {pile.gridLine})
            </h1>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 mt-1">
              <span>
                รายการคำนวณ / สเปก: <strong>{pile.criteria?.name || pile.criteria?.pileType || 'I-0.26x0.26m'}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Safe Load ออกแบบ: <strong>{pile.criteria?.safeWorkingLoadT || 30} ตัน</strong>
              </span>
              {pile.criteria?.id && (
                <>
                  <span className="text-slate-300">|</span>
                  <Link
                    href={`/calculator?criteriaId=${pile.criteria.id}`}
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 underline font-semibold inline-flex items-center gap-0.5"
                    title="เปิดหน้ารายการคำนวณ Hiley ของสเปกนี้"
                  >
                    [ดูรายการคำนวณ Hiley]
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Target Set Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-right">
            <span className="text-[11px] font-bold text-amber-800 uppercase block">
              Target Set ตามเกณฑ์ Hiley
            </span>
            <div className="text-2xl font-black text-amber-600 font-mono">
              &le; {targetSet.toFixed(2)} <span className="text-xs font-normal">cm / 10 blows</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scope, Unit Toolbar & Driving Log Bar Adjuster */}
      <div className="space-y-4">
        {/* Scope and Unit Quick Switcher Bar */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">หน่วยบันทึก:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setRecordUnit('FEET')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  recordUnit === 'FEET'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ฟุต (ft)
              </button>
              <button
                type="button"
                onClick={() => setRecordUnit('METER')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  recordUnit === 'METER'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เมตร (m)
              </button>
            </div>

            <span className="text-slate-300 mx-1 hidden sm:inline">|</span>

            <span className="text-xs font-bold text-slate-700">ขอบเขต:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setRecordScope('WINDOW')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  recordScope === 'WINDOW'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {windowLength} {recordUnit === 'FEET' ? 'ft' : 'ม.'} สุดท้าย
              </button>
              <button
                type="button"
                onClick={() => setRecordScope('FULL')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  recordScope === 'FULL'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ตลอดความยาวเสา (Full)
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ปรับค่า Blow Count ทันทีผ่านกราฟแท่งด้านล่าง</span>
          </div>
        </div>

        {/* Primary Penetration Log: Interactive Bar Adjuster & Soil Chart */}
        <DepthSoilChart
          blowCounts={blowCounts}
          onChange={setBlowCounts}
          recordUnit={recordUnit}
          recordScope={recordScope}
          windowLength={windowLength}
          criteria={pile.criteria}
        />
      </div>

      {/* Final Verification Section: 3-Round Series Last 10 Blows */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span>การวัดผล Last 10 Blows ต่อเนื่อง 3 ชุด (3-Round Series Verification)</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                10 blows/ชุด
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกระยะทรุดตัว (cm) ทั้ง 3 ชุดต่อเนื่อง โดยทุกชุดต้องผ่านเกณฑ์ Target Set &le; {targetSet.toFixed(2)} cm
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-semibold">เกณฑ์ Hiley Target:</span>
            <span className="text-xs font-black px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md font-mono">
              &le; {targetSet.toFixed(2)} cm
            </span>
          </div>
        </div>

        {/* 3-Round Inputs & Temporary Compression */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Round 1 */}
          {[0, 1, 2].map((roundIdx) => {
            const roundNumber = roundIdx + 1;
            const roundVal = last10Rounds[roundIdx];
            const isRoundPassed = roundVal !== null && roundVal > 0 && roundVal <= targetSet;
            const isRoundFailed = roundVal !== null && roundVal > targetSet;

            const updateRound = (delta: number) => {
              const current = roundVal ?? targetSet;
              const next = Math.max(0.1, Number((current + delta).toFixed(1)));
              const updated = [...last10Rounds] as [number | null, number | null, number | null];
              updated[roundIdx] = next;
              setLast10Rounds(updated);
              setMeasuredLast10(next);
            };

            return (
              <div
                key={roundIdx}
                className={`p-3.5 rounded-xl border transition ${
                  isRoundPassed
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : isRoundFailed
                    ? 'bg-rose-50/50 border-rose-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-slate-700">
                    ชุดที่ {roundNumber} (Round {roundNumber})
                  </span>
                  {roundVal !== null && roundVal > 0 ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isRoundPassed
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {isRoundPassed ? 'ผ่าน' : 'เกินเกณฑ์'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">ยังไม่ระบุ</span>
                  )}
                </div>

                <div className="relative mb-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={roundVal ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      const updated = [...last10Rounds] as [number | null, number | null, number | null];
                      updated[roundIdx] = val;
                      setLast10Rounds(updated);
                      if (val !== null) setMeasuredLast10(val);
                    }}
                    className="w-full text-lg font-black font-mono text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 pr-12"
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] font-semibold text-slate-400">
                    cm
                  </span>
                </div>

                {/* Quick Stepper Nudge */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateRound(-0.5)}
                    className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-bold transition shadow-2xs"
                    title="ลด 0.5 cm"
                  >
                    -0.5
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRound(-0.1)}
                    className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-bold transition shadow-2xs"
                    title="ลด 0.1 cm"
                  >
                    -0.1
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRound(0.1)}
                    className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-bold transition shadow-2xs"
                    title="เพิ่ม 0.1 cm"
                  >
                    +0.1
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRound(0.5)}
                    className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-bold transition shadow-2xs"
                    title="เพิ่ม 0.5 cm"
                  >
                    +0.5
                  </button>
                </div>
              </div>
            );
          })}

          {/* Temporary Compression (C) Input Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-700">
                  ค่าการยุบตัวชั่วคราว (C)
                </span>
                <span className="text-[10px] text-slate-400">Temp Comp.</span>
              </div>

              <div className="relative mb-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={measuredTempC}
                  onChange={(e) => setMeasuredTempC(parseFloat(e.target.value) || 0)}
                  className="w-full text-lg font-black font-mono text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 pr-12"
                />
                <span className="absolute right-2.5 top-2 text-[11px] font-semibold text-slate-400">
                  cm
                </span>
              </div>
            </div>

            {/* Quick C Nudges */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMeasuredTempC((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))))}
                className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-bold transition shadow-2xs"
                title="ลด 0.1 cm"
              >
                -0.1
              </button>
              <button
                type="button"
                onClick={() => setMeasuredTempC((prev) => Number((prev + 0.1).toFixed(1)))}
                className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-bold transition shadow-2xs"
                title="เพิ่ม 0.1 cm"
              >
                +0.1
              </button>
              <button
                type="button"
                onClick={() => setMeasuredTempC(1.2)}
                className="py-1 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 rounded text-[11px] font-bold transition shadow-2xs"
                title="ค่ามาตรฐาน 1.2 cm"
              >
                1.2 cm
              </button>
            </div>
          </div>
        </div>

        {/* Live Multi-Round Validation Banner */}
        <div className="pt-2">
          {!isEvaluated ? (
            <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-500 text-center font-medium">
              กรอกระยะ Set ของชุดที่ 1, 2 และ 3 เพื่อตรวจสอบผลเทียบกับเกณฑ์ Hiley
            </div>
          ) : isPassed ? (
            <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <div className="text-sm font-black flex items-center gap-2 flex-wrap">
                    <span>🟢 PASS: ได้ Set ผ่านเกณฑ์มาตรฐานครบทั้ง 3 ชุด</span>
                    <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                      Target &le; {targetSet.toFixed(2)} cm
                    </span>
                  </div>
                  <div className="text-xs text-emerald-800 mt-1 font-mono flex items-center gap-2 flex-wrap">
                    <span>ชุดที่ 1: <strong>{last10Rounds[0]} cm</strong></span>
                    <span>•</span>
                    <span>ชุดที่ 2: <strong>{last10Rounds[1]} cm</strong></span>
                    <span>•</span>
                    <span>ชุดที่ 3: <strong>{last10Rounds[2]} cm</strong></span>
                    <span>|</span>
                    <span className="font-bold">ค่าเฉลี่ย: {avgMeasuredLast10.toFixed(2)} cm</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg uppercase self-start sm:self-auto shrink-0 shadow-2xs">
                SET ACHIEVED (3/3 PASS)
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl border bg-rose-50 border-rose-300 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <div className="text-sm font-black flex items-center gap-2 flex-wrap">
                    <span>🔴 RE-DRIVE: ยังไม่ผ่านเกณฑ์มาตรฐาน</span>
                    <span className="text-xs bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-mono font-bold">
                      (ต้องผ่าน &le; {targetSet.toFixed(2)} cm ครบทั้ง 3 ชุด)
                    </span>
                  </div>
                  <div className="text-xs text-rose-800 mt-1 font-mono flex items-center gap-2 flex-wrap">
                    <span>ชุดที่ 1: <strong className={last10Rounds[0] && last10Rounds[0] > targetSet ? 'text-rose-600 underline' : ''}>{last10Rounds[0] ?? '-'} cm</strong></span>
                    <span>•</span>
                    <span>ชุดที่ 2: <strong className={last10Rounds[1] && last10Rounds[1] > targetSet ? 'text-rose-600 underline' : ''}>{last10Rounds[1] ?? '-'} cm</strong></span>
                    <span>•</span>
                    <span>ชุดที่ 3: <strong className={last10Rounds[2] && last10Rounds[2] > targetSet ? 'text-rose-600 underline' : ''}>{last10Rounds[2] ?? '-'} cm</strong></span>
                    <span>|</span>
                    <span>ค่าเฉลี่ย: {avgMeasuredLast10.toFixed(2)} cm</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-black bg-rose-600 text-white px-3 py-1.5 rounded-lg uppercase self-start sm:self-auto shrink-0 shadow-2xs">
                RE-DRIVE REQUIRED
              </span>
            </div>
          )}
        </div>

        {/* Engineering Elevations & Depth Calculator */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>ระดับอ้างอิงทางวิศวกรรม & คำนวณระดับปลายเข็ม (Elevations & Depth Calculation)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                คำนวณระดับปลายเสาเข็ม (Tip Level) และความลึกเข็มจริงในดินอัตโนมัติจากความยาวเสาเข็มและระยะหัวเข็มพ้นดิน
              </p>
            </div>

            {/* Auto vs Manual Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setIsTipLevelAuto(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                  isTipLevelAuto
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>คำนวณอัตโนมัติ (Auto)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTipLevelAuto(false);
                  setManualTipLevel(computedTipLevel);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition ${
                  !isTipLevelAuto
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>ปรับแก้เอง (Manual)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Input Parameters: 7 cols */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              {/* 1. Total Pile Length */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ความยาวเสาเข็มรวม (L<sub>pile</sub>)</span>
                  <span className="text-[10px] text-slate-400 font-normal">ตามสเปก/ท่อน</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    value={totalPileLength}
                    onChange={(e) => setTotalPileLength(parseFloat(e.target.value) || 0)}
                    placeholder="21.00"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono">ม.</span>
                </div>
              </div>

              {/* 2. Stick-up Length */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span>ระยะหัวเข็มพ้นดิน (Stick-up)</span>
                  </label>
                  {isWindowScope && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({windowLength} - {validDrivenStepsCount} {recordUnit === 'FEET' ? 'ft' : 'm'})
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={activeStickUp}
                    onChange={(e) => {
                      setManualStickUpLength(parseFloat(e.target.value) || 0);
                      setIsStickUpAuto(false);
                    }}
                    placeholder="+0.50"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono">ม.</span>
                </div>

                {/* Status Indicator & Sync Toggle */}
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  {isStickUpAuto ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                      <span>ซิงก์จากตาราง ({isWindowScope ? `${remainingFeetInWindow} ft เหลือ` : 'Auto'})</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <span>กำหนดเอง</span>
                      <button
                        type="button"
                        onClick={() => setIsStickUpAuto(true)}
                        className="text-amber-700 font-bold underline hover:text-amber-800 transition"
                      >
                        ซิงก์กลับ ({calculatedStickUpFromTable} ม.)
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Ground Level (GL) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ระดับดินเดิม (Ground Level: GL)</span>
                  <span className="text-[10px] text-slate-400 font-normal">รทก.</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={groundLevel}
                    onChange={(e) => setGroundLevel(parseFloat(e.target.value) || 0)}
                    placeholder="+3.00"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono">ม.</span>
                </div>
              </div>

              {/* 4. Cut-off Level (COL) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ระดับหัวเข็มตัด (Cut-off Level: COL)</span>
                  <span className="text-[10px] text-slate-400 font-normal">รทก.</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={cutOffLevel}
                    onChange={(e) => setCutOffLevel(parseFloat(e.target.value) || 0)}
                    placeholder="+2.50"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-mono">ม.</span>
                </div>
              </div>
            </div>

            {/* Calculated Results Card: 5 cols */}
            <div className="lg:col-span-5 bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                  <span>ผลลัพธ์คำนวณระดับปลายเข็ม</span>
                </span>
                {isTipLevelAuto ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>Auto Synced</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    Manual Override
                  </span>
                )}
              </div>

              {/* Primary Metric: Tip Level */}
              <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200 shadow-2xs">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-slate-600">ระดับปลายเสาเข็ม (Tip Level: TL):</span>
                  {isTipLevelAuto ? (
                    <span className="text-xl font-black font-mono text-amber-700">
                      {activeTipLevel > 0 ? `+${activeTipLevel.toFixed(2)}` : activeTipLevel.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-600">ม. รทก.</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        value={manualTipLevel}
                        onChange={(e) => setManualTipLevel(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right font-black font-mono text-base text-amber-700 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 focus:outline-none"
                      />
                      <span className="text-xs font-normal text-slate-600">ม.</span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  สูตร: GL ({groundLevelNum > 0 ? `+${groundLevelNum}` : groundLevelNum}) - ความลึกเข็มจริง ({activeDrivenDepth}ม.)
                </div>
              </div>

              {/* Secondary Metrics: Driven Depth & Cut Waste */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/80 rounded-lg p-2 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium block">ความลึกจริงในดิน:</span>
                  <strong className="text-sm font-black font-mono text-slate-800">
                    {activeDrivenDepth.toFixed(2)} ม.
                  </strong>
                  <span className="text-[9px] text-slate-400 font-mono block">
                    ({(activeDrivenDepth * 3.28084).toFixed(1)} ft)
                  </span>
                </div>

                <div className="bg-white/80 rounded-lg p-2 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium block">ระยะสกัดหัวเข็ม:</span>
                  <strong className={`text-sm font-black font-mono ${computedCutWaste >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {computedCutWaste >= 0 ? `${computedCutWaste.toFixed(2)} ม.` : `หัวเข็มจม (${computedCutWaste.toFixed(2)} ม.)`}
                  </strong>
                  <span className="text-[9px] text-slate-400 font-mono block">
                    (ระดับจริง {computedTopLevel > 0 ? `+${computedTopLevel}` : computedTopLevel} vs ตัด {cutOffLevelNum > 0 ? `+${cutOffLevelNum}` : cutOffLevelNum})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Warning Alert */}
          {stickUpNum >= totalLengthNum && (
            <div className="p-2.5 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                ข้อสังเกต: ระยะหัวเข็มพ้นดิน ({stickUpNum} ม.) มากกว่าหรือเท่ากับความยาวเสาเข็มรวม ({totalLengthNum} ม.) กรุณาตรวจสอบค่าที่ระบุ
              </span>
            </div>
          )}
        </div>

        {/* Inspector & Notes */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วิศวกรผู้ควบคุมการตอก (Inspector Name)
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หมายเหตุหน้างาน (Site Notes)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น มีดินดานหนาที่ความลึก 19ม., ตอกต่อเนื่องไม่สะดุด"
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {!isOnline && (
          <div className="mr-auto flex items-center gap-1.5 text-xs font-bold text-rose-700">
            <WifiOff className="h-4 w-4" /> Offline: Save Draft is available; Save Record will return when connected.
          </div>
        )}
        <Link
          href="/piles"
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          ยกเลิก
        </Link>
        <button
          type="button"
          onClick={() => void handleSaveDraft()}
          disabled={isDraftSaving}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isDraftSaving ? 'Saving Draft...' : 'Save Draft'}
        </button>
        <button
          type="submit"
          disabled={isSaving || !isOnline}
          title={!isOnline ? 'Save Record requires an online connection' : undefined}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95"
        >
          {isSaving ? (
            <span>กำลังบันทึก...</span>
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-950" />
              <span>บันทึกสำเร็จ!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>บันทึกประวัติการตอก (Save Record)</span>
            </>
          )}
        </button>
      </div>

      <GuidedFieldModeModal
        isOpen={isFieldModeOpen}
        pileLabel={`${pile.pileNo} (${pile.gridLine})`}
        blowCounts={blowCounts}
        onChange={setBlowCounts}
        recordUnit={recordUnit}
        recordScope={recordScope}
        windowLength={windowLength}
        onSaveDraft={handleSaveDraft}
        isDraftSaving={isDraftSaving}
        onClose={closeFieldMode}
      />

      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={confirmDiscardDraft}
        title="Discard Draft?"
        message="Remove the saved Draft for this pile from this browser?"
        confirmText="Discard"
        isDestructive
      />

      {conflict && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Driving record conflict">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Server record changed</h2>
            <p className="mt-2 text-sm text-slate-600">Your Draft was not submitted because this pile was updated elsewhere.</p>
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs font-mono text-slate-700">
              <p>Local version: {draftServerRecordUpdatedAt || 'new record'}</p>
              <p>Server version: {conflict.serverUpdatedAt || 'unavailable'}</p>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={handleUseServer} className="rounded-xl border border-slate-300 px-3 py-3 text-xs font-black text-slate-700">Use Server</button>
              <button type="button" onClick={handleOverwriteWithDraft} className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-black text-slate-950">Review Overwrite</button>
            </div>
            <button type="button" onClick={() => setConflict(null)} className="mt-3 w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">Keep editing</button>
          </div>
        </div>
      )}

      {isOverwriteConfirmOpen && conflict && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label="Confirm overwrite">
          <div className="w-full max-w-md rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Confirm overwrite</h2>
            <p className="mt-2 text-sm text-slate-600">Overwrite the latest server record with your Draft? This cannot be undone.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsOverwriteConfirmOpen(false)} className="rounded-xl border border-slate-300 px-3 py-3 text-xs font-black text-slate-700">Cancel</button>
              <button type="button" onClick={confirmOverwriteWithDraft} className="rounded-xl bg-rose-600 px-3 py-3 text-xs font-black text-white">Overwrite</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
