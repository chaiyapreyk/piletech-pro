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

  it('safely deletes a pile and cascade deletes its driving and qc records', async () => {
    const project = await prisma.project.findFirst();
    if (!project) throw new Error('No project found');

    // Create a temporary test pile
    const tempPile = await prisma.pile.create({
      data: {
        projectId: project.id,
        pileNo: 'TEST-TEMP-DELETE',
        gridLine: 'T-99',
        status: 'COMPLETED',
        drivingRecord: {
          create: {
            penetrationBlows: JSON.stringify([10, 20]),
            measuredLast10Cm: 2.0,
            drivenLengthM: 12.0,
            isSetPassed: true,
          },
        },
        qcInspection: {
          create: {
            netDeviationCm: 1.5,
            deviationStatus: 'NORMAL',
          },
        },
      },
    });

    expect(tempPile.id).toBeDefined();

    // Verify relations were created
    const createdRecord = await prisma.drivingRecord.findUnique({
      where: { pileId: tempPile.id },
    });
    const createdQC = await prisma.qCInspection.findUnique({
      where: { pileId: tempPile.id },
    });
    expect(createdRecord).not.toBeNull();
    expect(createdQC).not.toBeNull();

    // Delete the pile
    await prisma.pile.delete({
      where: { id: tempPile.id },
    });

    // Verify pile is gone
    const deletedPile = await prisma.pile.findUnique({
      where: { id: tempPile.id },
    });
    expect(deletedPile).toBeNull();

    // Verify cascade delete cleaned up driving and qc records
    const orphanRecord = await prisma.drivingRecord.findUnique({
      where: { pileId: tempPile.id },
    });
    const orphanQC = await prisma.qCInspection.findUnique({
      where: { pileId: tempPile.id },
    });
    expect(orphanRecord).toBeNull();
    expect(orphanQC).toBeNull();
  });
});
