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
  ClipboardList,
  CheckSquare,
  Square,
  Building,
  Edit3,
  Save,
  Loader2,
} from 'lucide-react';
import DeletePileButton from './DeletePileButton';
import { useToast } from '@/components/ui/ToastProvider';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { calculateAverageBlows } from '@/lib/calculations/drivingLog';
import {
  type PileData,
  type ProjectCriteriaOption,
  getPileStatusStyle,
} from './matrix/matrixTypes';
export { type PileData, type ProjectCriteriaOption, getPileStatusStyle };

import MatrixSummaryCards from './matrix/MatrixSummaryCards';
import MatrixTableView from './matrix/MatrixTableView';
import MatrixDenseHeatmap from './matrix/MatrixDenseHeatmap';
import MatrixCardsView from './matrix/MatrixCardsView';
import MatrixDetailedTable from './matrix/MatrixDetailedTable';
import PileDetailModal from './PileDetailModal';

interface PileNumberMatrixProps {
  initialPiles: PileData[];
  projectId?: string;
  projectCriteria?: ProjectCriteriaOption[];
}

export default function PileNumberMatrix({
  initialPiles,
  projectId,
  projectCriteria = [],
}: PileNumberMatrixProps) {
  const router = useRouter();
  const toast = useToast();
  const [piles, setPiles] = useState<PileData[]>(initialPiles);
  const [criteriaList, setCriteriaList] = useState<ProjectCriteriaOption[]>(projectCriteria);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NOT_DRIVEN' | 'PASSED' | 'FAILED'>('ALL');
  const [filterBuilding, setFilterBuilding] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPile, setSelectedPile] = useState<PileData | null>(null);
  const [viewMode, setViewMode] = useState<'TABLE_10' | 'DENSE_HEATMAP' | 'CARDS' | 'DETAILED_TABLE'>('TABLE_10');
  const [selectedRange, setSelectedRange] = useState<string>('ALL');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Bulk Selection & Deletion Mode
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPileIds, setSelectedPileIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Bulk Criteria Modal State
  const [showBulkCriteriaModal, setShowBulkCriteriaModal] = useState(false);
  const [bulkCriteriaId, setBulkCriteriaId] = useState<string>('');
  const [isUpdatingBulkCriteria, setIsUpdatingBulkCriteria] = useState(false);

  // + Add Pile Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPileNo, setNewPileNo] = useState('');
  const [newGridLine, setNewGridLine] = useState('');
  const [newBuilding, setNewBuilding] = useState('Building A');
  const [newCriteriaId, setNewCriteriaId] = useState<string>(projectCriteria[0]?.id || '');
  const [isAddingPile, setIsAddingPile] = useState(false);

  // Edit Pile Modal State
  const [isEditingPile, setIsEditingPile] = useState(false);
  const [editPileNo, setEditPileNo] = useState('');
  const [editGridLine, setEditGridLine] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editCriteriaId, setEditCriteriaId] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Batch Generator Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCount, setBatchCount] = useState('300');
  const [batchPrefix, setBatchPrefix] = useState('P-');
  const [batchBuilding, setBatchBuilding] = useState('Building A');
  const [batchCriteriaId, setBatchCriteriaId] = useState<string>(projectCriteria[0]?.id || '');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  // Sync state if props change
  React.useEffect(() => {
    setPiles(initialPiles);
  }, [initialPiles]);

  React.useEffect(() => {
    if (projectCriteria && projectCriteria.length > 0) {
      setCriteriaList(projectCriteria);
      if (!newCriteriaId) setNewCriteriaId(projectCriteria[0].id);
      if (!batchCriteriaId) setBatchCriteriaId(projectCriteria[0].id);
    }
  }, [projectCriteria]);

  // Fallback fetch if criteriaList is empty
  React.useEffect(() => {
    if ((!criteriaList || criteriaList.length === 0) && projectId) {
      fetch(`/api/criteria?projectId=${projectId}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setCriteriaList(data);
            setNewCriteriaId((prev) => prev || data[0].id);
            setBatchCriteriaId((prev) => prev || data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [projectId]);

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
    setSelectedPile(pile);
    setEditPileNo(pile.pileNo);
    setEditGridLine(pile.gridLine);
    setEditBuilding(pile.building || 'Building A');
    setEditStatus(pile.status);
    setEditCriteriaId(pile.criteriaId || pile.criteria?.id || criteriaList[0]?.id || '');
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
          criteriaId: editCriteriaId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pile');

      setPiles((prev) =>
        prev.map((p) => (p.id === selectedPile.id ? { ...p, ...data.pile } : p))
      );
      setSelectedPile((prev) => (prev ? { ...prev, ...data.pile } : null));
      setIsEditingPile(false);
      toast.success('บันทึกการแก้ไขข้อมูลเสาเข็มสำเร็จ');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการแก้ไข');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Add Single Pile
  const handleAddSinglePile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPileNo.trim() || !newGridLine.trim()) {
      toast.warning('กรุณาระบุรหัสเสาเข็มและ Grid Line');
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

      if (!currentProject && !projectId) throw new Error('No project found');

      const targetCriteriaId = newCriteriaId || criteriaList[0]?.id || currentProject?.criteria?.[0]?.id || null;

      const res = await fetch('/api/piles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id || projectId,
          criteriaId: targetCriteriaId,
          pileNo: newPileNo.trim(),
          gridLine: newGridLine.trim(),
          building: newBuilding.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add pile');

      toast.success(`เพิ่มเสาเข็ม "${newPileNo.trim()}" สำเร็จ`);
      setShowAddModal(false);
      setNewPileNo('');
      setNewGridLine('');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการเพิ่มเสาเข็ม');
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

    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบเสาเข็มที่เลือก',
      message: `คุณต้องการลบเสาเข็มที่เลือกจำนวน ${ids.length} ต้น หรือไม่?\nข้อมูลการตอกและผลตรวจ QC ทั้งหมดของเสาเข็มเหล่านี้จะถูกลบไปด้วยถาวร`,
      isDestructive: true,
      confirmText: `ยืนยันลบ ${ids.length} ต้น`,
      onConfirm: async () => {
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
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          toast.success(`ลบเสาเข็มที่เลือกสำเร็จ ${ids.length} ต้น`);
          router.refresh();
        } catch (err: any) {
          toast.error(err.message || 'เกิดข้อผิดพลาดในการลบเสาเข็ม');
        } finally {
          setIsDeletingBulk(false);
        }
      },
    });
  };

  // Bulk Delete: All Pending
  const handleDeleteAllPending = async () => {
    if (notDrivenCount === 0) {
      toast.info('ไม่มีเสาเข็มที่ยังไม่ได้ตอก');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบเสาเข็มที่ยังไม่ได้ตอกทั้งหมด',
      message: `คุณต้องการลบเสาเข็มที่ "ยังไม่ได้ตอก" ทั้งหมด (${notDrivenCount} ต้น) หรือไม่?\nเสาเข็มที่ตอกแล้วหรือมีผล QC จะไม่ได้รับผลกระทบ`,
      isDestructive: true,
      confirmText: `ยืนยันลบ ${notDrivenCount} ต้น`,
      onConfirm: async () => {
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
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          toast.success(`ลบเสาเข็มที่ยังไม่ได้ตอกสำเร็จ ${notDrivenCount} ต้น`);
          router.refresh();
        } catch (err: any) {
          toast.error(err.message || 'เกิดข้อผิดพลาดในการลบเสาเข็ม');
        } finally {
          setIsDeletingBulk(false);
        }
      },
    });
  };

  // Handle batch generate submission
  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(batchCount, 10);
    if (!count || count <= 0) {
      toast.warning('กรุณาระบุจำนวนเสาเข็มที่ถูกต้อง (มากกว่า 0)');
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
          criteriaId: batchCriteriaId || (criteriaList[0]?.id || null),
          projectId: targetProjectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate piles');
      }

      toast.success(data.message || 'สร้างชุดเสาเข็มสำเร็จ');
      setBatchFeedback(data.message);
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchFeedback(null);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการสร้างเสาเข็ม');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Handle bulk change criteria for selected piles
  const handleBulkChangeCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPileIds.size === 0) return;

    try {
      setIsUpdatingBulkCriteria(true);
      const res = await fetch('/api/piles/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedPileIds),
          criteriaId: bulkCriteriaId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update piles');

      const targetCriteria = criteriaList.find((c) => c.id === bulkCriteriaId) || null;
      setPiles((prev) =>
        prev.map((p) =>
          selectedPileIds.has(p.id)
            ? {
                ...p,
                criteriaId: bulkCriteriaId || null,
                criteria: targetCriteria
                  ? {
                      id: targetCriteria.id,
                      name: targetCriteria.name,
                      pileType: targetCriteria.pileType,
                      safeWorkingLoadT: targetCriteria.safeWorkingLoadT,
                      targetSet10BlowsCm: targetCriteria.targetSet10BlowsCm,
                    }
                  : null,
              }
            : p
        )
      );

      toast.success(`อัปเดตสเปกเสาเข็มสำเร็จ ${selectedPileIds.size} ต้น`);
      setShowBulkCriteriaModal(false);
      setIsBulkMode(false);
      setSelectedPileIds(new Set());
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการอัปเดตสเปก');
    } finally {
      setIsUpdatingBulkCriteria(false);
    }
  };

  const selectedNewCriteria = useMemo(
    () => criteriaList.find((c) => c.id === newCriteriaId),
    [criteriaList, newCriteriaId]
  );
  const selectedEditCriteria = useMemo(
    () => criteriaList.find((c) => c.id === editCriteriaId),
    [criteriaList, editCriteriaId]
  );
  const selectedBulkCriteria = useMemo(
    () => criteriaList.find((c) => c.id === bulkCriteriaId),
    [criteriaList, bulkCriteriaId]
  );

  return (
    <div className="space-y-6">
      {/* 1. Summary KPI Bar */}
      <MatrixSummaryCards
        totalCount={totalCount}
        notDrivenCount={notDrivenCount}
        passedCount={passedCount}
        failedCount={failedCount}
        progressPercent={progressPercent}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

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

            {/* Bulk Delete & Criteria Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setSelectedPileIds(new Set());
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                isBulkMode
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs ring-1 ring-amber-400'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
              <span>{isBulkMode ? 'ปิดโหมดเลือกกลุ่ม' : 'จัดการแบบกลุ่ม'}</span>
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

            <button
              type="button"
              onClick={() => setViewMode('DETAILED_TABLE')}
              title="ตารางรายละเอียดข้อมูลวิศวกรรมเชิงลึก (รวมทุกคอลัมน์)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition ${
                viewMode === 'DETAILED_TABLE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตารางละเอียด</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Sub-bar when isBulkMode is Active */}
        {isBulkMode && (
          <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>เลือกเสาเข็มแล้ว: <span className="text-amber-400 font-mono text-sm">{selectedPileIds.size}</span> ต้น</span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="underline text-indigo-300 hover:text-white ml-2 text-[11px]"
              >
                เลือกทั้งหมด ({filteredPiles.length})
              </button>
              {selectedPileIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="underline text-slate-400 hover:text-white text-[11px]"
                >
                  ยกเลิกเลือก
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkCriteriaId(criteriaList[0]?.id || '');
                  setShowBulkCriteriaModal(true);
                }}
                disabled={selectedPileIds.size === 0}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-40 shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>เปลี่ยนขนาดเข็ม ({selectedPileIds.size})</span>
              </button>

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
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-40"
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
              <MatrixTableView
                rowsOf10={rowsOf10}
                isBulkMode={isBulkMode}
                selectedPileIds={selectedPileIds}
                toggleSelectPile={toggleSelectPile}
                setSelectedPile={setSelectedPile}
              />
            )}

            {/* VIEW MODE 2: Dense Heatmap Grid (Ultra Compact for 300+ Piles) */}
            {viewMode === 'DENSE_HEATMAP' && (
              <MatrixDenseHeatmap
                filteredPiles={filteredPiles}
                isBulkMode={isBulkMode}
                selectedPileIds={selectedPileIds}
                toggleSelectPile={toggleSelectPile}
                setSelectedPile={setSelectedPile}
              />
            )}

            {/* VIEW MODE 3: Cards View */}
            {viewMode === 'CARDS' && (
              <MatrixCardsView
                filteredPiles={filteredPiles}
                isBulkMode={isBulkMode}
                selectedPileIds={selectedPileIds}
                toggleSelectPile={toggleSelectPile}
                setSelectedPile={setSelectedPile}
              />
            )}

            {/* VIEW MODE 4: Detailed Table View */}
            {viewMode === 'DETAILED_TABLE' && (
              <MatrixDetailedTable
                filteredPiles={filteredPiles}
                isBulkMode={isBulkMode}
                selectedPileIds={selectedPileIds}
                toggleSelectPile={toggleSelectPile}
                handleSelectAllFiltered={handleSelectAllFiltered}
                handleDeselectAll={handleDeselectAll}
                setSelectedPile={setSelectedPile}
                handleOpenEdit={handleOpenEdit}
                onPileDeleted={(pileId) => {
                  setPiles((prev) => prev.filter((p) => p.id !== pileId));
                  router.refresh();
                }}
              />
            )}
          </>
        )}
      </div>

      {/* 4. Read-Only Pile Detail Modal with Synchronized Charts & PDF Export */}
      {selectedPile && (
        <PileDetailModal
          pile={selectedPile}
          onClose={() => setSelectedPile(null)}
          onOpenEdit={handleOpenEdit}
        />
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ขนาดเสาเข็ม / รายการคำนวณสำหรับชุดนี้ (Pile Size & Criteria)</span>
                  <Link
                    href="/calculator"
                    target="_blank"
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-normal"
                  >
                    + จัดการในสูตร Hiley
                  </Link>
                </label>
                {criteriaList.length > 0 ? (
                  <select
                    value={batchCriteriaId}
                    onChange={(e) => setBatchCriteriaId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {criteriaList.map((crit) => (
                      <option key={crit.id} value={crit.id}>
                        {crit.name || crit.pileType} (Ra: {crit.safeWorkingLoadT}t, S₁₀ ≤ {crit.targetSet10BlowsCm}cm)
                      </option>
                    ))}
                    <option value="">-- ยังไม่ระบุสเปก (Unassigned) --</option>
                  </select>
                ) : (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    ยังไม่มีรายการคำนวณในโครงการ สามารถกำหนดในภายหลังได้
                  </p>
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ขนาดเสาเข็ม / รายการคำนวณ (Pile Size & Criteria)
                  </label>
                  <Link
                    href="/calculator"
                    target="_blank"
                    className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    + ไปจัดการในสูตร Hiley
                  </Link>
                </div>
                {criteriaList.length > 0 ? (
                  <select
                    value={newCriteriaId}
                    onChange={(e) => setNewCriteriaId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {criteriaList.map((crit) => (
                      <option key={crit.id} value={crit.id}>
                        {crit.name || crit.pileType} (Ra: {crit.safeWorkingLoadT}t, S₁₀ ≤ {crit.targetSet10BlowsCm}cm)
                      </option>
                    ))}
                    <option value="">-- ยังไม่กำหนดสเปก (Unassigned) --</option>
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                    ยังไม่มีรายการคำนวณในโครงการนี้{' '}
                    <Link href="/calculator" className="underline font-bold text-amber-800">
                      คลิกที่นี่เพื่อไปตั้งค่าสูตร Hiley
                    </Link>
                  </div>
                )}
              </div>

              {selectedNewCriteria && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Safe Load (Ra)</span>
                    <span className="font-bold text-slate-900">{selectedNewCriteria.safeWorkingLoadT} ตัน</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Target Set (S₁₀)</span>
                    <span className="font-bold text-amber-700 font-mono">≤ {selectedNewCriteria.targetSet10BlowsCm} cm</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Drop / Hammer</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {selectedNewCriteria.dropHeightCm}cm / {selectedNewCriteria.hammerWeightT}t
                    </span>
                  </div>
                </div>
              )}

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
                    value={editCriteriaId}
                    onChange={(e) => setEditCriteriaId(e.target.value)}
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
                  <p className="text-[11px] text-slate-500">
                    ยังไม่มีรายการคำนวณในโครงการ
                  </p>
                )}
              </div>

              {selectedEditCriteria && (
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Safe Load (Ra)</span>
                    <span className="font-bold text-indigo-950">{selectedEditCriteria.safeWorkingLoadT} ตัน</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Target Set (S₁₀)</span>
                    <span className="font-bold text-amber-600 font-mono">≤ {selectedEditCriteria.targetSet10BlowsCm} cm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Drop / Hammer</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {selectedEditCriteria.dropHeightCm}cm / {selectedEditCriteria.hammerWeightT}t
                    </span>
                  </div>
                </div>
              )}

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

      {/* 8. Bulk Criteria Assignment Modal */}
      {showBulkCriteriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-amber-500 text-slate-950 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                <h3 className="text-base font-black">
                  เปลี่ยนขนาดเสาเข็มที่เลือก ({selectedPileIds.size} ต้น)
                </h3>
              </div>
              <button
                onClick={() => setShowBulkCriteriaModal(false)}
                className="text-slate-800 hover:text-slate-950 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkChangeCriteria} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                กำหนดขนาดเสาเข็มและสเปกการคำนวณ Target Set ($S_{10}$) ให้กับเสาเข็มที่เลือกทั้ง{' '}
                <strong>{selectedPileIds.size} ต้น</strong> พร้อมกันทันที
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    เลือกขนาดเสาเข็ม / รายการคำนวณใหม่
                  </label>
                  <Link
                    href="/calculator"
                    target="_blank"
                    className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline font-semibold"
                  >
                    + ไปจัดการในสูตร Hiley
                  </Link>
                </div>
                {criteriaList.length > 0 ? (
                  <select
                    value={bulkCriteriaId}
                    onChange={(e) => setBulkCriteriaId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {criteriaList.map((crit) => (
                      <option key={crit.id} value={crit.id}>
                        {crit.name || crit.pileType} (Ra: {crit.safeWorkingLoadT}t, S₁₀ ≤ {crit.targetSet10BlowsCm}cm)
                      </option>
                    ))}
                    <option value="">-- ไม่ระบุสเปก (Unassigned) --</option>
                  </select>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    ยังไม่มีรายการคำนวณในโครงการ
                  </p>
                )}
              </div>

              {selectedBulkCriteria && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                  <span className="font-bold text-amber-900 block">สรุปสเปกที่จะนำไปใช้:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div>• หน้าตัด: <strong>{selectedBulkCriteria.name || selectedBulkCriteria.pileType}</strong></div>
                    <div>• Safe Load: <strong>{selectedBulkCriteria.safeWorkingLoadT} ตัน</strong></div>
                    <div>• เกณฑ์ Set: <strong>≤ {selectedBulkCriteria.targetSet10BlowsCm} cm</strong></div>
                    <div>• ตุ้ม / ระยะตก: <strong>{selectedBulkCriteria.hammerWeightT}t / {selectedBulkCriteria.dropHeightCm}cm</strong></div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkCriteriaModal(false)}
                  disabled={isUpdatingBulkCriteria}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBulkCriteria}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isUpdatingBulkCriteria ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังอัปเดต...</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>ยืนยันเปลี่ยนขนาดเข็ม ({selectedPileIds.size} ต้น)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Global Confirm Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={confirmDialog.isDestructive}
        isLoading={isDeletingBulk}
      />
    </div>
  );
}
