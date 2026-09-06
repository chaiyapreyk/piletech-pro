'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  calculateHiley,
  calculateBearingCapacityFromSet,
  generateSensitivityMatrix,
  calculateElasticModulus,
  calculatePileWeightFromDimensions,
  STANDARD_PILE_SECTIONS,
  getPileSectionById,
  findClosestPileSectionByArea,
  DEFAULT_HILEY_INPUT,
  type HileyInput,
} from '@/lib/calculations/hiley';
import SensitivityTable from './SensitivityTable';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Bookmark,
  Sparkles,
  Layers,
  Hammer,
  Zap,
  ArrowRight,
  Building2,
  Save,
  FolderPlus,
  Trash2,
  Loader2,
  X,
  FileCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import ConfirmModal from '@/components/ui/ConfirmModal';

export interface ProjectCriteria {
  id: string;
  projectId: string;
  name?: string | null;
  pileType: string;
  sectionId?: string | null;
  safeWorkingLoadT: number;
  safetyFactor: number;
  hammerWeightT: number;
  dropHeightCm: number;
  pileWeightT?: number | null;
  cushionCoeffE: number;
  tempCompressionC: number;
  concreteStrengthKsc?: number | null;
  elasticModulusKsc?: number | null;
  pileSectionAreaCm2?: number | null;
  pileLengthM?: number | null;
  hammerEfficiency?: number | null;
  targetSet10BlowsCm: number;
  notes?: string | null;
  _count?: { piles: number };
  createdAt?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  code: string;
  criteria?: ProjectCriteria[];
  _count?: { piles: number };
}

interface HileyCalculatorProps {
  initialProject?: ProjectData | null;
  initialCriteriaId?: string | null;
}

interface Preset {
  name: string;
  pileType: string;
  data: HileyInput;
}

const PRESETS: Preset[] = [
  {
    name: 'I-Section 0.26x0.26m (มาตรฐานทั่วไป)',
    pileType: 'Prestressed Concrete I-0.26m',
    data: {
      safeWorkingLoadTons: 35,
      safetyFactor: 2.5,
      hammerWeightTons: 4.0,
      dropHeightCm: 40,
      pileWeightTons: 1.8,
      restitutionCoeff: 0.25,
      tempCompressionCm: 1.2,
      concreteStrengthKsc: 350,
      elasticModulusKsc: 280000,
      pileSectionAreaCm2: 484,
      pileLengthM: 20.0,
    },
  },
  {
    name: 'I-Section 0.30x0.30m (รับน้ำหนักปานกลาง)',
    pileType: 'Prestressed Concrete I-0.30m',
    data: {
      safeWorkingLoadTons: 45,
      safetyFactor: 2.5,
      hammerWeightTons: 4.5,
      dropHeightCm: 45,
      pileWeightTons: 2.3,
      restitutionCoeff: 0.25,
      tempCompressionCm: 1.3,
      concreteStrengthKsc: 350,
      elasticModulusKsc: 280000,
      pileSectionAreaCm2: 625,
      pileLengthM: 22.0,
    },
  },
  {
    name: 'Square 0.35x0.35m (เข็มสี่เหลี่ยมตัน)',
    pileType: 'Prestressed Concrete Square 0.35m',
    data: {
      safeWorkingLoadTons: 50,
      safetyFactor: 2.5,
      hammerWeightTons: 5.0,
      dropHeightCm: 50,
      pileWeightTons: 2.9,
      restitutionCoeff: 0.25,
      tempCompressionCm: 1.4,
      concreteStrengthKsc: 400,
      elasticModulusKsc: 300000,
      pileSectionAreaCm2: 1225,
      pileLengthM: 24.0,
    },
  },
  {
    name: 'Spun Pile Dia 0.40m (เข็มแรงเหวี่ยงกลวง)',
    pileType: 'Prestressed Spun 0.40m',
    data: {
      safeWorkingLoadTons: 60,
      safetyFactor: 2.5,
      hammerWeightTons: 5.0,
      dropHeightCm: 50,
      pileWeightTons: 3.2,
      restitutionCoeff: 0.35,
      tempCompressionCm: 1.5,
      concreteStrengthKsc: 500,
      elasticModulusKsc: 335000,
      pileSectionAreaCm2: 766,
      pileLengthM: 24.0,
    },
  },
];

export default function HileyCalculator({ initialProject, initialCriteriaId }: HileyCalculatorProps = {}) {
  const [project, setProject] = useState<ProjectData | null>(initialProject ?? null);
  const [criteriaList, setCriteriaList] = useState<ProjectCriteria[]>(
    initialProject?.criteria ?? []
  );

  const targetCriteria = initialCriteriaId
    ? initialProject?.criteria?.find((c) => c.id === initialCriteriaId)
    : initialProject?.criteria?.[0];
  const firstCriteria = targetCriteria || initialProject?.criteria?.[0];

  const getInitialInput = (): HileyInput => {
    if (firstCriteria) {
      return {
        safeWorkingLoadTons: firstCriteria.safeWorkingLoadT,
        safetyFactor: firstCriteria.safetyFactor,
        hammerWeightTons: firstCriteria.hammerWeightT,
        dropHeightCm: firstCriteria.dropHeightCm,
        pileWeightTons: firstCriteria.pileWeightT || 1.8,
        restitutionCoeff: firstCriteria.cushionCoeffE,
        tempCompressionCm: firstCriteria.tempCompressionC,
        concreteStrengthKsc: firstCriteria.concreteStrengthKsc || 350,
        elasticModulusKsc: firstCriteria.elasticModulusKsc || 280000,
        pileSectionAreaCm2: firstCriteria.pileSectionAreaCm2 || 484,
        pileLengthM: firstCriteria.pileLengthM || 20.0,
        hammerEfficiency: firstCriteria.hammerEfficiency || undefined,
      };
    }
    return PRESETS[0].data;
  };

  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string | null>(
    firstCriteria?.id ?? null
  );
  const [selectedPreset, setSelectedPreset] = useState<string>(
    firstCriteria ? 'CUSTOM' : PRESETS[0].name
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    firstCriteria?.sectionId || 'I_026'
  );
  const [input, setInput] = useState<HileyInput>(getInitialInput);
  const [measuredSet10, setMeasuredSet10] = useState<string>('5.0');
  const [measuredC, setMeasuredC] = useState<string>(
    (firstCriteria?.tempCompressionC || 1.2).toString()
  );

  // Modal and toast states
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<'NEW' | 'UPDATE'>('NEW');
  const [saveName, setSaveName] = useState('');
  const [savePileType, setSavePileType] = useState(
    firstCriteria?.pileType || 'Prestressed Concrete I-0.26m'
  );
  const [saveNotes, setSaveNotes] = useState('');
  const [applyToMatchingPiles, setApplyToMatchingPiles] = useState(true);
  const [applyToAllPiles, setApplyToAllPiles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  // Collapsible Advanced Panels for Mobile Ergonomics
  const [showAdvancedMaterial, setShowAdvancedMaterial] = useState(false);
  const [showAdvancedEquipment, setShowAdvancedEquipment] = useState(false);

  // Criteria Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    isDeleting?: boolean;
  } | null>(null);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSaveModalOpen) {
        setIsSaveModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaveModalOpen]);

  const handleLoadCriteria = (crit: ProjectCriteria) => {
    setSelectedCriteriaId(crit.id);
    const loadedInput: HileyInput = {
      safeWorkingLoadTons: crit.safeWorkingLoadT,
      safetyFactor: crit.safetyFactor,
      hammerWeightTons: crit.hammerWeightT,
      dropHeightCm: crit.dropHeightCm,
      pileWeightTons: crit.pileWeightT || 1.8,
      restitutionCoeff: crit.cushionCoeffE,
      tempCompressionCm: crit.tempCompressionC,
      concreteStrengthKsc: crit.concreteStrengthKsc || 350,
      elasticModulusKsc: crit.elasticModulusKsc || 280000,
      pileSectionAreaCm2: crit.pileSectionAreaCm2 || 484,
      pileLengthM: crit.pileLengthM || 20.0,
      hammerEfficiency: crit.hammerEfficiency || undefined,
    };
    setInput(loadedInput);
    setMeasuredC(crit.tempCompressionC.toString());
    setSavePileType(crit.pileType);
    setSelectedSectionId(crit.sectionId || 'CUSTOM');
    setSelectedPreset('CUSTOM');
    toast.success(`โหลดรายการคำนวณ "${crit.name || crit.pileType}" เรียบร้อยแล้ว`);
  };

  const handleOpenSaveModal = (mode?: 'NEW' | 'UPDATE') => {
    const currentActiveCrit = criteriaList.find((c) => c.id === selectedCriteriaId);
    const targetMode = mode ?? (currentActiveCrit ? 'UPDATE' : 'NEW');
    setSaveMode(targetMode);

    if (targetMode === 'UPDATE' && currentActiveCrit) {
      setSaveName(currentActiveCrit.name || `${currentActiveCrit.pileType} (Ra ${input.safeWorkingLoadTons}T)`);
      setSavePileType(currentActiveCrit.pileType);
      setSaveNotes(currentActiveCrit.notes || '');
    } else {
      const sec = getPileSectionById(selectedSectionId);
      const pileLabel = sec?.label || 'Prestressed Concrete Pile';
      setSaveName(`${pileLabel} (Ra ${input.safeWorkingLoadTons}T)`);
      setSavePileType(pileLabel);
      setSaveNotes('');
    }
    setIsSaveModalOpen(true);
  };

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const found = PRESETS.find((p) => p.name === presetName);
    if (found) {
      const nextInput = { ...found.data };
      setInput(nextInput);
      setMeasuredC(nextInput.tempCompressionCm.toString());
      // Synchronize selected pile section
      const matched = findClosestPileSectionByArea(nextInput.pileSectionAreaCm2 || 0);
      setSelectedSectionId(matched ? matched.id : 'CUSTOM');
    }
  };

  const handleInputChange = (field: keyof HileyInput, value: number) => {
    setInput((prev) => ({ ...prev, [field]: value }));
    setSelectedPreset('CUSTOM');
  };

  // 1. Reactive Concrete Strength -> Auto recalculate Ec = 15,100 * sqrt(fc')
  const handleConcreteStrengthChange = (fc: number) => {
    const newEc = calculateElasticModulus(fc);
    setInput((prev) => ({
      ...prev,
      concreteStrengthKsc: fc,
      elasticModulusKsc: newEc,
    }));
    setSelectedPreset('CUSTOM');
  };

  // 2. Reactive Pile Section Selector -> Auto update Area A and estimated Weight P
  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    if (sectionId === 'CUSTOM') return;
    const sec = getPileSectionById(sectionId);
    if (sec && sec.areaCm2 > 0) {
      const newArea = sec.areaCm2;
      setInput((prev) => {
        const length = prev.pileLengthM || 20;
        const estWeight = calculatePileWeightFromDimensions(newArea, length);
        return {
          ...prev,
          pileSectionAreaCm2: newArea,
          pileWeightTons: estWeight > 0 ? estWeight : prev.pileWeightTons,
        };
      });
      setSelectedPreset('CUSTOM');
    }
  };

  // 3. Manual Area change
  const handleAreaChange = (newArea: number) => {
    setInput((prev) => {
      const length = prev.pileLengthM || 20;
      const estWeight = calculatePileWeightFromDimensions(newArea, length);
      return {
        ...prev,
        pileSectionAreaCm2: newArea,
        pileWeightTons: estWeight > 0 ? estWeight : prev.pileWeightTons,
      };
    });
    const matched = findClosestPileSectionByArea(newArea);
    setSelectedSectionId(matched ? matched.id : 'CUSTOM');
    setSelectedPreset('CUSTOM');
  };

  // 4. Manual Length change
  const handleLengthChange = (newLength: number) => {
    setInput((prev) => {
      const area = prev.pileSectionAreaCm2 || 484;
      const estWeight = calculatePileWeightFromDimensions(area, newLength);
      return {
        ...prev,
        pileLengthM: newLength,
        pileWeightTons: estWeight > 0 ? estWeight : prev.pileWeightTons,
      };
    });
    setSelectedPreset('CUSTOM');
  };

  // Quick Action Handlers
  const handleAutoEc = () => {
    const fc = input.concreteStrengthKsc || 350;
    const computedEc = calculateElasticModulus(fc);
    handleInputChange('elasticModulusKsc', computedEc);
  };

  const handleApplyTheoreticalC2 = () => {
    if (hileyResult.theoreticalC2Cm && hileyResult.theoreticalC2Cm > 0) {
      handleInputChange('tempCompressionCm', hileyResult.theoreticalC2Cm);
      setMeasuredC(hileyResult.theoreticalC2Cm.toString());
    }
  };

  const handleApplyEstimatedWeight = () => {
    if (hileyResult.estimatedPileWeightTons && hileyResult.estimatedPileWeightTons > 0) {
      handleInputChange('pileWeightTons', hileyResult.estimatedPileWeightTons);
    }
  };

  const handleConfirmSave = async () => {
    if (!saveName.trim()) {
      toast.error('กรุณาระบุชื่อรายการคำนวณ');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        projectId: project?.id,
        name: saveName.trim(),
        pileType: savePileType.trim() || 'Prestressed Concrete Pile',
        sectionId: selectedSectionId,
        safeWorkingLoadT: input.safeWorkingLoadTons,
        safetyFactor: input.safetyFactor,
        hammerWeightT: input.hammerWeightTons,
        dropHeightCm: input.dropHeightCm,
        pileWeightT: input.pileWeightTons,
        cushionCoeffE: input.restitutionCoeff,
        tempCompressionC: input.tempCompressionCm,
        concreteStrengthKsc: input.concreteStrengthKsc,
        elasticModulusKsc: input.elasticModulusKsc,
        pileSectionAreaCm2: input.pileSectionAreaCm2,
        pileLengthM: input.pileLengthM,
        hammerEfficiency: input.hammerEfficiency,
        targetSet10BlowsCm: Number(hileyResult.targetSet10BlowsCm.toFixed(2)),
        notes: saveNotes.trim(),
        applyToAllMatchingType: applyToMatchingPiles,
        applyToAllPiles: applyToAllPiles,
      };

      let res: Response;
      if (saveMode === 'UPDATE' && selectedCriteriaId) {
        res = await fetch(`/api/criteria/${selectedCriteriaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/criteria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'บันทึกไม่สำเร็จ');
      }

      const data = await res.json();
      const savedCrit: ProjectCriteria = data.criteria;

      setCriteriaList((prev) => {
        const exists = prev.some((c) => c.id === savedCrit.id);
        if (exists) {
          return prev.map((c) => (c.id === savedCrit.id ? savedCrit : c));
        }
        return [...prev, savedCrit];
      });
      setSelectedCriteriaId(savedCrit.id);
      setIsSaveModalOpen(false);

      const msg = data.updatedPilesCount > 0
        ? `${data.message} (ผูกกับเสาเข็ม ${data.updatedPilesCount} ต้น)`
        : data.message;
      toast.success(msg);
    } catch (err: any) {
      console.error('Error saving criteria:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCriteria = (id: string, name: string) => {
    setDeleteModalState({ isOpen: true, id, name, isDeleting: false });
  };

  const confirmDeleteCriteria = async () => {
    if (!deleteModalState) return;
    const { id, name } = deleteModalState;

    try {
      setDeleteModalState((prev) => (prev ? { ...prev, isDeleting: true } : null));
      const res = await fetch(`/api/criteria/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'ลบไม่สำเร็จ');
      }
      setCriteriaList((prev) => prev.filter((c) => c.id !== id));
      if (selectedCriteriaId === id) {
        setSelectedCriteriaId(null);
      }
      toast.success(`ลบรายการคำนวณ "${name}" เรียบร้อยแล้ว`);
      setDeleteModalState(null);
    } catch (err: any) {
      console.error('Error deleting criteria:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการลบ');
      setDeleteModalState((prev) => (prev ? { ...prev, isDeleting: false } : null));
    }
  };

  // Perform calculations
  const hileyResult = useMemo(() => calculateHiley(input), [input]);
  const sensitivityMatrix = useMemo(() => generateSensitivityMatrix(input), [input]);

  const parsedMeasuredSet = parseFloat(measuredSet10) || 0;
  const parsedMeasuredC = parseFloat(measuredC) || input.tempCompressionCm;

  const fieldCheckResult = useMemo(() => {
    if (parsedMeasuredSet <= 0) return null;
    return calculateBearingCapacityFromSet(input, parsedMeasuredSet, parsedMeasuredC);
  }, [input, parsedMeasuredSet, parsedMeasuredC]);

  return (
    <div className="space-y-6 relative">
      {/* Project Calculation Criteria Selector Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                โครงการที่กำลังคำนวณสเปกเสาเข็ม
              </div>
              <div className="text-sm font-black text-slate-900">
                {project ? `${project.code} - ${project.name}` : 'กำลังโหลดโครงการ...'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenSaveModal('NEW')}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs shadow-xs transition active:scale-95"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>บันทึกเป็นสเปกใหม่</span>
            </button>
            {selectedCriteriaId && (
              <button
                type="button"
                onClick={() => handleOpenSaveModal('UPDATE')}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-lg text-xs shadow-xs transition active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกทับสเปกนี้</span>
              </button>
            )}
          </div>
        </div>

        {/* Chips / Cards of Saved Calculation Sheets */}
        <div className="pt-3">
          <div className="text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>รายการคำนวณเสาเข็มประจำโครงการ ({criteriaList.length} ขนาด):</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              แตะที่รายการเพื่อดึงสเปกและพารามิเตอร์ทั้งหมดมาใช้งาน
            </span>
          </div>

          {criteriaList.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-dashed border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold">โครงการนี้ยังไม่มีรายการคำนวณที่บันทึกไว้</p>
                <p className="text-[11px] text-amber-800/80 mt-0.5">
                  ปรับพารามิเตอร์ของเสาเข็มและลูกตุ้มด้านล่าง จากนั้นกดปุ่ม <strong>"บันทึกเป็นสเปกใหม่"</strong> เพื่อบันทึกเป็นสเปกมาตรฐานของโครงการ
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenSaveModal('NEW')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex-shrink-0 self-start sm:self-auto transition shadow-xs"
              >
                + บันทึกรายการแรก
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {criteriaList.map((crit) => {
                const isSelected = selectedCriteriaId === crit.id;
                const pileCount = crit._count?.piles ?? 0;

                return (
                  <div
                    key={crit.id}
                    onClick={() => handleLoadCriteria(crit)}
                    className={`flex-shrink-0 p-3 rounded-xl border cursor-pointer transition select-none min-w-[220px] ${
                      isSelected
                        ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/80 shadow-xs'
                        : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-black text-xs text-slate-900 truncate max-w-[160px]" title={crit.name || crit.pileType}>
                        {crit.name || crit.pileType}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCriteria(crit.id, crit.name || crit.pileType);
                        }}
                        title="ลบรายการคำนวณนี้"
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-1.5 flex items-baseline justify-between text-[11px] font-mono">
                      <span className="text-amber-800 font-black">Ra = {crit.safeWorkingLoadT} T</span>
                      <span className="text-emerald-700 font-bold">S₁₀ &le; {crit.targetSet10BlowsCm} cm</span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-medium">
                        ตุ้ม {crit.hammerWeightT}T | ดรอป {crit.dropHeightCm}cm
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          pileCount > 0
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-slate-200/70 text-slate-600'
                        }`}
                      >
                        {pileCount} ต้น
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Header card with preset selector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm mb-1">
              <Calculator className="w-4 h-4" />
              <span>DYNAMIC FORMULA ENGINE</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              Hiley Formula Calculator (คำนวณการตอกเสาเข็ม)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              คำนวณหาค่า Target Set (Last 10 Blows), กำลังรับน้ำหนักปลอดภัย ($R_a$), และตรวจสอบหน้างานแบบ Real-time
            </p>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Bookmark className="w-4 h-4 text-slate-500 ml-1" />
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">พรีเซ็ตหน้าตัด:</span>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value="CUSTOM">-- กำหนดค่าเอง (Custom) --</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs vs Calculation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Parameter Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Pile Material & Geometry Properties */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>1. คุณสมบัติวัสดุและหน้าตัดเสาเข็ม (Pile Material & Section)</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                A = {input.pileSectionAreaCm2 || 484} cm² | L = {input.pileLengthM || 20} m
              </span>
            </div>

            {/* Standard Pile Section Selector */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    ขนาดหน้าตัดเสาเข็มมาตรฐาน (Standard Pile Section)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    เลือกขนาดเข็มเพื่ออัปเดตพื้นที่หน้าตัด (A) และน้ำหนักเสาเข็มอัตโนมัติ
                  </p>
                </div>
                <select
                  value={selectedSectionId}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <optgroup label="เสาเข็มคอนกรีตอัดแรงรูปตัวไอ (I-Section)">
                    {STANDARD_PILE_SECTIONS.filter((s) => s.category === 'I-SECTION').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.areaCm2} cm²)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="เสาเข็มคอนกรีตอัดแรงสี่เหลี่ยมตัน (Square)">
                    {STANDARD_PILE_SECTIONS.filter((s) => s.category === 'SQUARE').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.areaCm2} cm²)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="เสาเข็มคอนกรีตอัดแรงแรงเหวี่ยงกลวง (Spun Piles)">
                    {STANDARD_PILE_SECTIONS.filter((s) => s.category === 'SPUN').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.areaCm2} cm²)
                      </option>
                    ))}
                  </optgroup>
                  <option value="CUSTOM">-- กำหนดขนาดหน้าตัดเอง (Custom) --</option>
                </select>
              </div>
            </div>

            {/* Primary Pile Length L */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ความยาวเสาเข็มรวม ($L$) (Total Pile Length)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={input.pileLengthM || ''}
                  onChange={(e) => handleLengthChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  placeholder="20.0"
                  className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">เมตร (m)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                * ความยาวรวมทุกท่อนที่ตอกลงดิน (รวมจุดต่อท่อน)
              </p>
            </div>

            {/* Collapsible Advanced Material Properties */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedMaterial(!showAdvancedMaterial)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition select-none"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  <span>พารามิเตอร์วัสดุเชิงลึก ($f&apos;_c$, $E_c$, $A$, ทฤษฎี $C_2$)</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                  <span>{showAdvancedMaterial ? 'ซ่อนพารามิเตอร์' : 'แสดงรายละเอียด'}</span>
                  {showAdvancedMaterial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showAdvancedMaterial && (
                <div className="p-4 space-y-4 border-t border-slate-200 bg-white animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Concrete Strength fc' */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        กำลังอัดคอนกรีต ($f&apos;_c$) (Concrete Strength)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="10"
                          value={input.concreteStrengthKsc || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            handleConcreteStrengthChange(val);
                          }}
                          placeholder="350"
                          className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">ksc</span>
                      </div>
                      <p className="text-[11px] text-amber-700 mt-1">
                        * เมื่อเปลี่ยนค่า E จะคำนวณใหม่ให้อัตโนมัติ (15,100&radic;f&apos;c)
                      </p>
                    </div>

                    {/* Elastic Modulus Ec */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          โมดูลัสยืดหยุ่น ($E_c$) (Elastic Modulus)
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoEc}
                          className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="คำนวณจากสูตร วสท./ACI: 15,100 * sqrt(fc')"
                        >
                          <Zap className="w-2.5 h-2.5" />
                          15,100&radic;f&apos;c
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="5000"
                          value={input.elasticModulusKsc || ''}
                          onChange={(e) => handleInputChange('elasticModulusKsc', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="280000"
                          className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">ksc</span>
                      </div>
                    </div>

                    {/* Section Area A */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        พื้นที่หน้าตัดเสาเข็ม ($A$) (Section Area)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          value={input.pileSectionAreaCm2 || ''}
                          onChange={(e) => handleAreaChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="484"
                          className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">cm²</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        * เปลี่ยนตามขนาดเข็มด้านบน หรือพิมพ์ตัวเลขระบุเองหากเป็นเข็มหน้าตัดพิเศษ
                      </p>
                    </div>
                  </div>

                  {/* Theoretical Derived Box */}
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-amber-900 block">
                        การวิเคราะห์เชิงทฤษฎี (Theoretical Derivation):
                      </span>
                      <div className="text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          น้ำหนักเสาเข็มตามมิติ: <strong className="text-slate-900">{hileyResult.estimatedPileWeightTons ?? '-'} ตัน</strong>
                        </span>
                        <span>
                          ค่า Shaft Elastic C₂ (Ru·L/AE): <strong className="text-slate-900">{hileyResult.theoreticalC2Cm ?? '-'} cm</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleApplyEstimatedWeight}
                        className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-semibold rounded text-[11px] transition shadow-xs cursor-pointer"
                        title="ใช้น้ำหนักเสาเข็มคำนวณเป็นค่าน้ำหนัก P"
                      >
                        ใช้ P ({hileyResult.estimatedPileWeightTons} t)
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyTheoreticalC2}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px] transition shadow-xs cursor-pointer"
                        title="ใช้ค่า C2 ทฤษฎีเป็นค่า C ในสูตร Hiley"
                      >
                        ใช้ C ({hileyResult.theoreticalC2Cm} cm)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Driving Equipment & Criteria */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-amber-600" />
              <span>2. พารามิเตอร์การออกแบบและเครื่องตอก (Driving & Hammer Equipment)</span>
            </h2>

            {/* Core Driving Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ra */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กำลังรับน้ำหนักปลอดภัย ($R_a$) (Safe Load)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={input.safeWorkingLoadTons || ''}
                    onChange={(e) => handleInputChange('safeWorkingLoadTons', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="35"
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">ตัน (tons)</span>
                </div>
              </div>

              {/* Hammer Weight */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  น้ำหนักลูกตุ้มตอก ($W$) (Hammer Weight)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={input.hammerWeightTons || ''}
                    onChange={(e) => handleInputChange('hammerWeightTons', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="4.0"
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">ตัน (tons)</span>
                </div>
              </div>

              {/* Drop Height */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ระยะยกตกลูกตุ้ม ($H$) (Drop Height / Stroke)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    value={input.dropHeightCm || ''}
                    onChange={(e) => handleInputChange('dropHeightCm', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="40"
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">ซม. (cm)</span>
                </div>
              </div>

              {/* Elastic Compression C */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  การทรุดตัวยืดหยุ่น ($C$) (Temporary Compression)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={input.tempCompressionCm || ''}
                    onChange={(e) => handleInputChange('tempCompressionCm', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="1.2"
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">ซม. (cm)</span>
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Equipment & Factor Settings */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedEquipment(!showAdvancedEquipment)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition select-none"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  <span>พารามิเตอร์อุปกรณ์ขั้นสูง ($FS$, น้ำหนัก $P$, หมอนรอง $e$)</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                  <span>{showAdvancedEquipment ? 'ซ่อนพารามิเตอร์' : 'แสดงรายละเอียด'}</span>
                  {showAdvancedEquipment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showAdvancedEquipment && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 bg-white animate-in fade-in">
                  {/* Safety Factor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      อัตราส่วนความปลอดภัย ($FS$) (Safety Factor)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={input.safetyFactor || ''}
                      onChange={(e) => handleInputChange('safetyFactor', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                      placeholder="2.5"
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      * ค่ามาตรฐานทั่วไปคือ 2.5
                    </p>
                  </div>

                  {/* Pile Weight */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      น้ำหนักเสาเข็ม + หมวกครอบ ($P$) (Pile Weight)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={input.pileWeightTons || ''}
                        onChange={(e) => handleInputChange('pileWeightTons', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        placeholder="1.8"
                        className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">ตัน (tons)</span>
                    </div>
                  </div>

                  {/* Cushion Coeff e */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สัมประสิทธิ์การคืนตัวหมอนรอง ($e$) (Restitution Coefficient)
                    </label>
                    <select
                      value={input.restitutionCoeff}
                      onChange={(e) => handleInputChange('restitutionCoeff', parseFloat(e.target.value) || 0.25)}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value={0.25}>0.25 - หมอนไม้ (Wood Cushion - ค่ามาตรฐาน)</option>
                      <option value={0.35}>0.35 - หมอนคอมโพสิต / พลาสติกแข็ง (Composite Cushion)</option>
                      <option value={0.40}>0.40 - Micarta / Phenolic cushion</option>
                      <option value={0.55}>0.55 - เหล็กกระทบเหล็ก (Steel anvil)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Calculation Results & Live Checker */}
        <div className="lg:col-span-5 space-y-6">
          {/* Target Set Result Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-lg p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-amber-400" />
            </div>

            <div className="relative z-10">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                เกณฑ์ Last 10 Blows & Equivalent Blows/ft ตามคำนวณ
              </span>
              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <span className="text-5xl font-black text-amber-400 font-mono">
                  {hileyResult.targetSet10BlowsCm > 0
                    ? hileyResult.targetSet10BlowsCm.toFixed(2)
                    : 'ERR'}
                </span>
                <span className="text-lg font-bold text-slate-300">ซม. / 10 ครั้ง</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                (= {hileyResult.targetSet10BlowsMm > 0 ? hileyResult.targetSet10BlowsMm.toFixed(1) : 0} มม. / 10 ครั้ง หรือ {hileyResult.targetSetPerBlowMm.toFixed(2)} มม./blow)
              </p>

              {/* Equivalent Penetration Rate Badges */}
              {hileyResult.targetSet10BlowsCm > 0 && (
                <div className="mt-4 p-3 bg-slate-800/80 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase block">
                      Equivalent Resistance (อัตราตอกเทียบเท่า)
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-2xl font-black text-amber-300 font-mono">
                        &ge; {hileyResult.equivalentBlowsPerFoot}
                      </span>
                      <span className="text-xs font-bold text-slate-200">blows / ft</span>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-slate-300 border-l border-slate-700 pl-3">
                    <div>&ge; <strong className="text-amber-400">{hileyResult.equivalentBlowsPerMeter}</strong> blows / m</div>
                    <div className="text-slate-400 text-[10px]">&asymp; {hileyResult.equivalentBlowsPerInch} blows / inch</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block">Ultimate Capacity ($R_u$)</span>
                  <span className="text-base font-bold text-slate-100 font-mono">
                    {hileyResult.ultimateCapacityTons.toFixed(1)} ตัน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Hammer Efficiency ($\eta$)</span>
                  <span className="text-base font-bold text-slate-100 font-mono">
                    {(hileyResult.hammerEfficiency * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Material & Theoretical Parameters Summary */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-700/40 text-[11px] font-mono text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">คอนกรีต f&apos;c / E</span>
                  <span className="text-amber-300 font-semibold">
                    {input.concreteStrengthKsc ?? 350} ksc / {(((input.elasticModulusKsc ?? 280000) / 1000).toFixed(0))}k ksc
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ทฤษฎี C₂ / นน.เข็ม (W_pile)</span>
                  <span className="text-amber-300 font-semibold">
                    {hileyResult.theoreticalC2Cm ?? '-'} cm / {hileyResult.estimatedPileWeightTons ?? '-'} t
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Field Checker Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span>ตรวจสอบผลการตอกจริงหน้างาน (Field Verification)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Last 10 Blows วัดจริง
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={measuredSet10}
                    onChange={(e) => setMeasuredSet10(e.target.value)}
                    className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded px-3 py-2"
                  />
                  <span className="absolute right-2 top-2 text-xs text-slate-400">cm</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ค่า $C$ หน้างาน
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={measuredC}
                    onChange={(e) => setMeasuredC(e.target.value)}
                    className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded px-3 py-2"
                  />
                  <span className="absolute right-2 top-2 text-xs text-slate-400">cm</span>
                </div>
              </div>
            </div>

            {/* Verification Result Badge */}
            {fieldCheckResult && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  fieldCheckResult.isSetAchieved
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {fieldCheckResult.isSetAchieved ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-extrabold text-sm">
                    {fieldCheckResult.isSetAchieved
                      ? '🟢 SET ACHIEVED (ผ่านเกณฑ์มาตรฐาน)'
                      : '🔴 RE-DRIVE REQUIRED (ยังไม่ได้ Set)'}
                  </div>
                  <p className="text-xs mt-1">
                    {fieldCheckResult.isSetAchieved
                      ? `ระยะทรุดตัวจริง (${fieldCheckResult.measuredSet10BlowsCm} cm) ไม่เกินเกณฑ์ (${fieldCheckResult.targetSet10BlowsCm} cm)`
                      : `ระยะทรุดตัวจริง (${fieldCheckResult.measuredSet10BlowsCm} cm) เกินเกณฑ์ (${fieldCheckResult.targetSet10BlowsCm} cm) ต้องตอกต่อหรือทดสอบ Re-drive`}
                  </p>
                  <div className="mt-2 text-xs font-semibold pt-2 border-t border-slate-200/60 flex justify-between">
                    <span>Safe Load ที่ได้จริง: {fieldCheckResult.safeWorkingLoadTons.toFixed(1)} ตัน</span>
                    <span className={fieldCheckResult.marginPercent >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      ({fieldCheckResult.marginPercent >= 0 ? '+' : ''}
                      {fieldCheckResult.marginPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-slate-600 flex justify-between">
                    <span>เทียบเท่าอัตราตอก: <strong className="text-slate-900">{fieldCheckResult.measuredBlowsPerFoot}</strong> blows/ft</span>
                    <span className="text-slate-400">(เกณฑ์: &ge; {fieldCheckResult.targetBlowsPerFoot} blows/ft)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Project Criteria Sync & Save Action Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-amber-600" />
                  <span>บันทึกและซิงก์สเปกเสาเข็มโครงการ</span>
                </span>
                {selectedCriteriaId ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    กำลังแก้ไขสเปกเดิม
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    กำหนดค่าเอง (Custom)
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                บันทึกค่า Target Set (<strong className="text-slate-900">{hileyResult.targetSet10BlowsCm > 0 ? `${hileyResult.targetSet10BlowsCm.toFixed(2)} cm` : '-'}</strong>) และตัวแปรคำนวณทั้งหมดเข้าโครงการ เพื่ออ้างอิงอัตโนมัติในการตอกเสาเข็มหน้างาน
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenSaveModal('NEW')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <FolderPlus className="w-4 h-4 text-amber-600" />
                  <span>บันทึกเป็นสเปกใหม่</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenSaveModal(selectedCriteriaId ? 'UPDATE' : 'NEW')}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{selectedCriteriaId ? 'บันทึกทับสเปกนี้' : 'บันทึกเข้าโครงการ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Table */}
      <SensitivityTable
        matrix={sensitivityMatrix}
        nominalHeightCm={input.dropHeightCm}
        nominalCompressionCm={input.tempCompressionCm}
      />

      {/* Save / Update Calculation Sheet Modal Dialog */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {saveMode === 'NEW' ? 'บันทึกเป็นรายการคำนวณใหม่' : 'บันทึกปรับปรุงรายการคำนวณเดิม'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    โครงการ: {project?.name || 'โครงการปัจจุบัน'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Mode Toggle Tabs */}
              {criteriaList.length > 0 && (
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMode('NEW');
                      const sec = getPileSectionById(selectedSectionId);
                      setSaveName(`${sec?.label || savePileType} (${input.safeWorkingLoadTons}T)`);
                    }}
                    className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      saveMode === 'NEW'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
                    <span>สร้างสเปกใหม่ (New)</span>
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCriteriaId}
                    onClick={() => setSaveMode('UPDATE')}
                    className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      saveMode === 'UPDATE'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 disabled:opacity-40'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-600" />
                    <span>บันทึกทับเดิม (Update)</span>
                  </button>
                </div>
              )}

              {/* Name input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ชื่อรายการคำนวณ / สเปกเสาเข็ม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="เช่น I-0.26m อาคาร A (35 ตัน)"
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * ตั้งชื่อที่สื่อถึงขนาดเสาเข็มและโซนงาน เช่น สเปกอาคาร A, เสาเข็มรั้ว, เสาเข็มหอคอย
                </p>
              </div>

              {/* Pile Type specification label */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ชนิด/ประเภทเสาเข็ม (Pile Type Label)
                </label>
                <input
                  type="text"
                  value={savePileType}
                  onChange={(e) => setSavePileType(e.target.value)}
                  placeholder="เช่น Prestressed Concrete I-0.26m"
                  className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Engineering Parameters Summary Card */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-700 flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                  <span>สรุปผลการคำนวณที่จะบันทึก:</span>
                  <span className="font-mono text-amber-700 font-black">Hiley Formula</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Safe Load (Ra)</span>
                    <strong className="text-slate-800">{input.safeWorkingLoadTons} ตัน (FS = {input.safetyFactor})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Target Set S10</span>
                    <strong className="text-amber-800 text-xs font-black">{hileyResult.targetSet10BlowsCm.toFixed(2)} cm</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">สเปกลูกตุ้ม (Hammer)</span>
                    <span className="text-slate-700">{input.hammerWeightTons} T (Drop {input.dropHeightCm} cm)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">หน้าตัด & ความยาว</span>
                    <span className="text-slate-700">{input.pileSectionAreaCm2 || '-'} cm² (ยาว {input.pileLengthM || '-'} m)</span>
                  </div>
                </div>

                <div className="pt-1 text-[11px] font-mono text-emerald-800 font-bold flex items-center justify-between">
                  <span>อัตราตอกขั้นต่ำเทียบเคียง:</span>
                  <span>&ge; {hileyResult.equivalentBlowsPerFoot} blows/ft ({hileyResult.equivalentBlowsPerMeter} blw/m)</span>
                </div>
              </div>

              {/* Link Piles Option */}
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs space-y-2">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>การผูกเกณฑ์นี้กับเสาเข็มในโครงการ:</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyOption"
                      checked={applyToMatchingPiles && !applyToAllPiles}
                      onChange={() => {
                        setApplyToMatchingPiles(true);
                        setApplyToAllPiles(false);
                      }}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-700 font-medium">
                      ผูกเฉพาะเสาเข็มที่ใช้ประเภทนี้ หรือเสาเข็มที่ยังไม่มีเกณฑ์
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyOption"
                      checked={applyToAllPiles}
                      onChange={() => {
                        setApplyToAllPiles(true);
                        setApplyToMatchingPiles(false);
                      }}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-700 font-medium">
                      ผูกกับเสาเข็มทุกต้นในโครงการนี้ทันที
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyOption"
                      checked={!applyToMatchingPiles && !applyToAllPiles}
                      onChange={() => {
                        setApplyToMatchingPiles(false);
                        setApplyToAllPiles(false);
                      }}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-700 font-medium">
                      บันทึกเก็บไว้เป็นพรีเซ็ตอ้างอิงเท่านั้น (ยังไม่ผูกกับเสาเข็ม)
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  หมายเหตุ / ข้อกำหนดพิเศษ (Notes)
                </label>
                <textarea
                  rows={2}
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="เช่น กำหนดใช้ปั้นจั่นเบอร์ 2 โซนอาคาร B"
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                ยกเลิก (Esc)
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{saveMode === 'NEW' ? 'ยืนยันบันทึกเป็นสเปกใหม่' : 'ยืนยันบันทึกทับสเปกนี้'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Criteria Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModalState?.isOpen}
        title="ยืนยันการลบรายการคำนวณ / Confirm Deletion"
        message={`คุณต้องการลบสเปกการคำนวณ "${deleteModalState?.name}" ใช่หรือไม่? หากมีเสาเข็มที่ผูกกับสเปกนี้อยู่ เสาเข็มเหล่านั้นจะถูกปลดจากการอ้างอิงสเปกนี้`}
        confirmText="ยืนยันการลบ"
        cancelText="ยกเลิก"
        isDestructive={true}
        isLoading={deleteModalState?.isDeleting}
        onConfirm={confirmDeleteCriteria}
        onClose={() => setDeleteModalState(null)}
      />
    </div>
  );
}
