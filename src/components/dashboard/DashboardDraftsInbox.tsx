'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardEdit, Clock3, Grid3X3, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  getBrowserDraftStorage,
  listDrivingDrafts,
  removeDrivingDraft,
  type DraftIndexItem,
} from '@/lib/drivingDrafts';

export default function DashboardDraftsInbox({ projectId }: { projectId: string | null }) {
  const [drafts, setDrafts] = useState<DraftIndexItem[]>([]);
  const [discardTarget, setDiscardTarget] = useState<DraftIndexItem | null>(null);

  const refreshDrafts = useCallback(() => {
    const storage = getBrowserDraftStorage();
    setDrafts(projectId && storage ? listDrivingDrafts(storage, projectId) : []);
  }, [projectId]);

  useEffect(() => {
    refreshDrafts();
    window.addEventListener('storage', refreshDrafts);
    return () => window.removeEventListener('storage', refreshDrafts);
  }, [refreshDrafts]);

  const discardDraft = () => {
    if (!discardTarget) return;
    const storage = getBrowserDraftStorage();
    if (storage) removeDrivingDraft(storage, discardTarget);
    setDiscardTarget(null);
    refreshDrafts();
  };

  if (!projectId) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Drafts Inbox</p>
          <h2 className="text-lg font-black text-slate-900">Continue field work</h2>
          <p className="text-xs text-slate-600">Drafts are stored on this browser and belong to the active project.</p>
        </div>
        <ClipboardEdit className="h-6 w-6 text-amber-600" />
      </div>

      {drafts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-white/70 p-5 text-center text-sm text-slate-500">No saved Driving Record Drafts for this project.</p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {drafts.map((draft) => {
            const progressTarget = draft.recordScope === 'WINDOW' ? draft.windowLength : Math.max(draft.intervalCount, 1);
            const progress = Math.min(100, Math.round((draft.intervalCount / progressTarget) * 100));
            return (
              <article key={`${draft.projectId}-${draft.pileId}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-900">Pile {draft.pileNo}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-600"><Grid3X3 className="h-3.5 w-3.5" /> {draft.gridLine}{draft.building ? ` · ${draft.building}` : ''}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">{draft.recordUnit === 'FEET' ? 'blows/ft' : 'blows/m'}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span><Clock3 className="mr-1 inline h-3.5 w-3.5" />{new Date(draft.savedAt).toLocaleString()}</span>
                  <span>{draft.recordedCount} recorded · {draft.skippedCount} skipped</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${progress}%` }} /></div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setDiscardTarget(draft)} className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /> Discard</button>
                  <Link href={`/piles/${draft.pileId}/drive`} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-700">Continue</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(discardTarget)}
        onClose={() => setDiscardTarget(null)}
        onConfirm={discardDraft}
        title="Discard Draft?"
        message={discardTarget ? `Remove the saved Draft for pile ${discardTarget.pileNo}?` : ''}
        confirmText="Discard"
        isDestructive
      />
    </section>
  );
}
