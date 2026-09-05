import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pileId } = await params;
    const body = await request.json();
    const {
      penetrationBlows,
      recordUnit,
      recordScope,
      windowLengthFt,
      measuredLast10Cm,
      measuredTempCCm,
      drivenLengthM,
      cutOffLevelM,
      groundLevelM,
      tipLevelM,
      inspectorName,
      notes,
    } = body;

    const pile = await prisma.pile.findUnique({
      where: { id: pileId },
      include: { criteria: true },
    });

    if (!pile) {
      return NextResponse.json({ error: 'Pile not found' }, { status: 404 });
    }

    const targetSet = pile.criteria?.targetSet10BlowsCm ?? 10.0;
    const isSetPassed = measuredLast10Cm > 0 && measuredLast10Cm <= targetSet;

    // Upsert driving record
    const record = await prisma.drivingRecord.upsert({
      where: { pileId },
      create: {
        pileId,
        penetrationBlows: JSON.stringify(penetrationBlows || []),
        recordUnit: recordUnit || 'METER',
        recordScope: recordScope || 'FULL',
        windowLengthFt: windowLengthFt !== undefined ? Number(windowLengthFt) : 20,
        measuredLast10Cm: Number(measuredLast10Cm) || 0,
        measuredTempCCm: Number(measuredTempCCm) || 1.2,
        drivenLengthM: Number(drivenLengthM) || 0,
        cutOffLevelM: cutOffLevelM !== undefined ? Number(cutOffLevelM) : null,
        groundLevelM: groundLevelM !== undefined ? Number(groundLevelM) : null,
        tipLevelM: tipLevelM !== undefined ? Number(tipLevelM) : null,
        isSetPassed,
        inspectorName: inspectorName || '',
        notes: notes || '',
      },
      update: {
        penetrationBlows: JSON.stringify(penetrationBlows || []),
        recordUnit: recordUnit || 'METER',
        recordScope: recordScope || 'FULL',
        windowLengthFt: windowLengthFt !== undefined ? Number(windowLengthFt) : 20,
        measuredLast10Cm: Number(measuredLast10Cm) || 0,
        measuredTempCCm: Number(measuredTempCCm) || 1.2,
        drivenLengthM: Number(drivenLengthM) || 0,
        cutOffLevelM: cutOffLevelM !== undefined ? Number(cutOffLevelM) : null,
        groundLevelM: groundLevelM !== undefined ? Number(groundLevelM) : null,
        tipLevelM: tipLevelM !== undefined ? Number(tipLevelM) : null,
        isSetPassed,
        inspectorName: inspectorName || '',
        notes: notes || '',
      },
    });

    // Update pile status
    const newStatus = isSetPassed ? 'COMPLETED' : 'ISSUE';
    await prisma.pile.update({
      where: { id: pileId },
      data: {
        status: newStatus,
        driveDate: new Date(),
      },
    });

    return NextResponse.json({ record, isSetPassed, status: newStatus });
  } catch (error) {
    console.error('Failed to save driving record:', error);
    return NextResponse.json({ error: 'Failed to save driving record' }, { status: 500 });
  }
}
