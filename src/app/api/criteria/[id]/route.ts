import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateHiley } from '@/lib/calculations/hiley';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const criteria = await prisma.drivingCriteria.findUnique({
      where: { id },
      include: {
        _count: {
          select: { piles: true },
        },
      },
    });

    if (!criteria) {
      return NextResponse.json({ error: 'ไม่พบรายการคำนวณที่ระบุ' }, { status: 404 });
    }

    return NextResponse.json(criteria);
  } catch (error) {
    console.error('Failed to fetch criteria:', error);
    return NextResponse.json({ error: 'Failed to fetch criteria' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.drivingCriteria.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรายการคำนวณที่ต้องการแก้ไข' }, { status: 404 });
    }

    let {
      name,
      pileType,
      sectionId,
      safeWorkingLoadT,
      safetyFactor,
      hammerWeightT,
      dropHeightCm,
      pileWeightT,
      cushionCoeffE,
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

    const finalPileType = pileType !== undefined ? pileType.trim() : existing.pileType;
    const finalSWL = safeWorkingLoadT !== undefined ? Number(safeWorkingLoadT) : existing.safeWorkingLoadT;
    const finalFS = safetyFactor !== undefined ? Number(safetyFactor) : existing.safetyFactor;
    const finalHammer = hammerWeightT !== undefined ? Number(hammerWeightT) : existing.hammerWeightT;
    const finalDrop = dropHeightCm !== undefined ? Number(dropHeightCm) : existing.dropHeightCm;
    const finalCushion = cushionCoeffE !== undefined ? Number(cushionCoeffE) : existing.cushionCoeffE;
    const finalC = tempCompressionC !== undefined ? Number(tempCompressionC) : existing.tempCompressionC;
    const finalPileWeight = pileWeightT !== undefined ? (pileWeightT !== null ? Number(pileWeightT) : null) : existing.pileWeightT;
    const finalFc = concreteStrengthKsc !== undefined ? (concreteStrengthKsc !== null ? Number(concreteStrengthKsc) : null) : existing.concreteStrengthKsc;
    const finalEc = elasticModulusKsc !== undefined ? (elasticModulusKsc !== null ? Number(elasticModulusKsc) : null) : existing.elasticModulusKsc;
    const finalArea = pileSectionAreaCm2 !== undefined ? (pileSectionAreaCm2 !== null ? Number(pileSectionAreaCm2) : null) : existing.pileSectionAreaCm2;
    const finalLength = pileLengthM !== undefined ? (pileLengthM !== null ? Number(pileLengthM) : null) : existing.pileLengthM;

    let finalTargetSet = Number(targetSet10BlowsCm);
    if (isNaN(finalTargetSet) || finalTargetSet <= 0) {
      const calc = calculateHiley({
        safeWorkingLoadTons: finalSWL,
        safetyFactor: finalFS,
        hammerWeightTons: finalHammer,
        dropHeightCm: finalDrop,
        pileWeightTons: finalPileWeight || 1.8,
        restitutionCoeff: finalCushion || 0.25,
        tempCompressionCm: finalC || 1.2,
        concreteStrengthKsc: finalFc || undefined,
        elasticModulusKsc: finalEc || undefined,
        pileSectionAreaCm2: finalArea || undefined,
        pileLengthM: finalLength || undefined,
      });
      finalTargetSet = Number(calc.targetSet10BlowsCm.toFixed(2));
    }

    const displayName = name !== undefined ? name?.trim() : existing.name;

    const updated = await prisma.drivingCriteria.update({
      where: { id },
      data: {
        name: displayName,
        pileType: finalPileType,
        sectionId: sectionId !== undefined ? sectionId : existing.sectionId,
        safeWorkingLoadT: finalSWL,
        safetyFactor: finalFS,
        hammerWeightT: finalHammer,
        dropHeightCm: finalDrop,
        pileWeightT: finalPileWeight,
        cushionCoeffE: finalCushion,
        tempCompressionC: finalC,
        concreteStrengthKsc: finalFc,
        elasticModulusKsc: finalEc,
        pileSectionAreaCm2: finalArea,
        pileLengthM: finalLength,
        hammerEfficiency: hammerEfficiency !== undefined ? (hammerEfficiency !== null ? Number(hammerEfficiency) : null) : existing.hammerEfficiency,
        targetSet10BlowsCm: finalTargetSet,
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: {
        _count: {
          select: { piles: true },
        },
      },
    });

    // Re-evaluate Pass/Fail status for piles currently tied to this criteria
    const attachedPiles = await prisma.pile.findMany({
      where: { criteriaId: id },
      include: { drivingRecord: true },
    });

    for (const p of attachedPiles) {
      if (p.drivingRecord && p.drivingRecord.measuredLast10Cm > 0) {
        const isSetPassed = p.drivingRecord.measuredLast10Cm <= finalTargetSet;
        if (isSetPassed !== p.drivingRecord.isSetPassed) {
          await prisma.drivingRecord.update({
            where: { id: p.drivingRecord.id },
            data: { isSetPassed },
          });
        }
      }
    }

    let updatedPilesCount = attachedPiles.length;
    if (applyToAllPiles) {
      const updateResult = await prisma.pile.updateMany({
        where: { projectId: existing.projectId },
        data: { criteriaId: id },
      });
      updatedPilesCount = updateResult.count;
    } else if (applyToAllMatchingType) {
      const updateResult = await prisma.pile.updateMany({
        where: {
          projectId: existing.projectId,
          OR: [
            { criteria: { pileType: finalPileType } },
            { criteriaId: null },
          ],
        },
        data: { criteriaId: id },
      });
      updatedPilesCount = updateResult.count;
    }

    return NextResponse.json({
      criteria: updated,
      updatedPilesCount,
      message: `ปรับปรุงรายการคำนวณ "${displayName || finalPileType}" สำเร็จ (Target Set: ${finalTargetSet} cm)`,
    });
  } catch (error) {
    console.error('Failed to update driving criteria:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการปรับปรุงรายการคำนวณ' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.drivingCriteria.findUnique({
      where: { id },
      include: { _count: { select: { piles: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรายการคำนวณที่ต้องการลบ' }, { status: 404 });
    }

    // Unlink piles gracefully
    if (existing._count.piles > 0) {
      await prisma.pile.updateMany({
        where: { criteriaId: id },
        data: { criteriaId: null },
      });
    }

    await prisma.drivingCriteria.delete({
      where: { id },
    });

    return NextResponse.json({
      message: `ลบรายการคำนวณ "${existing.name || existing.pileType}" เรียบร้อยแล้ว`,
    });
  } catch (error) {
    console.error('Failed to delete driving criteria:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบรายการคำนวณ' }, { status: 500 });
  }
}
