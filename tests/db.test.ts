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

  it('can batch generate pile records without duplicates', async () => {
    const project = await prisma.project.findFirst();
    if (!project) throw new Error('No project found');

    const prefix = 'BATCH-TEST-';
    const batchPiles = [
      { projectId: project.id, pileNo: `${prefix}01`, gridLine: 'A-1', status: 'PLANNED' },
      { projectId: project.id, pileNo: `${prefix}02`, gridLine: 'A-2', status: 'PLANNED' },
      { projectId: project.id, pileNo: `${prefix}03`, gridLine: 'A-3', status: 'PLANNED' },
    ];

    await prisma.pile.createMany({
      data: batchPiles,
    });

    const count = await prisma.pile.count({
      where: {
        projectId: project.id,
        pileNo: { startsWith: prefix },
      },
    });

    expect(count).toBe(3);

    // Clean up test batch
    await prisma.pile.deleteMany({
      where: {
        projectId: project.id,
        pileNo: { startsWith: prefix },
      },
    });
  });

  it('can update existing pile details and building tag', async () => {
    const project = await prisma.project.findFirst();
    if (!project) throw new Error('No project found');

    const pile = await prisma.pile.create({
      data: {
        projectId: project.id,
        pileNo: 'P-EDIT-TEST',
        gridLine: 'X-1',
        building: 'Building A',
        status: 'PLANNED',
      },
    });

    // Update pile
    const updated = await prisma.pile.update({
      where: { id: pile.id },
      data: {
        pileNo: 'P-EDIT-MODIFIED',
        gridLine: 'X-9',
        building: 'Building B',
        status: 'DRIVING',
      },
    });

    expect(updated.pileNo).toBe('P-EDIT-MODIFIED');
    expect(updated.gridLine).toBe('X-9');
    expect(updated.building).toBe('Building B');
    expect(updated.status).toBe('DRIVING');

    // Clean up
    await prisma.pile.delete({ where: { id: pile.id } });
  });

  it('can bulk delete piles by IDs or all pending', async () => {
    const project = await prisma.project.findFirst();
    if (!project) throw new Error('No project found');

    const prefix = 'BULK-DEL-';
    await prisma.pile.createMany({
      data: [
        { projectId: project.id, pileNo: `${prefix}1`, gridLine: 'G-1', status: 'PLANNED' },
        { projectId: project.id, pileNo: `${prefix}2`, gridLine: 'G-2', status: 'PLANNED' },
        { projectId: project.id, pileNo: `${prefix}3`, gridLine: 'G-3', status: 'PLANNED' },
      ],
    });

    // Bulk delete selected
    const delRes = await prisma.pile.deleteMany({
      where: {
        projectId: project.id,
        pileNo: { in: [`${prefix}1`, `${prefix}2`] },
      },
    });
    expect(delRes.count).toBe(2);

    const remaining = await prisma.pile.findFirst({
      where: { pileNo: `${prefix}3` },
    });
    expect(remaining).not.toBeNull();

    // Clean up remaining
    await prisma.pile.deleteMany({
      where: { pileNo: { startsWith: prefix } },
    });
  });

  it('records penetration in Blows/ft with configurable window scope (e.g. last 20 ft)', async () => {
    const project = await prisma.project.findFirst();
    if (!project) throw new Error('No project found');

    const testPile = await prisma.pile.create({
      data: {
        projectId: project.id,
        pileNo: 'P-BLOW-FT-TEST',
        gridLine: 'FT-1',
        building: 'Building C',
        status: 'PLANNED',
      },
    });

    // Create driving record with Blows/ft and 20 ft window
    const ftBlows = [18, 22, 25, 30, 35, 40, 45, 52];
    const record = await prisma.drivingRecord.create({
      data: {
        pileId: testPile.id,
        penetrationBlows: JSON.stringify(ftBlows),
        recordUnit: 'FEET',
        recordScope: 'WINDOW',
        windowLengthFt: 20,
        measuredLast10Cm: 2.1,
        drivenLengthM: Number((ftBlows.length * 0.3048).toFixed(2)),
        isSetPassed: true,
      },
    });

    expect(record.recordUnit).toBe('FEET');
    expect(record.recordScope).toBe('WINDOW');
    expect(record.windowLengthFt).toBe(20);
    expect(record.isSetPassed).toBe(true);

    const retrieved = await prisma.drivingRecord.findUnique({
      where: { pileId: testPile.id },
    });
    expect(retrieved?.recordUnit).toBe('FEET');
    expect(retrieved?.windowLengthFt).toBe(20);

    // Clean up
    await prisma.pile.delete({ where: { id: testPile.id } });
  });

  it('can create and query a new project / building with criteria defaults', async () => {
    const code = `TEST-PROJ-${Date.now()}`;
    const newProj = await prisma.project.create({
      data: {
        name: 'Building B Extension',
        code,
        location: 'Bangna KM 12',
        settings: {
          create: {
            defaultSafetyFactor: 2.5,
          },
        },
        criteria: {
          create: [
            {
              pileType: 'I-Section 0.26m',
              safeWorkingLoadT: 35.0,
              safetyFactor: 2.5,
              hammerWeightT: 3.5,
              dropHeightCm: 40.0,
              cushionCoeffE: 0.25,
              tempCompressionC: 1.2,
              targetSet10BlowsCm: 2.2,
            },
          ],
        },
      },
      include: {
        criteria: true,
        settings: true,
      },
    });

    expect(newProj.id).toBeDefined();
    expect(newProj.name).toBe('Building B Extension');
    expect(newProj.criteria.length).toBe(1);
    expect(newProj.criteria[0].safeWorkingLoadT).toBe(35.0);

    // Clean up
    await prisma.project.delete({ where: { id: newProj.id } });
  });
});
