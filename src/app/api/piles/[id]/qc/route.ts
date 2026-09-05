import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateDeviation, evaluatePlumbness, evaluateOverallQC } from '@/lib/calculations/qaqc';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pileId } = await params;
    const body = await request.json();
    const {
      plumbnessXPercent,
      plumbnessYPercent,
      designCoordX,
      designCoordY,
      actualCoordX,
      actualCoordY,
      jointWeldStatus,
      headDamageStatus,
      photoUrls,
      inspectorName,
      approvedByCM,
    } = body;

    const pile = await prisma.pile.findUnique({
      where: { id: pileId },
      include: {
        project: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!pile) {
      return NextResponse.json({ error: 'Pile not found' }, { status: 404 });
    }

    // Evaluate Plumbness
    const plumbCheck = evaluatePlumbness(
      Number(plumbnessXPercent) || 0,
      Number(plumbnessYPercent) || 0,
      pile.project.settings?.maxPlumbnessPercent ?? 1.0
    );

    // Evaluate Deviation
    const devCheck = calculateDeviation(
      {
        designX: Number(designCoordX) || 0,
        designY: Number(designCoordY) || 0,
        actualX: Number(actualCoordX) || 0,
        actualY: Number(actualCoordY) || 0,
        isMeters: true,
      },
      {
        normalThresholdCm: pile.project.settings?.devNormalThresholdCm ?? 5.0,
        criticalThresholdCm: pile.project.settings?.devCriticalThresholdCm ?? 10.0,
      }
    );

    // Upsert QC Inspection
    const qc = await prisma.qCInspection.upsert({
      where: { pileId },
      create: {
        pileId,
        plumbnessXPercent: plumbCheck.plumbnessXPercent,
        plumbnessYPercent: plumbCheck.plumbnessYPercent,
        isPlumbnessPassed: plumbCheck.isPassed,
        designCoordX: Number(designCoordX) || null,
        designCoordY: Number(designCoordY) || null,
        actualCoordX: Number(actualCoordX) || null,
        actualCoordY: Number(actualCoordY) || null,
        deltaXCm: devCheck.deltaXCm,
        deltaYCm: devCheck.deltaYCm,
        netDeviationCm: devCheck.netDeviationCm,
        deviationStatus: devCheck.status,
        jointWeldStatus: jointWeldStatus || 'PASS',
        headDamageStatus: headDamageStatus || 'NONE',
        photoUrls: photoUrls ? JSON.stringify(photoUrls) : null,
        inspectorName: inspectorName || '',
        approvedByCM: Boolean(approvedByCM),
      },
      update: {
        plumbnessXPercent: plumbCheck.plumbnessXPercent,
        plumbnessYPercent: plumbCheck.plumbnessYPercent,
        isPlumbnessPassed: plumbCheck.isPassed,
        designCoordX: Number(designCoordX) || null,
        designCoordY: Number(designCoordY) || null,
        actualCoordX: Number(actualCoordX) || null,
        actualCoordY: Number(actualCoordY) || null,
        deltaXCm: devCheck.deltaXCm,
        deltaYCm: devCheck.deltaYCm,
        netDeviationCm: devCheck.netDeviationCm,
        deviationStatus: devCheck.status,
        jointWeldStatus: jointWeldStatus || 'PASS',
        headDamageStatus: headDamageStatus || 'NONE',
        photoUrls: photoUrls ? JSON.stringify(photoUrls) : null,
        inspectorName: inspectorName || '',
        approvedByCM: Boolean(approvedByCM),
      },
    });

    return NextResponse.json({
      qc,
      plumbCheck,
      devCheck,
    });
  } catch (error) {
    console.error('Failed to save QC inspection:', error);
    return NextResponse.json({ error: 'Failed to save QC inspection' }, { status: 500 });
  }
}
