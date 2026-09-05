'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

interface DeletePileButtonProps {
  pileId: string;
  pileNo: string;
  onDeleted?: () => void;
  className?: string;
}

export default function DeletePileButton({
  pileId,
  pileNo,
  onDeleted,
  className = '',
}: DeletePileButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `⚠️ ยืนยันการลบเสาเข็ม "${pileNo}" หรือไม่?\n\nข้อมูลบันทึกการตอก (Driving Record) และผลตรวจสอบ QC ทั้งหมดของเสาเข็มต้นนี้จะถูกลบไปด้วยอย่างถาวร`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/piles/${pileId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete pile');
      }

      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการลบ: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      title={`ลบเสาเข็ม ${pileNo}`}
      className={`inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 px-2 py-1.5 rounded-md text-[11px] font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isDeleting ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Trash2 className="w-3 h-3" />
      )}
      <span>{isDeleting ? 'กำลังลบ...' : 'ลบ'}</span>
    </button>
  );
}
