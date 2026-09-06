import HileyCalculator from '@/components/calculator/HileyCalculator';
import { getActiveProject } from '@/lib/activeProject';

export const dynamic = 'force-dynamic';

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams?: Promise<{ criteriaId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialCriteriaId = resolvedParams?.criteriaId ?? null;

  const project = await getActiveProject({
    criteria: {
      include: {
        _count: { select: { piles: true } },
      },
      orderBy: { createdAt: 'asc' },
    },
  });

  return (
    <main>
      <HileyCalculator
        initialProject={project ? JSON.parse(JSON.stringify(project)) : null}
        initialCriteriaId={initialCriteriaId}
      />
    </main>
  );
}
