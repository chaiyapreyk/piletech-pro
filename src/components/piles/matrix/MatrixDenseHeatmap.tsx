'use client';

import React from 'react';
import { PileData, getPileStatusStyle } from './matrixTypes';

interface MatrixDenseHeatmapProps {
  filteredPiles: PileData[];
  isBulkMode: boolean;
  selectedPileIds: Set<string>;
  toggleSelectPile: (id: string, e: React.MouseEvent) => void;
  setSelectedPile: (pile: PileData) => void;
}

export default function MatrixDenseHeatmap({
  filteredPiles,
  isBulkMode,
  selectedPileIds,
  toggleSelectPile,
  setSelectedPile,
}: MatrixDenseHeatmapProps) {
  return (
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
  );
}
