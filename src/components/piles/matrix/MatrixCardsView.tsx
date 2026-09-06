'use client';

import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { PileData, getPileStatusStyle } from './matrixTypes';

interface MatrixCardsViewProps {
  filteredPiles: PileData[];
  isBulkMode: boolean;
  selectedPileIds: Set<string>;
  toggleSelectPile: (id: string, e: React.MouseEvent) => void;
  setSelectedPile: (pile: PileData) => void;
}

export default function MatrixCardsView({
  filteredPiles,
  isBulkMode,
  selectedPileIds,
  toggleSelectPile,
  setSelectedPile,
}: MatrixCardsViewProps) {
  return (
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
  );
}
