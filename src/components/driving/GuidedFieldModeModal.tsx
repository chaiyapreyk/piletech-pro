'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Edit3,
  FastForward,
  Save,
  X,
} from 'lucide-react';
import {
  appendDrivingInterval,
  updateDrivingInterval,
} from '@/lib/drivingIntervals';

type BlowValue = number | null;

interface GuidedFieldModeModalProps {
  isOpen: boolean;
  pileLabel: string;
  blowCounts: BlowValue[];
  onChange: (counts: BlowValue[]) => void;
  recordUnit: 'METER' | 'FEET';
  recordScope: 'FULL' | 'WINDOW';
  windowLength: number;
  onSaveDraft: () => void | Promise<void>;
  isDraftSaving?: boolean;
  onClose: () => void;
}

export default function GuidedFieldModeModal({
  isOpen,
  pileLabel,
  blowCounts,
  onChange,
  recordUnit,
  recordScope,
  windowLength,
  onSaveDraft,
  isDraftSaving = false,
  onClose,
}: GuidedFieldModeModalProps) {
  const [view, setView] = useState<'CAPTURE' | 'REVIEW'>('CAPTURE');
  const [captureValue, setCaptureValue] = useState('20');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('20');

  useEffect(() => {
    if (!isOpen) return;
    setView('CAPTURE');
    setEditIndex(null);
  }, [isOpen]);

  const recordedCount = blowCounts.filter((value) => typeof value === 'number').length;
  const skippedCount = blowCounts.filter((value) => value === null).length;
  const targetCount = recordScope === 'WINDOW' ? windowLength : null;
  const currentInterval = blowCounts.length + 1;
  const progress = targetCount === null ? 0 : Math.min(100, Math.round((blowCounts.length / targetCount) * 100));
  const unitLabel = recordUnit === 'FEET' ? 'blows/ft' : 'blows/m';
  const isComplete = targetCount !== null && blowCounts.length >= targetCount;

  const quickValues = useMemo(() => {
    const last = [...blowCounts].reverse().find((value): value is number => typeof value === 'number') ?? 20;
    return [Math.max(1, last - 5), last, last + 5];
  }, [blowCounts]);

  if (!isOpen) return null;

  const addInterval = (value: BlowValue) => {
    const next = appendDrivingInterval(blowCounts, value);
    if (next === blowCounts) return;
    onChange(next);
    setCaptureValue(String(value ?? 20));
  };

  const saveCapture = () => addInterval(Number(captureValue));
  const skipCapture = () => addInterval(null);

  const openEdit = (index: number) => {
    setEditIndex(index);
    setEditValue(String(blowCounts[index] ?? 20));
    setView('REVIEW');
  };

  const saveEdit = (value: BlowValue) => {
    if (editIndex === null) return;
    if (value !== null && (!Number.isFinite(value) || value <= 0)) return;
    onChange(updateDrivingInterval(blowCounts, editIndex, value));
    setEditIndex(null);
    setView('REVIEW');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Guided Field Mode"
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
        event.preventDefault();
        if (view === 'CAPTURE') saveCapture();
        else if (editIndex !== null) saveEdit(Number(editValue));
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-slate-50 shadow-2xl sm:min-h-0 sm:rounded-2xl">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:rounded-t-2xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Guided Field Mode</p>
              <h2 className="truncate text-lg font-black text-slate-900">{pileLabel}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close Field Mode">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-full bg-slate-100 p-1">
            <button type="button" onClick={() => setView('CAPTURE')} className={`flex-1 rounded-full px-3 py-2 text-xs font-black ${view === 'CAPTURE' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600'}`}>
              Capture
            </button>
            <button type="button" onClick={() => setView('REVIEW')} className={`flex-1 rounded-full px-3 py-2 text-xs font-black ${view === 'REVIEW' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600'}`}>
              Review ({blowCounts.length})
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-4 overflow-x-hidden p-4 sm:p-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-500">Progress</p>
                <p className="text-2xl font-black text-slate-900">{blowCounts.length} <span className="text-sm font-bold text-slate-500">{targetCount === null ? 'intervals recorded' : `/ ${targetCount} intervals`}</span></p>
              </div>
              <div className="text-right text-xs font-bold text-slate-500">
                <p className="text-emerald-700">Recorded {recordedCount}</p>
                <p className="text-amber-700">Skipped {skippedCount}</p>
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </section>

          {view === 'CAPTURE' ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">Current interval</p>
              <p className="mt-1 text-6xl font-black tabular-nums text-slate-950 sm:text-8xl">{isComplete ? 'Done' : currentInterval}</p>
              <p className="mt-1 text-xs font-bold text-slate-600">{unitLabel}</p>

              <div className="mx-auto mt-6 max-w-xs">
                <label className="sr-only" htmlFor="guided-blow-count">Blow count</label>
                <input id="guided-blow-count" inputMode="numeric" type="number" min="1" max="200" value={captureValue} onChange={(event) => setCaptureValue(event.target.value)} className="w-full rounded-2xl border-2 border-amber-300 bg-white px-4 py-4 text-center text-4xl font-black tabular-nums text-slate-950 outline-none focus:border-amber-500" />
              </div>

              <div className="mt-3 flex justify-center gap-2">
                {quickValues.map((value, index) => (
                  <button key={`${value}-${index}`} type="button" onClick={() => setCaptureValue(String(value))} className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 hover:bg-amber-100">{value}</button>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={skipCapture} disabled={isComplete} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-3 text-sm font-black text-slate-700 disabled:opacity-40">
                  <FastForward className="h-5 w-5" /> Skip
                </button>
                <button type="button" onClick={saveCapture} disabled={isComplete} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 text-sm font-black text-white shadow-md disabled:opacity-40">
                  <Check className="h-5 w-5" /> Save & Next
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Recorded intervals</h3>
                  <p className="text-xs text-slate-500">Tap an interval to quick edit or correct a skip.</p>
                </div>
                <ClipboardCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {blowCounts.map((value, index) => (
                  <button key={`${index}-${value}`} type="button" onClick={() => openEdit(index)} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-amber-400 hover:bg-amber-50">
                    <span><span className="block text-[10px] font-bold text-slate-500">Interval {index + 1}</span><span className={`text-lg font-black tabular-nums ${value === null ? 'text-amber-700' : 'text-slate-900'}`}>{value === null ? 'Skipped' : value}</span></span>
                    <Edit3 className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
              {editIndex !== null && (
                <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-black text-amber-900">Quick edit interval {editIndex + 1}</p>
                  <input inputMode="numeric" type="number" min="1" max="200" value={editValue} onChange={(event) => setEditValue(event.target.value)} className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-3 text-2xl font-black tabular-nums outline-none" />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => saveEdit(null)} className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-black text-slate-700">Mark Skip</button>
                    <button type="button" onClick={() => setEditIndex(null)} className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-black text-slate-700">Cancel</button>
                    <button type="button" onClick={() => saveEdit(Number(editValue))} className="rounded-xl bg-emerald-600 px-2 py-2 text-xs font-black text-white">Save</button>
                  </div>
                </div>
              )}
              {blowCounts.length === 0 && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No intervals recorded yet.</p>}
            </section>
          )}
        </main>

        <footer className="sticky bottom-0 border-t border-slate-200 bg-white p-4 sm:rounded-b-2xl sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-between">
            <button type="button" onClick={onClose} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-xs font-black text-slate-700 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Full Form
            </button>
            <button type="button" onClick={() => void onSaveDraft()} disabled={isDraftSaving} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-xs font-black text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {isDraftSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
          {view === 'CAPTURE' && isComplete && <p className="mt-2 text-center text-xs font-bold text-emerald-700">Window complete. Review intervals or continue to the full form.</p>}
          <button type="button" onClick={() => setView(view === 'CAPTURE' ? 'REVIEW' : 'CAPTURE')} className="mx-auto mt-3 flex items-center gap-1 text-[11px] font-bold text-slate-500">
            {view === 'CAPTURE' ? <>Open review <ChevronDown className="h-3.5 w-3.5" /></> : <>Back to capture <ChevronUp className="h-3.5 w-3.5" /></>}
          </button>
        </footer>
      </div>
    </div>
  );
}
