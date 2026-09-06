import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateHiley } from '@/lib/calculations/hiley';
import { getActiveProject } from '@/lib/activeProject';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let projectId = searchParams.get('projectId');

    if (!projectId) {
      const activeProject = await getActiveProject();
      projectId = activeProject?.id || null;
    }

    if (!projectId) {
      return NextResponse.json([]);
    }

    const criteriaList = await prisma.drivingCriteria.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { piles: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(criteriaList);
  } catch (error) {
    console.error('Failed to fetch driving criteria:', error);
    return NextResponse.json({ error: 'Failed to fetch driving criteria' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let {
      projectId,
      name,
      pileType,
      sectionId,
      safeWorkingLoadT,
      safetyFactor = 2.5,
      hammerWeightT,
      dropHeightCm,
      pileWeightT,
      cushionCoeffE = 0.25,
      tempCompressionC,
      concreteStrengthKsc,
      elasticModulusKsc,
      pileSectionAreaCm2,
      pileLengthM,
      hammerEfficiency,
      targetSet10BlowsCm,
      notes,
      applyToAllMatchingType,
      applyToAllPiles,
    } = body;

    if (!projectId) {
      const activeProject = await getActiveProject();
      projectId = activeProject?.id;
    }

    if (!projectId) {
      return NextResponse.json({ error: 'ไม่พบรหัสโครงการที่ต้องการบันทึก' }, { status: 400 });
    }

    if (!pileType || !safeWorkingLoadT || !hammerWeightT || !dropHeightCm || tempCompressionC === undefined) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลพารามิเตอร์สำคัญให้ครบถ้วน' }, { status: 400 });
    }

    // Auto-calculate Target Set if not provided or 0
    let finalTargetSet = Number(targetSet10BlowsCm);
    if (isNaN(finalTargetSet) || finalTargetSet <= 0) {
      const calc = calculateHiley({
        safeWorkingLoadTons: Number(safeWorkingLoadT),
        safetyFactor: Number(safetyFactor) || 2.5,
        hammerWeightTons: Number(hammerWeightT),
        dropHeightCm: Number(dropHeightCm),
        pileWeightTons: Number(pileWeightT) || 1.8,
        restitutionCoeff: Number(cushionCoeffE) || 0.25,
        tempCompressionCm: Number(tempCompressionC) || 1.2,
        concreteStrengthKsc: concreteStrengthKsc ? Number(concreteStrengthKsc) : undefined,
        elasticModulusKsc: elasticModulusKsc ? Number(elasticModulusKsc) : undefined,
        pileSectionAreaCm2: pileSectionAreaCm2 ? Number(pileSectionAreaCm2) : undefined,
        pileLengthM: pileLengthM ? Number(pileLengthM) : undefined,
      });
      finalTargetSet = Number(calc.targetSet10BlowsCm.toFixed(2));
    }

    const displayName = name?.trim() || `${pileType} (Ra ${safeWorkingLoadT}T)`;

    const criteria = await prisma.drivingCriteria.create({
      data: {
        projectId,
        name: displayName,
        pileType: pileType.trim(),
        sectionId: sectionId || null,
        safeWorkingLoadT: Number(safeWorkingLoadT),
        safetyFactor: Number(safetyFactor) || 2.5,
        hammerWeightT: Number(hammerWeightT),
        dropHeightCm: Number(dropHeightCm),
        pileWeightT: pileWeightT !== undefined && pileWeightT !== null ? Number(pileWeightT) : null,
        cushionCoeffE: Number(cushionCoeffE) || 0.25,
        tempCompressionC: Number(tempCompressionC),
        concreteStrengthKsc: concreteStrengthKsc !== undefined && concreteStrengthKsc !== null ? Number(concreteStrengthKsc) : null,
        elasticModulusKsc: elasticModulusKsc !== undefined && elasticModulusKsc !== null ? Number(elasticModulusKsc) : null,
        pileSectionAreaCm2: pileSectionAreaCm2 !== undefined && pileSectionAreaCm2 !== null ? Number(pileSectionAreaCm2) : null,
        pileLengthM: pileLengthM !== undefined && pileLengthM !== null ? Number(pileLengthM) : null,
        hammerEfficiency: hammerEfficiency !== undefined && hammerEfficiency !== null ? Number(hammerEfficiency) : null,
        targetSet10BlowsCm: finalTargetSet,
        notes: notes || null,
      },
      include: {
        _count: {
          select: { piles: true },
        },
      },
    });

    let updatedPilesCount = 0;
    if (applyToAllPiles) {
      const updateResult = await prisma.pile.updateMany({
        where: { projectId },
        data: { criteriaId: criteria.id },
      });
      updatedPilesCount = updateResult.count;
    } else if (applyToAllMatchingType) {
      const updateResult = await prisma.pile.updateMany({
        where: {
          projectId,
          OR: [
            { criteria: { pileType: criteria.pileType } },
            { criteriaId: null },
          ],
        },
        data: { criteriaId: criteria.id },
      });
      updatedPilesCount = updateResult.count;
    }

    return NextResponse.json({
      criteria,
      updatedPilesCount,
      message: `บันทึกรายการคำนวณ "${displayName}" สำเร็จ`,
    });
  } catch (error) {
    console.error('Failed to create driving criteria:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกรายการคำนวณ' }, { status: 500 });
  }
}
