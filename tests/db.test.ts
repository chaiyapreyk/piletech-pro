import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/db';

describe('Prisma Database & Seeding Verification', () => {
  it('loads the seeded project and settings', async () => {
    const project = await prisma.project.findUnique({
      where: { code: 'GHT-2026' },
      include: {
        settings: true,
        criteria: true,
        piles: {
          include: {
            drivingRecord: true,
            qcInspection: true,
          },
        },
      },
    });

    expect(project).toBeDefined();
    expect(project?.name).toContain('The Grand Horizon');
    expect(project?.settings?.defaultSafetyFactor).toBe(2.5);
    expect(project?.criteria.length).toBeGreaterThanOrEqual(2);
    expect(project?.piles.length).toBeGreaterThanOrEqual(5);

    // Verify pile with driving record
    const p1 = project?.piles.find((p) => p.pileNo === 'P-001');
    expect(p1?.drivingRecord?.isSetPassed).toBe(true);
    expect(p1?.qcInspection?.deviationStatus).toBe('NORMAL');

    // Verify pile with failed set
    const p3 = project?.piles.find((p) => p.pileNo === 'P-003');
    expect(p3?.drivingRecord?.isSetPassed).toBe(false);
  });
});
