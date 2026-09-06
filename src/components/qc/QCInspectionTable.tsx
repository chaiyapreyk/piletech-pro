'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Edit3,
  Building2,
  Layers,
} from 'lucide-react';

export interface QCPileItem {
  id: string;
  pileNo: string;
  gridLine: string;
  building?: string | null;
  status: string;
  criteria?: {
    name?: string | null;
    pileType: string;
    safeWorkingLoadT: number;
    targetSet10BlowsCm: number;
  } | null;
  qcInspection?: {
    id: string;
    plumbnessXPercent: number | null;
    plumbnessYPercent: number | null;
    isPlumbnessPassed: boolean;
    deltaXCm: number | null;
    deltaYCm: number | null;
    netDeviationCm: number | null;
    deviationStatus: string;
    jointWeldStatus: string;
    headDamageStatus: string;
    inspectorName: string | null;
    approvedByCM: boolean;
  } | null;
}

interface QCInspectionTableProps {
  piles: QCPileItem[];
}

export default function QCInspectionTable({ piles }: QCInspectionTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'NORMAL' | 'PENDING'>('ALL');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');

  // Building list
  const buildingList = useMemo(() => {
    const set = new Set<string>();
    piles.forEach((p) => {
      if (p.building) set.add(p.building);
    });
    return Array.from(set);
  }, [piles]);

  const filteredPiles = useMemo(() => {
    return piles.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.pileNo.toLowerCase().includes(q) ||
        p.gridLine.toLowerCase().includes(q) ||
        (p.qcInspection?.inspectorName || '').toLowerCase().includes(q) ||
        (p.criteria?.pileType || '').toLowerCase().includes(q);

      const matchesBuilding =
        buildingFilter === 'ALL' || p.building === buildingFilter;

      const qc = p.qcInspection;
      let matchesStatus = true;
      if (statusFilter === 'PENDING') {
        matchesStatus = qc === null || qc === undefined;
      } else if (statusFilter === 'NORMAL') {
        matchesStatus = qc !== null && qc !== undefined && qc.deviationStatus === 'NORMAL' && qc.isPlumbnessPassed;
      } else if (statusFilter === 'WARNING') {
        matchesStatus = qc !== null && qc !== undefined && qc.deviationStatus === 'WARNING';
      } else if (statusFilter === 'CRITICAL') {
        matchesStatus =
          qc !== null && qc !== undefined && (qc.deviationStatus === 'CRITICAL' || !qc.isPlumbnessPassed);
      }

      return matchesSearch && matchesBuilding && matchesStatus;
    });
  }, [piles, search, buildingFilter, statusFilter]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Control Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหารหัสเสาเข็ม, Grid Line, ผู้ตรวจสอบ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({piles.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('NORMAL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'NORMAL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            🟢 ผ่านเกณฑ์
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('WARNING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'WARNING'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            🟡 เฝ้าระวัง
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            🔴 วิกฤต
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'PENDING'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚪ รอตรวจ
          </button>

          {buildingList.length > 0 && (
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">🏢 ทุกอาคาร</option>
              {buildingList.map((b) => (
                <option key={b} value={b}>
                  🏢 {b}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {filteredPiles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600 text-sm">ไม่พบรายการเสาเข็มที่ตรงกับเงื่อนไข</p>
            <p className="text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองสถานะ</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="p-3.5 font-bold">รหัสเสาเข็ม</th>
                <th className="p-3.5 font-bold">Grid Line</th>
                <th className="p-3.5 font-bold">อาคาร</th>
                <th className="p-3.5 font-bold text-center">ความเอียงดิ่ง (%)</th>
                <th className="p-3.5 font-bold text-center">&Delta;X / &Delta;Y (cm)</th>
                <th className="p-3.5 font-bold text-center">ระยะหนีศูนย์สุทธิ (&Delta;)</th>
                <th className="p-3.5 font-bold text-center">สถานะหนีศูนย์</th>
                <th className="p-3.5 font-bold text-center">สภาพรอยต่อ</th>
                <th className="p-3.5 font-bold text-center">ผู้ตรวจสอบ</th>
                <th className="p-3.5 font-bold text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPiles.map((pile) => {
                const qc = pile.qcInspection;
                const hasQC = qc !== null && qc !== undefined;

                return (
                  <tr key={pile.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold font-mono text-slate-900">
                      {pile.pileNo}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">
                      {pile.gridLine}
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">
                      {pile.building || 'Building A'}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {hasQC && qc.plumbnessXPercent !== null ? (
                        <span
                          className={`font-semibold ${
                            qc.isPlumbnessPassed ? 'text-slate-800' : 'text-rose-600 font-bold'
                          }`}
                        >
                          X:{qc.plumbnessXPercent}% Y:{qc.plumbnessYPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-600">
                      {hasQC && qc.deltaXCm !== null ? (
                        <span>
                          {qc.deltaXCm} / {qc.deltaYCm}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {hasQC && qc.netDeviationCm !== null ? (
                        <strong className="text-slate-900 text-xs">
                          {qc.netDeviationCm} cm
                        </strong>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {hasQC ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            qc.deviationStatus === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : qc.deviationStatus === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {qc.deviationStatus === 'NORMAL'
                            ? '🟢 ปกติ'
                            : qc.deviationStatus === 'WARNING'
                            ? '🟡 เฝ้าระวัง'
                            : '🔴 วิกฤต'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] font-medium">
                          <Clock className="w-3 h-3" /> รอตรวจ
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {hasQC ? (
                        <span className="text-[11px] font-medium text-slate-600">
                          {qc.jointWeldStatus === 'PASS'
                            ? '🟢 สมบูรณ์'
                            : qc.jointWeldStatus === 'FAIL'
                            ? '🔴 ไม่ผ่าน'
                            : '⚪ N/A'}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center text-[11px] text-slate-600">
                      {hasQC && qc.inspectorName ? qc.inspectorName : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/piles/${pile.id}/qc`}
                        className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-[11px] font-bold transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{hasQC ? 'แก้ไขผล QC' : 'ตรวจ As-built'}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
