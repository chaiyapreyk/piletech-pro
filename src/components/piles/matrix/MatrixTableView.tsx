'use client';

import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { PileData, getPileStatusStyle } from './matrixTypes';

interface MatrixTableViewProps {
  rowsOf10: { rowLabel: string; items: (PileData | null)[] }[];
  isBulkMode: boolean;
  selectedPileIds: Set<string>;
  toggleSelectPile: (id: string, e: React.MouseEvent) => void;
  setSelectedPile: (pile: PileData) => void;
}

export default function MatrixTableView({
  rowsOf10,
  isBulkMode,
  selectedPileIds,
  toggleSelectPile,
  setSelectedPile,
}: MatrixTableViewProps) {
  return (
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
  );
}
