import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import QCInspectionForm from '@/components/qc/QCInspectionForm';

export default async function PileQCPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pile = await prisma.pile.findUnique({
    where: { id },
    include: {
      criteria: true,
      qcInspection: true,
    },
  });

  if (!pile) {
    notFound();
  }

  return (
    <main>
      <QCInspectionForm pile={pile} />
    </main>
  );
}
