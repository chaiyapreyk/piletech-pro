'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, HardHat, ShieldCheck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import DeletePileButton from '@/components/piles/DeletePileButton';

interface PileItem {
  id: string;
  pileNo: string;
  gridLine: string;
  status: string;
  criteria?: {
    pileType: string;
    safeWorkingLoadT: number;
    targetSet10BlowsCm: number;
  } | null;
  drivingRecord?: {
    penetrationBlows?: string | null;
    measuredLast10Cm: number;
    drivenLengthM: number;
    isSetPassed: boolean;
  } | null;
  qcInspection?: {
    netDeviationCm: number | null;
    deviationStatus: string;
    isPlumbnessPassed: boolean;
  } | null;
}

export default function PileTableGrid({ piles }: { piles: PileItem[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [qcFilter, setQcFilter] = useState('ALL');

  const filteredPiles = useMemo(() => {
    return piles.filter((p) => {
      const matchesSearch =
        p.pileNo.toLowerCase().includes(search.toLowerCase()) ||
        p.gridLine.toLowerCase().includes(search.toLowerCase()) ||
        (p.criteria?.pileType || '').toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'COMPLETED' && p.status === 'COMPLETED') ||
        (statusFilter === 'ISSUE' && p.status === 'ISSUE') ||
        (statusFilter === 'PLANNED' && p.status === 'PLANNED');

      const matchesQC =
        qcFilter === 'ALL' ||
        (qcFilter === 'NORMAL' && p.qcInspection?.deviationStatus === 'NORMAL') ||
        (qcFilter === 'WARNING' && p.qcInspection?.deviationStatus === 'WARNING') ||
        (qcFilter === 'CRITICAL' && p.qcInspection?.deviationStatus === 'CRITICAL');

      return matchesSearch && matchesStatus && matchesQC;
    });
  }, [piles, search, statusFilter, qcFilter]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Control Bar: Search & Filter */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหารหัสเสาเข็ม, Grid Line (เช่น P-001, A-1)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">สถานะตอก: ทั้งหมด</option>
            <option value="COMPLETED">🟢 ตอกเสร็จ (Set ผ่าน)</option>
            <option value="ISSUE">🔴 พบปัญหา (Re-drive)</option>
            <option value="PLANNED">⚪ รอเข้าตอก</option>
          </select>

          {/* QC Filter */}
          <select
            value={qcFilter}
            onChange={(e) => setQcFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">สถานะ QC: ทั้งหมด</option>
            <option value="NORMAL">🟢 QC ปกติ (&le;5cm)</option>
            <option value="WARNING">🟡 QC Warning (5-10cm)</option>
            <option value="CRITICAL">🔴 QC Critical (&gt;10cm)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="p-3.5 font-bold">Pile No.</th>
              <th className="p-3.5 font-bold">Grid Line</th>
              <th className="p-3.5 font-bold">สเปกเสาเข็ม / Safe Load</th>
              <th className="p-3.5 font-bold text-center">ความลึก (Depth)</th>
              <th className="p-3.5 font-bold text-center">อัตรา Blows</th>
              <th className="p-3.5 font-bold text-center">Last 10 Blows</th>
              <th className="p-3.5 font-bold text-center">สถานะการตอก</th>
              <th className="p-3.5 font-bold text-center">การหนีศูนย์ (&Delta;)</th>
              <th className="p-3.5 font-bold text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPiles.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  ไม่พบรายการเสาเข็มตามเงื่อนไขที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredPiles.map((pile) => {
                const isDriven = pile.drivingRecord !== null;
                const isSetPassed = pile.drivingRecord?.isSetPassed;
                const targetSet = pile.criteria?.targetSet10BlowsCm ?? 7.0;
                const measuredSet = pile.drivingRecord?.measuredLast10Cm;
                const qcStatus = pile.qcInspection?.deviationStatus;
                const drivenM = pile.drivingRecord?.drivenLengthM;
                const drivenFt = drivenM ? (drivenM * 3.28084).toFixed(1) : null;

                let avgBlowsM = 0;
                let avgBlowsFt = 0;
                if (pile.drivingRecord?.penetrationBlows) {
                  try {
                    const arr: number[] = JSON.parse(pile.drivingRecord.penetrationBlows);
                    if (arr.length > 0) {
                      avgBlowsM = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
                      avgBlowsFt = Math.round(avgBlowsM / 3.28084);
                    }
                  } catch (e) {}
                }

                return (
                  <tr key={pile.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-black font-mono text-slate-900">
                      {pile.pileNo}
                    </td>
                    <td className="p-3.5 font-bold text-slate-700">
                      {pile.gridLine}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <div className="font-medium text-[11px]">{pile.criteria?.pileType}</div>
                      <div className="text-[10px] text-slate-400">
                        Ra = {pile.criteria?.safeWorkingLoadT} ตัน (Target: &le;{targetSet} cm)
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-medium">
                      {drivenM ? (
                        <div>
                          <span className="font-bold text-slate-800">{drivenM} m</span>
                          <span className="text-[10px] text-slate-400 block font-normal">({drivenFt} ft)</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {avgBlowsM > 0 ? (
                        <div className="text-[11px]">
                          <span className="font-bold text-amber-700">{avgBlowsM} blw/m</span>
                          <span className="text-[10px] text-slate-500 block font-semibold">({avgBlowsFt} blw/ft)</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {measuredSet !== undefined ? (
                        <span
                          className={`font-bold ${
                            isSetPassed ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {measuredSet} cm
                        </span>
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
                          <CheckCircle2 className="w-3 h-3" /> ได้ Set ผ่าน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" /> Re-drive
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {pile.qcInspection ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            qcStatus === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : qcStatus === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {pile.qcInspection.netDeviationCm} cm ({qcStatus})
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/piles/${pile.id}/drive`}
                        className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1.5 rounded text-[11px] font-bold shadow-xs"
                      >
                        <HardHat className="w-3 h-3" />
                        <span>บันทึกตอก</span>
                      </Link>
                      <Link
                        href={`/piles/${pile.id}/qc`}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded text-[11px] font-bold"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>ตรวจ QC</span>
                      </Link>
                      <DeletePileButton pileId={pile.id} pileNo={pile.pileNo} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
