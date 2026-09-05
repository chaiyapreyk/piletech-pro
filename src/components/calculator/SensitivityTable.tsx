'use client';

import React, { useState } from 'react';
import type { SensitivityMatrix } from '@/lib/calculations/hiley';

interface Props {
  matrix: SensitivityMatrix;
  nominalHeightCm: number;
  nominalCompressionCm: number;
}

export default function SensitivityTable({ matrix, nominalHeightCm, nominalCompressionCm }: Props) {
  const [matrixUnit, setMatrixUnit] = useState<'CM_10_BLOWS' | 'BLOWS_PER_FOOT'>('CM_10_BLOWS');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Hiley Sensitivity Matrix (ตารางวิเคราะห์ความไว)</h3>
          <p className="text-xs text-slate-500">
            แสดงค่าเปรียบเทียบเมื่อระยะตกลูกตุ้ม ($H$) และค่าการยุบตัวชั่วคราว ($C$) หน้างานเปลี่ยนแปลง
          </p>
        </div>

        {/* Unit Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMatrixUnit('CM_10_BLOWS')}
              className={`px-3 py-1.5 rounded transition ${
                matrixUnit === 'CM_10_BLOWS'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Set (cm / 10 blows)
            </button>
            <button
              type="button"
              onClick={() => setMatrixUnit('BLOWS_PER_FOOT')}
              className={`px-3 py-1.5 rounded transition ${
                matrixUnit === 'BLOWS_PER_FOOT'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Equivalent Blows / ft
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-center text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 border border-slate-200 bg-slate-100 font-semibold text-slate-700">
                ระยะตก H \ ค่า C (cm)
              </th>
              {matrix.compressions.map((c) => (
                <th
                  key={c}
                  className={`p-2.5 border border-slate-200 font-semibold ${
                    c === nominalCompressionCm ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  C = {c.toFixed(2)} cm
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.dropHeights.map((h, rowIdx) => (
              <tr key={h} className="hover:bg-slate-50">
                <td
                  className={`p-2 border border-slate-200 font-semibold ${
                    h === nominalHeightCm ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  H = {h} cm
                </td>
                {matrix.grid[rowIdx].map((val, colIdx) => {
                  const isNominal = h === nominalHeightCm && matrix.compressions[colIdx] === nominalCompressionCm;
                  const isUnachievable = val <= 0;
                  const valFt = matrix.gridBlowsPerFoot ? matrix.gridBlowsPerFoot[rowIdx][colIdx] : Math.round(304.8 / val);

                  return (
                    <td
                      key={colIdx}
                      className={`p-2 border border-slate-200 font-mono text-xs ${
                        isNominal
                          ? 'bg-amber-200 text-slate-900 font-extrabold ring-2 ring-amber-400 ring-inset'
                          : isUnachievable
                          ? 'bg-rose-50 text-rose-600 font-medium'
                          : 'text-slate-800'
                      }`}
                    >
                      {isUnachievable
                        ? 'N/A'
                        : matrixUnit === 'CM_10_BLOWS'
                        ? `${val.toFixed(2)} cm`
                        : `${valFt} blw/ft`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3">
        <span>* Cell สีเหลืองทอง คือค่าจากการคำนวณมาตรฐาน ณ จุดออกแบบ</span>
        <span>
          หน่วยที่แสดง: {matrixUnit === 'CM_10_BLOWS' ? 'เซนติเมตรต่อการตอก 10 ครั้ง' : 'จำนวนครั้งการตอกต่อ 1 ฟุต (blows/ft)'}
        </span>
      </div>
    </div>
  );
}
