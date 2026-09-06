'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HardHat,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Plus,
  Search,
  Filter,
  Layers,
  X,
  Sparkles,
  ArrowRight,
  Trash2,
  Table as TableIcon,
  Grid3X3,
  LayoutGrid,
  CheckSquare,
  Square,
  Building,
  Edit3,
  Save,
} from 'lucide-react';
import DeletePileButton from './DeletePileButton';

export interface PileData {
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
  drivingRecord?: {
    id: string;
    penetrationBlows?: string | null;
    recordUnit?: string;
    recordScope?: string;
    windowLengthFt?: number | null;
    measuredLast10Cm: number;
    drivenLengthM: number;
    isSetPassed: boolean;
  } | null;
  qcInspection?: {
    id: string;
    netDeviationCm: number | null;
    deviationStatus: string;
  } | null;
}

interface PileNumberMatrixProps {
  initialPiles: PileData[];
  projectId?: string;
}

export default function PileNumberMatrix({ initialPiles, projectId }: PileNumberMatrixProps) {
  const router = useRouter();
  const [piles, setPiles] = useState<PileData[]>(initialPiles);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NOT_DRIVEN' | 'PASSED' | 'FAILED'>('ALL');
  const [filterBuilding, setFilterBuilding] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPile, setSelectedPile] = useState<PileData | null>(null);
  const [viewMode, setViewMode] = useState<'TABLE_10' | 'DENSE_HEATMAP' | 'CARDS'>('TABLE_10');
  const [selectedRange, setSelectedRange] = useState<string>('ALL');

  // Bulk Selection & Deletion Mode
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPileIds, setSelectedPileIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // + Add Pile Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPileNo, setNewPileNo] = useState('');
  const [newGridLine, setNewGridLine] = useState('');
  const [newBuilding, setNewBuilding] = useState('Building A');
  const [isAddingPile, setIsAddingPile] = useState(false);

  // Edit Pile Modal State
  const [isEditingPile, setIsEditingPile] = useState(false);
  const [editPileNo, setEditPileNo] = useState('');
  const [editGridLine, setEditGridLine] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Batch Generator Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCount, setBatchCount] = useState('300');
  const [batchPrefix, setBatchPrefix] = useState('P-');
  const [batchBuilding, setBatchBuilding] = useState('Building A');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  // Sync state if props change
  React.useEffect(() => {
    setPiles(initialPiles);
  }, [initialPiles]);

  // Calculations & KPIs
  const totalCount = piles.length;
  const notDrivenPiles = useMemo(() => piles.filter((p) => !p.drivingRecord), [piles]);
  const drivenPiles = useMemo(() => piles.filter((p) => !!p.drivingRecord), [piles]);
  const passedPiles = useMemo(
    () => piles.filter((p) => p.drivingRecord?.isSetPassed === true),
    [piles]
  );
  const failedPiles = useMemo(
    () => piles.filter((p) => p.drivingRecord && p.drivingRecord.isSetPassed === false),
    [piles]
  );

  const notDrivenCount = notDrivenPiles.length;
  const passedCount = passedPiles.length;
  const failedCount = failedPiles.length;
  const progressPercent = totalCount > 0 ? Math.round((drivenPiles.length / totalCount) * 100) : 0;

  // Compute numerical ranges (e.g. 1-50, 51-100, 101-150...) based on total count
  const rangeOptions = useMemo(() => {
    if (totalCount <= 50) return [];
    const ranges = [{ label: `ทั้งหมด (${totalCount})`, value: 'ALL' }];
    const step = 50;
    for (let i = 1; i <= totalCount; i += step) {
      const end = Math.min(i + step - 1, totalCount);
      ranges.push({
        label: `${String(i).padStart(3, '0')} - ${String(end).padStart(3, '0')}`,
        value: `${i}-${end}`,
      });
    }
    return ranges;
  }, [totalCount]);

  // Filtered piles with Range, Building, and Search
  const filteredPiles = useMemo(() => {
    return piles.filter((pile, index) => {
      // Range filter (1-based index)
      if (selectedRange !== 'ALL') {
        const [startStr, endStr] = selectedRange.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        const pileIndex = index + 1;
        if (pileIndex < start || pileIndex > end) return false;
      }

      // Building filter
      if (filterBuilding !== 'ALL' && (pile.building || 'Building A') !== filterBuilding) {
        return false;
      }

      // Status filter
      if (filterStatus === 'NOT_DRIVEN' && pile.drivingRecord) return false;
      if (filterStatus === 'PASSED' && pile.drivingRecord?.isSetPassed !== true) return false;
      if (filterStatus === 'FAILED' && (!pile.drivingRecord || pile.drivingRecord?.isSetPassed === true)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = pile.pileNo.toLowerCase().includes(q);
        const matchGrid = pile.gridLine.toLowerCase().includes(q);
        return matchNo || matchGrid;
      }

      return true;
    });
  }, [piles, filterStatus, filterBuilding, searchQuery, selectedRange]);

  // Group piles into chunks of 10 for Table-10 Grid view
  const rowsOf10 = useMemo(() => {
    const rows: { rowLabel: string; items: (PileData | null)[] }[] = [];
    if (filteredPiles.length === 0) return rows;

    for (let i = 0; i < filteredPiles.length; i += 10) {
      const chunk = filteredPiles.slice(i, i + 10);
      const firstNum = chunk[0]?.pileNo || '';
      const lastNum = chunk[chunk.length - 1]?.pileNo || '';
      const rowLabel = `${firstNum} - ${lastNum}`;
      
      const items: (PileData | null)[] = [...chunk];
      while (items.length < 10 && filteredPiles.length > 10) {
        items.push(null);
      }

      rows.push({ rowLabel, items });
    }
    return rows;
  }, [filteredPiles]);

  // Style helper for pile cells
  const getPileStatusStyle = (pile: PileData) => {
    const isDriven = !!pile.drivingRecord;
    const isPassed = pile.drivingRecord?.isSetPassed === true;
    const isFailed = isDriven && !isPassed;

    if (isFailed) {
      return {
        container: 'bg-rose-500 border-rose-600 text-white shadow-xs hover:bg-rose-600 ring-2 ring-rose-400',
        badge: 'bg-rose-700 text-white',
        text: 'Re-drive',
      };
    }
    if (isPassed) {
      return {
        container: 'bg-emerald-600 border-emerald-700 text-white shadow-xs hover:bg-emerald-700',
        badge: 'bg-emerald-800 text-white',
        text: pile.drivingRecord?.measuredLast10Cm ? `${pile.drivingRecord.measuredLast10Cm}cm` : 'ผ่าน',
      };
    }
    return {
      container: 'bg-white border-slate-300 text-slate-800 hover:border-slate-500 hover:bg-slate-50',
      badge: 'bg-slate-100 text-slate-500',
      text: 'รอตอก',
    };
  };

  // Unique building list
  const buildingList = useMemo(() => {
    const set = new Set<string>();
    piles.forEach((p) => {
      if (p.building) set.add(p.building);
    });
    return Array.from(set);
  }, [piles]);

  // Open Edit Modal with pile values
  const handleOpenEdit = (pile: PileData) => {
    setEditPileNo(pile.pileNo);
    setEditGridLine(pile.gridLine);
    setEditBuilding(pile.building || 'Building A');
    setEditStatus(pile.status);
    setIsEditingPile(true);
  };

  // Save Edit Pile
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPile) return;

    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/piles/${selectedPile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pileNo: editPileNo,
          gridLine: editGridLine,
          building: editBuilding,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pile');

      setPiles((prev) =>
        prev.map((p) => (p.id === selectedPile.id ? { ...p, ...data.pile } : p))
      );
      setSelectedPile((prev) => (prev ? { ...prev, ...data.pile } : null));
      setIsEditingPile(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Add Single Pile
  const handleAddSinglePile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPileNo.trim() || !newGridLine.trim()) {
      alert('กรุณาระบุรหัสเสาเข็มและ Grid Line');
      return;
    }

    try {
      setIsAddingPile(true);
      const targetProjectId = projectId || (typeof window !== 'undefined' ? localStorage.getItem('active_project_id') : null);
      let currentProject = null;
      if (targetProjectId) {
        const pRes = await fetch(`/api/projects/${targetProjectId}`);
        if (pRes.ok) currentProject = await pRes.json();
      }
      if (!currentProject) {
        const projectRes = await fetch('/api/projects');
        const projects = await projectRes.json();
        currentProject = projects[0];
      }

      if (!currentProject) throw new Error('No project found');

      const res = await fetch('/api/piles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          criteriaId: currentProject.criteria?.[0]?.id || null,
          pileNo: newPileNo.trim(),
          gridLine: newGridLine.trim(),
          building: newBuilding.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add pile');

      setShowAddModal(false);
      setNewPileNo('');
      setNewGridLine('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAddingPile(false);
    }
  };

  // Toggle selection for bulk mode
  const toggleSelectPile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedPileIds(new Set(filteredPiles.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedPileIds(new Set());
  };

  // Bulk Delete: Selected
  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedPileIds);
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `⚠️ ยืนยันการลบเสาเข็มที่เลือกจำนวน ${ids.length} ต้น หรือไม่?\nข้อมูลการตอกและผลตรวจ QC ทั้งหมดจะถูกลบไปด้วยถาวร`
    );
    if (!confirmed) return;

    try {
      setIsDeletingBulk(true);
      const targetProjectId = projectId || (typeof window !== 'undefined' ? localStorage.getItem('active_project_id') : undefined);
      const res = await fetch('/api/piles/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SELECTED',
          ids,
          projectId: targetProjectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete selected piles');

      setSelectedPileIds(new Set());
      setIsBulkMode(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Bulk Delete: All Pending
  const handleDeleteAllPending = async () => {
    const confirmed = window.confirm(
      `⚠️ ยืนยันการลบเสาเข็มที่ "ยังไม่ได้ตอก" ทั้งหมด (${notDrivenCount} ต้น) หรือไม่?\nเสาเข็มที่ตอกแล้วหรือมีผล QC จะไม่ถูกลบ`
    );
    if (!confirmed) return;

    try {
      setIsDeletingBulk(true);
      const targetProjectId = projectId || (typeof window !== 'undefined' ? localStorage.getItem('active_project_id') : undefined);
      const res = await fetch('/api/piles/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ALL_PENDING',
          projectId: targetProjectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete pending piles');

      setSelectedPileIds(new Set());
      setIsBulkMode(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Handle batch generate submission
  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(batchCount, 10);
    if (!count || count <= 0) {
      alert('กรุณาระบุจำนวนเสาเข็มที่ถูกต้อง (มากกว่า 0)');
      return;
    }

    try {
      setIsSubmittingBatch(true);
      setBatchFeedback(null);
      const targetProjectId = projectId || (typeof window !== 'undefined' ? localStorage.getItem('active_project_id') : undefined);
      const res = await fetch('/api/piles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalCount: count,
          prefix: batchPrefix || 'P-',
          building: batchBuilding || 'Building A',
          projectId: targetProjectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate piles');
      }

      setBatchFeedback(data.message);
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchFeedback(null);
        router.refresh();
      }, 1200);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`cursor-pointer bg-white rounded-xl p-4 border transition ${
            filterStatus === 'ALL'
              ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">จำนวนทั้งหมด</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-400 font-semibold">ต้น</span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-600 font-bold">
            ความคืบหน้า {progressPercent}%
          </div>
        </div>

        {/* Not Driven (Pending) - High Contrast Highlight */}
        <div
          onClick={() => setFilterStatus('NOT_DRIVEN')}
          className={`cursor-pointer rounded-xl p-4 border transition ${
            filterStatus === 'NOT_DRIVEN'
              ? 'bg-amber-50/50 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">⚪ ยังไม่ได้ตอก</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{notDrivenCount}</span>
            <span className="text-xs text-slate-400 font-semibold">ต้น</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {totalCount > 0 ? `เหลืออีก ${Math.round((notDrivenCount / totalCount) * 100)}%` : '-'}
          </div>
        </div>

        {/* Passed */}
        <div
          onClick={() => setFilterStatus('PASSED')}
          className={`cursor-pointer rounded-xl p-4 border transition ${
            filterStatus === 'PASSED'
              ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">🟢 ตอกเสร็จ Set ผ่าน</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{passedCount}</span>
            <span className="text-xs text-slate-400 font-semibold">ต้น</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">
            {totalCount > 0 ? `${Math.round((passedCount / totalCount) * 100)}% ของโครงการ` : '-'}
          </div>
        </div>

        {/* Issues / Failed */}
        <div
          onClick={() => setFilterStatus('FAILED')}
          className={`cursor-pointer rounded-xl p-4 border transition ${
            filterStatus === 'FAILED'
              ? 'bg-rose-50/50 border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">🔴 Re-drive / มีปัญหา</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{failedCount}</span>
            <span className="text-xs text-slate-400 font-semibold">ต้น</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">
            {failedCount > 0 ? 'ต้องตอกซ้ำ / เจาะสำรวจ' : 'ไม่มีเสาเข็มติดปัญหา'}
          </div>
        </div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search & Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเบอร์เข็ม (เช่น 05, A-1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-1 text-[11px] font-bold">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-md transition ${
                filterStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({totalCount})
            </button>
            <button
              onClick={() => setFilterStatus('NOT_DRIVEN')}
              className={`px-2.5 py-1 rounded-md transition ${
                filterStatus === 'NOT_DRIVEN'
                  ? 'bg-white text-amber-800 shadow-xs ring-1 ring-amber-300'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              ⚪ ยังไม่ตอก ({notDrivenCount})
            </button>
            <button
              onClick={() => setFilterStatus('PASSED')}
              className={`px-2.5 py-1 rounded-md transition ${
                filterStatus === 'PASSED'
                  ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-300'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              🟢 ผ่าน ({passedCount})
            </button>
            {failedCount > 0 && (
              <button
                onClick={() => setFilterStatus('FAILED')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterStatus === 'FAILED'
                    ? 'bg-white text-rose-800 shadow-xs ring-1 ring-rose-300'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                🔴 มีปัญหา ({failedCount})
              </button>
            )}
            {/* Building Filter Dropdown */}
            {buildingList.length > 0 && (
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">🏢 ทุกอาคาร / โซน</option>
                {buildingList.map((bldg) => (
                  <option key={bldg} value={bldg}>
                    🏢 {bldg}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

        {/* Action Buttons: + Add Pile, Bulk Actions, Batch Setup, View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* + Add Single Pile Button */}
            <button
              type="button"
              onClick={() => {
                setNewPileNo(`P-${String(totalCount + 1).padStart(3, '0')}`);
                setNewGridLine('A-1');
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ เพิ่มเสาเข็ม</span>
            </button>

            {/* Bulk Delete Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setSelectedPileIds(new Set());
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                isBulkMode
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isBulkMode ? 'ปิดจัดการลบ' : 'ลบแบบกลุ่ม'}</span>
            </button>

            {/* Batch Setup Button */}
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตั้งค่าจำนวนเข็ม (300+)</span>
              <span className="sm:hidden">ชุด 300+</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('TABLE_10')}
              title="ตารางกริดแถวละ 10 ต้น (อ่านง่ายมาตรฐาน)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition ${
                viewMode === 'TABLE_10'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตาราง 10 คอลัมน์</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('DENSE_HEATMAP')}
              title="ตารางกริดความหนาแน่นสูง (สำหรับเข็ม 300+ ต้น)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition ${
                viewMode === 'DENSE_HEATMAP'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">กริด 300+ แน่นพิเศษ</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              title="การ์ดขยายรายละเอียด"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition ${
                viewMode === 'CARDS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">การ์ดใหญ่</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Sub-bar when isBulkMode is Active */}
        {isBulkMode && (
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
              <CheckSquare className="w-4 h-4 text-rose-600" />
              <span>โหมดลบแบบกลุ่ม: เลือกแล้ว {selectedPileIds.size} ต้น</span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="underline text-indigo-700 hover:text-indigo-900 ml-2"
              >
                เลือกทั้งหมด ({filteredPiles.length})
              </button>
              {selectedPileIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="underline text-slate-600 hover:text-slate-800"
                >
                  ยกเลิกเลือก
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedPileIds.size === 0 || isDeletingBulk}
                className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบที่เลือก ({selectedPileIds.size})</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteAllPending}
                disabled={notDrivenCount === 0 || isDeletingBulk}
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-40"
              >
                <span>ลบที่ยังไม่ตอกทั้งหมด ({notDrivenCount})</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Range Jump (If more than 50 piles) */}
        {rangeOptions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-bold whitespace-nowrap mr-1">ช่วงเบอร์เข็ม:</span>
            {rangeOptions.map((rng) => (
              <button
                key={rng.value}
                type="button"
                onClick={() => setSelectedRange(rng.value)}
                className={`px-2.5 py-1 rounded-full font-mono font-bold whitespace-nowrap transition ${
                  selectedRange === rng.value
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {rng.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Number Matrix Visual Grid */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span>ผังกริดสถานะเสาเข็ม (Pile Progress Grid Matrix)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                {filteredPiles.length} / {totalCount} ต้น
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกหรือแตะที่ช่องตัวเลขเพื่อดูรายละเอียด, บันทึกการตอก, หรือตรวจ QC
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3.5 h-3.5 rounded-sm bg-white border-2 border-slate-300 inline-block shadow-2xs"></span>
              ยังไม่ได้ตอก ({notDrivenCount})
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3.5 h-3.5 rounded-sm bg-emerald-600 inline-block"></span>
              ตอกเสร็จ Set ผ่าน ({passedCount})
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="w-3.5 h-3.5 rounded-sm bg-rose-500 inline-block"></span>
              Re-drive / ปัญหา ({failedCount})
            </span>
          </div>
        </div>

        {filteredPiles.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-semibold">ไม่พบรายการเสาเข็มที่ตรงกับเงื่อนไข</p>
            <button
              type="button"
              onClick={() => {
                setFilterStatus('ALL');
                setSearchQuery('');
                setSelectedRange('ALL');
              }}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <>
            {/* VIEW MODE 1: Table with 10 Columns (Standard Grid Table) */}
            {viewMode === 'TABLE_10' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono">
                      <th className="p-2 text-left font-bold w-24 text-slate-400">ช่วงลำดับ</th>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                        <th key={col} className="p-2 text-center font-black text-slate-600">
                          +{col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rowsOf10.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50 transition">
                        <td className="p-2 text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap">
                          {row.rowLabel}
                        </td>
                        {row.items.map((pile, cIdx) => {
                          if (!pile) {
                            return <td key={cIdx} className="p-1 text-center"></td>;
                          }
                          const style = getPileStatusStyle(pile);
                          const cleanNum = pile.pileNo.replace(/^[A-Za-z]+-0*/, '') || pile.pileNo;
                          const isSelected = selectedPileIds.has(pile.id);

                          return (
                            <td key={pile.id} className="p-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (isBulkMode) {
                                    toggleSelectPile(pile.id, e);
                                  } else {
                                    setSelectedPile(pile);
                                  }
                                }}
                                title={`${pile.pileNo} (${pile.gridLine}) - ${style.text}`}
                                className={`relative w-full py-2 px-1 rounded-lg border-2 flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                                  isBulkMode && isSelected
                                    ? 'bg-rose-100 border-rose-500 text-rose-950 shadow-md ring-2 ring-rose-400 font-bold'
                                    : style.container
                                }`}
                              >
                                {isBulkMode && (
                                  <span className="absolute top-1 right-1">
                                    {isSelected ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </span>
                                )}
                                <span className="text-[9px] font-mono opacity-80 leading-none">
                                  {pile.gridLine}
                                </span>
                                <span className="text-xs sm:text-sm font-black font-mono my-0.5 leading-none">
                                  {cleanNum}
                                </span>
                                <span className="text-[8px] font-bold opacity-90 leading-none">
                                  {style.text}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW MODE 2: Dense Heatmap Grid (Ultra Compact for 300+ Piles) */}
            {viewMode === 'DENSE_HEATMAP' && (
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-1.5">
                {filteredPiles.map((pile) => {
                  const style = getPileStatusStyle(pile);
                  const cleanNum = pile.pileNo.replace(/^[A-Za-z]+-0*/, '') || pile.pileNo;
                  const isSelected = selectedPileIds.has(pile.id);

                  return (
                    <button
                      key={pile.id}
                      type="button"
                      onClick={(e) => {
                        if (isBulkMode) {
                          toggleSelectPile(pile.id, e);
                        } else {
                          setSelectedPile(pile);
                        }
                      }}
                      title={`${pile.pileNo} (${pile.gridLine}) - ${style.text}`}
                      className={`relative aspect-square p-1 rounded-md border-2 flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer text-center ${
                        isBulkMode && isSelected
                          ? 'bg-rose-200 border-rose-600 text-rose-950 shadow-md ring-2 ring-rose-500'
                          : style.container
                      }`}
                    >
                      {isBulkMode && isSelected && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 border border-white"></span>
                      )}
                      <span className="text-[10px] font-black font-mono leading-none">
                        {cleanNum}
                      </span>
                      <span className="text-[7px] font-medium opacity-80 leading-none mt-0.5 truncate max-w-full">
                        {pile.gridLine}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* VIEW MODE 3: Cards View */}
            {viewMode === 'CARDS' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {filteredPiles.map((pile) => {
                  const style = getPileStatusStyle(pile);
                  const isSelected = selectedPileIds.has(pile.id);

                  return (
                    <button
                      key={pile.id}
                      type="button"
                      onClick={(e) => {
                        if (isBulkMode) {
                          toggleSelectPile(pile.id, e);
                        } else {
                          setSelectedPile(pile);
                        }
                      }}
                      className={`relative p-3 rounded-xl border-2 flex flex-col items-center justify-between text-center transition-transform active:scale-95 cursor-pointer min-h-[85px] ${
                        isBulkMode && isSelected
                          ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-md ring-2 ring-rose-300'
                          : style.container
                      }`}
                    >
                      {isBulkMode && (
                        <div className="absolute top-2 right-2">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}
                      <span className="text-[10px] font-mono tracking-tight opacity-80 uppercase">
                        {pile.gridLine}
                      </span>
                      <span className="text-base font-black font-mono my-1">
                        {pile.pileNo}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${style.badge}`}>
                        {style.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Pile Quick Action Modal */}
      {selectedPile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  รายละเอียดเสาเข็ม
                </span>
                <h3 className="text-xl font-black font-mono flex items-center gap-2">
                  <span>{selectedPile.pileNo}</span>
                  <span className="text-xs font-normal text-slate-300">({selectedPile.gridLine})</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedPile(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-600">สถานะปัจจุบัน:</span>
                {!selectedPile.drivingRecord ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full text-xs">
                    <Clock className="w-3.5 h-3.5" /> ยังไม่ได้ตอก (รอตอก)
                  </span>
                ) : selectedPile.drivingRecord.isSetPassed ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ตอกเสร็จ Set ผ่านเกณฑ์
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full text-xs">
                    <AlertCircle className="w-3.5 h-3.5" /> Set ไม่ผ่าน (ต้อง Re-drive)
                  </span>
                )}
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-semibold">ประเภทเสาเข็ม / สเปกคำนวณ</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate" title={selectedPile.criteria?.name || selectedPile.criteria?.pileType}>
                    {selectedPile.criteria?.name || selectedPile.criteria?.pileType || 'I-Section 0.26m'}
                  </span>
                  {selectedPile.criteria?.id && (
                    <Link
                      href={`/calculator?criteriaId=${selectedPile.criteria.id}`}
                      className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold mt-1"
                    >
                      <Sparkles className="w-3 h-3" /> ดูรายการคำนวณ Hiley
                    </Link>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-semibold">Safe Load (Ra)</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {selectedPile.criteria?.safeWorkingLoadT || 30} ตัน
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-semibold">ความลึกที่ตอก (Driven Length)</span>
                  <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                    {selectedPile.drivingRecord
                      ? `${selectedPile.drivingRecord.drivenLengthM} m (${(selectedPile.drivingRecord.drivenLengthM * 3.28084).toFixed(1)} ft)`
                      : '-'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-semibold">Last 10 Blows Set</span>
                  <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                    {selectedPile.drivingRecord
                      ? `${selectedPile.drivingRecord.measuredLast10Cm} cm (เกณฑ์ &le; ${selectedPile.criteria?.targetSet10BlowsCm || 2.5} cm)`
                      : '-'}
                  </span>
                </div>
              </div>

              {/* QC Status if available */}
              {selectedPile.qcInspection && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">ผลตรวจสอบ QC เยื้องศูนย์:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded text-[10px] ${
                      selectedPile.qcInspection.deviationStatus === 'NORMAL'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedPile.qcInspection.deviationStatus === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    เยื้อง {selectedPile.qcInspection.netDeviationCm} cm ({selectedPile.qcInspection.deviationStatus})
                  </span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/piles/${selectedPile.id}/drive`}
                    className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-2 rounded-lg font-bold transition shadow-xs"
                  >
                    <HardHat className="w-3.5 h-3.5" />
                    <span>{selectedPile.drivingRecord ? 'แก้ไขผลการตอก' : 'บันทึกการตอก'}</span>
                  </Link>

                  <Link
                    href={`/piles/${selectedPile.id}/qc`}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-bold transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ตรวจ QC</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedPile)}
                    className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold transition border border-indigo-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                </div>

                <DeletePileButton
                  pileId={selectedPile.id}
                  pileNo={selectedPile.pileNo}
                  onDeleted={() => {
                    setSelectedPile(null);
                    router.refresh();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Batch Generation Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h3 className="text-base font-black">ระบุจำนวนเข็มทั้งหมด / เพิ่มชุดอัตโนมัติ</h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchGenerate} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                ระบบจะทำการสร้างรายการเสาเข็มต่อเนื่องอัตโนมัติ (เช่น P-001, P-002, ...)
                โดยตรวจสอบไม่ให้ซ้ำกับเบอร์เสาเข็มเดิมที่มีอยู่แล้วในโครงการ
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนเสาเข็มที่ต้องการสร้าง (ต้น)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น 300, 350, 500"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">ปุ่มลัด:</span>
                  {[50, 100, 200, 300, 350, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBatchCount(String(preset))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono font-bold"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] text-slate-400 mt-2 block">
                  ปัจจุบันมีเสาเข็มในระบบแล้ว {totalCount} ต้น
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำนำหน้าชื่อเสาเข็ม (Prefix)
                </label>
                <input
                  type="text"
                  required
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น P-, B-, S-"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อาคาร / โซน (Building / Zone)
                </label>
                <input
                  type="text"
                  required
                  value={batchBuilding}
                  onChange={(e) => setBatchBuilding(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น Building A, Building B, โซนอาคาร 1"
                />
                {buildingList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400 font-semibold">เลือกจากที่มีอยู่:</span>
                    {buildingList.map((bldg) => (
                      <button
                        key={bldg}
                        type="button"
                        onClick={() => setBatchBuilding(bldg)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          batchBuilding === bldg
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        🏢 {bldg}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {batchFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 animate-in fade-in">
                  ✅ {batchFeedback}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  disabled={isSubmittingBatch}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmittingBatch ? 'กำลังสร้าง...' : 'สร้างเสาเข็มทันที'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Single Pile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-amber-500 text-slate-950 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <h3 className="text-base font-black">เพิ่มเสาเข็มต้นเดี่ยว (+ Add Pile)</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-800 hover:text-slate-950 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSinglePile} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัส / หมายเลขเสาเข็ม (Pile No.)
                </label>
                <input
                  type="text"
                  required
                  value={newPileNo}
                  onChange={(e) => setNewPileNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="เช่น P-302, P-A15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ตำแหน่งกริดไลน์ (Grid Line)
                </label>
                <input
                  type="text"
                  required
                  value={newGridLine}
                  onChange={(e) => setNewGridLine(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="เช่น A-1, B-3/4"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อาคาร / โซน (Building / Zone)
                </label>
                <input
                  type="text"
                  value={newBuilding}
                  onChange={(e) => setNewBuilding(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="เช่น Building A, Zone East"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isAddingPile}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isAddingPile}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingPile ? 'กำลังบันทึก...' : 'เพิ่มเสาเข็ม'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Edit Pile Modal */}
      {isEditingPile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-indigo-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-base font-black">แก้ไขข้อมูลเสาเข็ม (Edit Pile Details)</h3>
              </div>
              <button
                onClick={() => setIsEditingPile(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัส / หมายเลขเสาเข็ม (Pile No.)
                </label>
                <input
                  type="text"
                  required
                  value={editPileNo}
                  onChange={(e) => setEditPileNo(e.target.value)}
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
                  value={editGridLine}
                  onChange={(e) => setEditGridLine(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อาคาร / โซน (Building / Zone)
                </label>
                <input
                  type="text"
                  value={editBuilding}
                  onChange={(e) => setEditBuilding(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สถานะ (Status)
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PENDING">PENDING (ยังไม่ตอก)</option>
                  <option value="DRIVING">DRIVING (กำลังตอก)</option>
                  <option value="DRIVEN">DRIVEN (ตอกเสร็จแล้ว)</option>
                  <option value="APPROVED">APPROVED (ผ่านการตรวจ)</option>
                  <option value="REJECTED">REJECTED (ไม่ผ่าน/รอแก้ไข)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPile(false)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
