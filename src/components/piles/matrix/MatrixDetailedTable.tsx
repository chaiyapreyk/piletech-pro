'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  HardHat,
  ShieldCheck,
  Edit3,
  CheckSquare,
  Square,
  Eye,
} from 'lucide-react';
import { PileData } from './matrixTypes';
import { calculateAverageBlows } from '@/lib/calculations/drivingLog';
import DeletePileButton from '../DeletePileButton';

interface MatrixDetailedTableProps {
  filteredPiles: PileData[];
  isBulkMode: boolean;
  selectedPileIds: Set<string>;
  toggleSelectPile: (id: string, e: React.MouseEvent) => void;
  handleSelectAllFiltered: () => void;
  handleDeselectAll: () => void;
  setSelectedPile: (pile: PileData) => void;
  handleOpenEdit: (pile: PileData) => void;
  onPileDeleted: (pileId: string) => void;
}

export default function MatrixDetailedTable({
  filteredPiles,
  isBulkMode,
  selectedPileIds,
  toggleSelectPile,
  handleSelectAllFiltered,
  handleDeselectAll,
  setSelectedPile,
  handleOpenEdit,
  onPileDeleted,
}: MatrixDetailedTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              {isBulkMode && (
                <th className="p-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={
                      selectedPileIds.size === filteredPiles.length
                        ? handleDeselectAll
                        : handleSelectAllFiltered
                    }
                    className="p-1 text-slate-500 hover:text-slate-800"
                    title="เลือกทั้งหมด / ยกเลิกทั้งหมด"
                  >
                    {selectedPileIds.size > 0 && selectedPileIds.size === filteredPiles.length ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
              )}
              <th className="p-3.5 font-bold">รหัสเสาเข็ม (Pile No.)</th>
              <th className="p-3.5 font-bold">Grid Line</th>
              <th className="p-3.5 font-bold">อาคาร / โซน</th>
              <th className="p-3.5 font-bold">ประเภทเสาเข็ม / สเปก</th>
              <th className="p-3.5 font-bold text-center">ความลึก (Depth)</th>
              <th className="p-3.5 font-bold text-center">อัตรา Blows (ft / m)</th>
              <th className="p-3.5 font-bold text-center">สถานะการตอก</th>
              <th className="p-3.5 font-bold text-center">Last 10 Blows</th>
              <th className="p-3.5 font-bold text-center">QA/QC As-Built</th>
              <th className="p-3.5 font-bold text-right">ดำเนินการ (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPiles.map((pile) => {
              const isDriven = pile.drivingRecord !== null && pile.drivingRecord !== undefined;
              const isSetPassed = pile.drivingRecord?.isSetPassed;
              const qcStatus = pile.qcInspection?.deviationStatus;
              const drivenM = pile.drivingRecord?.drivenLengthM;
              const drivenFt = drivenM ? (drivenM * 3.28084).toFixed(1) : null;
              const recordUnit =
                pile.drivingRecord?.recordUnit?.toUpperCase() === 'METER' ? 'METER' : 'FEET';
              const isSelected = selectedPileIds.has(pile.id);

              const { avgBlowsFt, avgBlowsM } = calculateAverageBlows(
                pile.drivingRecord?.penetrationBlows,
                pile.drivingRecord?.recordUnit
              );

              return (
                <tr
                  key={pile.id}
                  onClick={() => {
                    if (isBulkMode) {
                      toggleSelectPile(pile.id, {} as any);
                    }
                  }}
                  className={`transition ${
                    isSelected ? 'bg-amber-50/70 hover:bg-amber-100/60' : 'hover:bg-slate-50'
                  } ${isBulkMode ? 'cursor-pointer' : ''}`}
                >
                  {isBulkMode && (
                    <td className="p-3 text-center">
                      <span className="inline-flex">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </span>
                    </td>
                  )}
                  <td className="p-3.5 font-bold font-mono text-slate-900">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPile(pile);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold text-left"
                    >
                      {pile.pileNo}
                    </button>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-700">{pile.gridLine}</td>
                  <td className="p-3.5 text-slate-500 font-medium">
                    {pile.building || 'Building A'}
                  </td>
                  <td className="p-3.5 text-slate-600 text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-800">
                        {pile.criteria?.name || pile.criteria?.pileType || 'ไม่ได้ระบุ'}
                      </span>
                      {pile.criteria && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[10px] text-amber-800 font-mono bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-medium">
                            Ra: {pile.criteria.safeWorkingLoadT}t | S₁₀ &le;{' '}
                            {pile.criteria.targetSet10BlowsCm} cm
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {drivenM ? (
                      <div>
                        {recordUnit === 'FEET' && drivenFt ? (
                          <>
                            <span className="font-bold text-slate-800">{drivenFt} ft</span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({drivenM} m)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-slate-800">{drivenM} m</span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({drivenFt} ft)
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {(avgBlowsFt !== null && avgBlowsFt > 0) ||
                    (avgBlowsM !== null && avgBlowsM > 0) ? (
                      <div className="text-[11px]">
                        {recordUnit === 'FEET' ? (
                          <>
                            <span className="font-bold text-amber-700">{avgBlowsFt} blw/ft</span>
                            <span className="text-[10px] text-slate-500 block font-semibold">
                              (≈ {avgBlowsM} blw/m)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-amber-700">{avgBlowsM} blw/m</span>
                            <span className="text-[10px] text-slate-500 block font-semibold">
                              (≈ {avgBlowsFt} blw/ft)
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {!isDriven ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        <Clock className="w-3 h-3" /> รอการตอก
                      </span>
                    ) : isSetPassed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> ตอกเสร็จ (Set ผ่าน)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3 h-3" /> Set ไม่ได้ (Re-drive)
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {pile.drivingRecord ? (
                      <span className="font-bold text-slate-800">
                        {pile.drivingRecord.measuredLast10Cm} cm
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {pile.qcInspection ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          qcStatus === 'NORMAL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : qcStatus === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {qcStatus === 'NORMAL'
                          ? `Pass (${pile.qcInspection.netDeviationCm}cm)`
                          : qcStatus === 'WARNING'
                          ? `Warning (${pile.qcInspection.netDeviationCm}cm)`
                          : `Critical (${pile.qcInspection.netDeviationCm}cm)`}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">ยังไม่ตรวจ</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPile(pile);
                      }}
                      className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-md text-[11px] font-bold shadow-xs cursor-pointer"
                      title="ดูข้อมูลและกราฟการตอก (View Data & Load Profile)"
                    >
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>ดูข้อมูล</span>
                    </button>
                    <Link
                      href={`/piles/${pile.id}/drive`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1.5 rounded-md text-[11px] font-bold shadow-xs"
                    >
                      <HardHat className="w-3 h-3" />
                      <span>{isDriven ? 'แก้ไขตอก' : 'บันทึกตอก'}</span>
                    </Link>
                    <Link
                      href={`/piles/${pile.id}/qc`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md text-[11px] font-bold"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>ตรวจ QC</span>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(pile);
                      }}
                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md text-[11px] font-bold"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>แก้ไข</span>
                    </button>
                    <DeletePileButton
                      pileId={pile.id}
                      pileNo={pile.pileNo}
                      onDeleted={() => onPileDeleted(pile.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
