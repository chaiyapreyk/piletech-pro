'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';

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
      tempCompressionCm: 1.4,
      concreteStrengthKsc: 350,
      elasticModulusKsc: 280000,
      pileSectionAreaCm2: 650,
      pileLengthM: 22.0,
    },
  },
  {
    name: 'Square 0.35x0.35m (เข็มสี่เหลี่ยมตัน)',
    pileType: 'Prestressed Square 0.35m',
    data: {
      safeWorkingLoadTons: 55,
      safetyFactor: 2.5,
      hammerWeightTons: 5.0,
      dropHeightCm: 45,
      pileWeightTons: 3.0,
      restitutionCoeff: 0.25,
      tempCompressionCm: 1.5,
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

export default function HileyCalculator() {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0].name);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('I_026');
  const [input, setInput] = useState<HileyInput>(PRESETS[0].data);
  const [measuredSet10, setMeasuredSet10] = useState<string>('5.0');
  const [measuredC, setMeasuredC] = useState<string>('1.2');

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
    <div className="space-y-6">
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
                  <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">ksc (kg/cm²)</span>
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
                <p className="text-[11px] text-slate-400 mt-1">
                  * คอนกรีตทั่วไปประมาณ 2.5&times;10⁵ - 3.2&times;10⁵ ksc (แก้ไขค่าเองได้)
                </p>
              </div>

              {/* Section Area A */}
              <div>
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
                  * เปลี่ยนตามขนาดเข็มด้านบน หรือพิมพ์ตัวเลขแก้ไขโดยตรง
                </p>
              </div>

              {/* Pile Length L */}
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

          {/* Section 2: Driving Equipment & Criteria */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-amber-600" />
              <span>2. พารามิเตอร์การออกแบบและเครื่องตอก (Driving & Hammer Equipment)</span>
            </h2>

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

              {/* Pile Weight */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  น้ำหนักเสาเข็ม + หมวกครอบ ($P$)
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สัมประสิทธิ์การคืนตัว ($e$) (Restitution)
                </label>
                <select
                  value={input.restitutionCoeff}
                  onChange={(e) => handleInputChange('restitutionCoeff', parseFloat(e.target.value) || 0.25)}
                  className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value={0.25}>0.25 - หมอนไม้ (Wood Cushion)</option>
                  <option value={0.35}>0.35 - หมอนคอมโพสิต / พลาสติกแข็ง</option>
                  <option value={0.40}>0.40 - Micarta / Phenolic cushion</option>
                  <option value={0.55}>0.55 - เหล็กกระทบเหล็ก (Steel anvil)</option>
                </select>
              </div>

              {/* Elastic Compression C */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ค่าการทรุดตัวยืดหยุ่นชั่วคราว ($C = C_1 + C_2 + C_3$) (Temporary Compression)
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
                <p className="text-[11px] text-slate-400 mt-1">
                  * ค่าคำนวณทฤษฎี C₂ = {hileyResult.theoreticalC2Cm ?? '-'} cm | วัดจริงหน้างานมักอยู่ระหว่าง 1.0 - 1.5 cm
                </p>
              </div>
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
          </div>
        </div>
      </div>

      {/* Sensitivity Table */}
      <SensitivityTable
        matrix={sensitivityMatrix}
        nominalHeightCm={input.dropHeightCm}
        nominalCompressionCm={input.tempCompressionCm}
      />
    </div>
  );
}
