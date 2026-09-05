import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import DrivingRecordForm from '@/components/driving/DrivingRecordForm';

export default async function PileDrivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pile = await prisma.pile.findUnique({
    where: { id },
    include: {
      criteria: true,
      drivingRecord: true,
      qcInspection: true,
      project: true,
    },
  });

  if (!pile) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto pb-12">
      <DrivingRecordForm pile={pile} />
    </main>
  );
}
