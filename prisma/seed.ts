import { PrismaClient } from '@prisma/client';
import { calculateHiley } from '../src/lib/calculations/hiley.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial project and engineering data...');

  // Clean existing data
  await prisma.qCInspection.deleteMany();
  await prisma.drivingRecord.deleteMany();
  await prisma.pile.deleteMany();
  await prisma.drivingCriteria.deleteMany();
  await prisma.projectSettings.deleteMany();
  await prisma.project.deleteMany();

  // Create Project
  const project = await prisma.project.create({
    data: {
      name: 'The Grand Horizon Tower (โครงการ เดอะ แกรนด์ ฮอไรซอน ทาวเวอร์)',
      code: 'GHT-2026',
      location: 'Bangkok, Rama 9',
      clientName: 'Grand Horizon Estate Co., Ltd.',
      consultantName: 'Apex Civil Engineering Consultants',
      contractorName: 'Mega Build Construction Co., Ltd.',
      settings: {
        create: {
          defaultSafetyFactor: 2.5,
          maxPlumbnessPercent: 1.0,
          devNormalThresholdCm: 5.0,
          devCriticalThresholdCm: 10.0,
        },
      },
    },
  });

  // Criteria 1: I-Section 0.26x0.26m
  const c1Calc = calculateHiley({
    safeWorkingLoadTons: 35,
    safetyFactor: 2.5,
    hammerWeightTons: 4.0,
    dropHeightCm: 40,
    pileWeightTons: 1.8,
    restitutionCoeff: 0.25,
    tempCompressionCm: 1.2,
  });

  const criteria1 = await prisma.drivingCriteria.create({
    data: {
      projectId: project.id,
      pileType: 'Prestressed Concrete I-0.26x0.26m',
      safeWorkingLoadT: 35,
      safetyFactor: 2.5,
      hammerWeightT: 4.0,
      dropHeightCm: 40,
      cushionCoeffE: 0.25,
      tempCompressionC: 1.2,
      targetSet10BlowsCm: Number(c1Calc.targetSet10BlowsCm.toFixed(2)),
    },
  });

  // Criteria 2: I-Section 0.30x0.30m
  const c2Calc = calculateHiley({
    safeWorkingLoadTons: 45,
    safetyFactor: 2.5,
    hammerWeightTons: 4.5,
    dropHeightCm: 45,
    pileWeightTons: 2.3,
    restitutionCoeff: 0.25,
    tempCompressionCm: 1.4,
  });

  const criteria2 = await prisma.drivingCriteria.create({
    data: {
      projectId: project.id,
      pileType: 'Prestressed Concrete I-0.30x0.30m',
      safeWorkingLoadT: 45,
      safetyFactor: 2.5,
      hammerWeightT: 4.5,
      dropHeightCm: 45,
      cushionCoeffE: 0.25,
      tempCompressionC: 1.4,
      targetSet10BlowsCm: Number(c2Calc.targetSet10BlowsCm.toFixed(2)),
    },
  });

  // Seed sample piles
  const samplePiles = [
    {
      pileNo: 'P-001',
      gridLine: 'A-1',
      criteriaId: criteria1.id,
      status: 'COMPLETED',
      drivenLength: 21.0,
      blows: [10, 12, 14, 15, 18, 20, 22, 24, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 52, 58, 65],
      measured10: 5.2, // target is ~7.44 -> PASS
      plumbX: 0.4,
      plumbY: 0.5,
      desX: 10.0,
      desY: 10.0,
      actX: 10.02,
      actY: 10.03, // dx=2cm, dy=3cm -> net=3.6cm (NORMAL)
      joint: 'PASS',
      damage: 'NONE',
    },
    {
      pileNo: 'P-002',
      gridLine: 'A-2',
      criteriaId: criteria1.id,
      status: 'COMPLETED',
      drivenLength: 21.0,
      blows: [11, 13, 14, 16, 17, 19, 21, 23, 26, 29, 31, 33, 36, 39, 41, 44, 46, 50, 54, 60, 68],
      measured10: 4.8, // PASS
      plumbX: 0.6,
      plumbY: 0.7,
      desX: 10.0,
      desY: 14.0,
      actX: 10.06,
      actY: 14.04, // dx=6cm, dy=4cm -> net=7.21cm (WARNING)
      joint: 'PASS',
      damage: 'MINOR',
    },
    {
      pileNo: 'P-003',
      gridLine: 'A-3',
      criteriaId: criteria1.id,
      status: 'ISSUE',
      drivenLength: 20.5,
      blows: [10, 11, 12, 14, 15, 17, 18, 20, 22, 23, 25, 27, 28, 30, 32, 34, 35, 36, 38, 40],
      measured10: 9.5, // > 7.44 -> FAIL (Need Re-drive)
      plumbX: 0.8,
      plumbY: 0.9,
      desX: 10.0,
      desY: 18.0,
      actX: 10.01,
      actY: 18.02,
      joint: 'PASS',
      damage: 'NONE',
    },
    {
      pileNo: 'P-004',
      gridLine: 'B-1',
      criteriaId: criteria2.id,
      status: 'COMPLETED',
      drivenLength: 24.0,
      blows: [15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 52, 55, 58, 62, 66, 70, 75, 80, 85, 92],
      measured10: 4.2,
      plumbX: 0.3,
      plumbY: 0.4,
      desX: 15.0,
      desY: 10.0,
      actX: 15.03,
      actY: 10.02,
      joint: 'PASS',
      damage: 'NONE',
    },
    {
      pileNo: 'P-005',
      gridLine: 'B-2',
      criteriaId: criteria2.id,
      status: 'PLANNED',
      drivenLength: 0,
      blows: [],
      measured10: 0,
      plumbX: 0,
      plumbY: 0,
      desX: 15.0,
      desY: 14.0,
      actX: 15.0,
      actY: 14.0,
      joint: 'NOT_APPLICABLE',
      damage: 'NONE',
    },
  ];

  for (const p of samplePiles) {
    const pile = await prisma.pile.create({
      data: {
        projectId: project.id,
        criteriaId: p.criteriaId,
        pileNo: p.pileNo,
        gridLine: p.gridLine,
        status: p.status,
        driveDate: p.status !== 'PLANNED' ? new Date() : null,
      },
    });

    if (p.status !== 'PLANNED') {
      const isSetPassed = p.measured10 <= (p.criteriaId === criteria1.id ? c1Calc.targetSet10BlowsCm : c2Calc.targetSet10BlowsCm);
      await prisma.drivingRecord.create({
        data: {
          pileId: pile.id,
          penetrationBlows: JSON.stringify(p.blows),
          measuredLast10Cm: p.measured10,
          measuredTempCCm: 1.2,
          drivenLengthM: p.drivenLength,
          cutOffLevelM: +2.50,
          groundLevelM: +3.00,
          tipLevelM: -18.00,
          isSetPassed,
          inspectorName: 'Somchai Eng.',
          notes: isSetPassed ? 'Set achieved successfully.' : 'High penetration rate, requires re-drive test.',
        },
      });

      const dx = Math.abs(p.actX - p.desX) * 100;
      const dy = Math.abs(p.actY - p.desY) * 100;
      const net = Math.sqrt(dx * dx + dy * dy);
      const devStatus = net > 10 ? 'CRITICAL' : net > 5 ? 'WARNING' : 'NORMAL';

      await prisma.qCInspection.create({
        data: {
          pileId: pile.id,
          plumbnessXPercent: p.plumbX,
          plumbnessYPercent: p.plumbY,
          isPlumbnessPassed: p.plumbX <= 1.0 && p.plumbY <= 1.0,
          designCoordX: p.desX,
          designCoordY: p.desY,
          actualCoordX: p.actX,
          actualCoordY: p.actY,
          deltaXCm: Number(dx.toFixed(2)),
          deltaYCm: Number(dy.toFixed(2)),
          netDeviationCm: Number(net.toFixed(2)),
          deviationStatus: devStatus,
          jointWeldStatus: p.joint,
          headDamageStatus: p.damage,
          inspectorName: 'Wichai QC',
          approvedByCM: devStatus === 'NORMAL',
        },
      });
    }
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
