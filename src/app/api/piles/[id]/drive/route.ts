import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkDrivingRecordVersion } from '@/lib/drivingRecordConcurrency';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let pileId = '';
  try {
    const { id } = await params;
    pileId = id;
    const body = await request.json();
    const {
      penetrationBlows,
      recordUnit,
      recordScope,
      windowLengthFt,
      measuredLast10Cm,
      measuredTempCCm,
      drivenLengthM,
      totalPileLengthM,
      stickUpLengthM,
      cutOffLevelM,
      groundLevelM,
      tipLevelM,
      inspectorName,
      notes,
      expectedRecordUpdatedAt,
      forceOverwrite,
    } = body;

    if (forceOverwrite === true && expectedRecordUpdatedAt === undefined) {
      return NextResponse.json(
        { error: 'forceOverwrite requires expectedRecordUpdatedAt' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const pile = await tx.pile.findUnique({
          where: { id: pileId },
          include: { criteria: true, drivingRecord: true },
        });

        if (!pile) return { kind: 'NOT_FOUND' as const };

        const versionCheck = checkDrivingRecordVersion(
          pile.drivingRecord?.updatedAt ?? null,
          expectedRecordUpdatedAt
        );

        if (!versionCheck.allowed) {
          return {
            kind: 'CONFLICT' as const,
            code: versionCheck.code,
            serverUpdatedAt: versionCheck.serverUpdatedAt || null,
          };
        }

        const targetSet = pile.criteria?.targetSet10BlowsCm ?? 10.0;
        const isSetPassed = measuredLast10Cm > 0 && measuredLast10Cm <= targetSet;

        const record = await tx.drivingRecord.upsert({
          where: { pileId },
          create: {
            pileId,
            penetrationBlows: JSON.stringify(penetrationBlows || []),
            recordUnit: recordUnit || 'FEET',
            recordScope: recordScope || 'FULL',
            windowLengthFt: windowLengthFt !== undefined ? Number(windowLengthFt) : 20,
            measuredLast10Cm: Number(measuredLast10Cm) || 0,
            measuredTempCCm: Number(measuredTempCCm) || 1.2,
            drivenLengthM: Number(drivenLengthM) || 0,
            totalPileLengthM: totalPileLengthM !== undefined && totalPileLengthM !== null ? Number(totalPileLengthM) : null,
            stickUpLengthM: stickUpLengthM !== undefined && stickUpLengthM !== null ? Number(stickUpLengthM) : null,
            cutOffLevelM: cutOffLevelM !== undefined ? Number(cutOffLevelM) : null,
            groundLevelM: groundLevelM !== undefined ? Number(groundLevelM) : null,
            tipLevelM: tipLevelM !== undefined ? Number(tipLevelM) : null,
            isSetPassed,
            inspectorName: inspectorName || '',
            notes: notes || '',
          },
          update: {
            penetrationBlows: JSON.stringify(penetrationBlows || []),
            recordUnit: recordUnit || 'FEET',
            recordScope: recordScope || 'FULL',
            windowLengthFt: windowLengthFt !== undefined ? Number(windowLengthFt) : 20,
            measuredLast10Cm: Number(measuredLast10Cm) || 0,
            measuredTempCCm: Number(measuredTempCCm) || 1.2,
            drivenLengthM: Number(drivenLengthM) || 0,
            totalPileLengthM: totalPileLengthM !== undefined && totalPileLengthM !== null ? Number(totalPileLengthM) : null,
            stickUpLengthM: stickUpLengthM !== undefined && stickUpLengthM !== null ? Number(stickUpLengthM) : null,
            cutOffLevelM: cutOffLevelM !== undefined ? Number(cutOffLevelM) : null,
            groundLevelM: groundLevelM !== undefined ? Number(groundLevelM) : null,
            tipLevelM: tipLevelM !== undefined ? Number(tipLevelM) : null,
            isSetPassed,
            inspectorName: inspectorName || '',
            notes: notes || '',
          },
        });

        const newStatus = isSetPassed ? 'COMPLETED' : 'ISSUE';
        await tx.pile.update({
          where: { id: pileId },
          data: {
            status: newStatus,
            driveDate: new Date(),
          },
        });

        return { kind: 'OK' as const, record, isSetPassed, status: newStatus };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Pile not found' }, { status: 404 });
    }

    if (result.kind === 'CONFLICT') {
      return NextResponse.json(
        {
          error: 'Driving record changed on the server',
          code: result.code,
          serverUpdatedAt: result.serverUpdatedAt,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      record: result.record,
      isSetPassed: result.isSetPassed,
      status: result.status,
    });
  } catch (error) {
    const errorCode = error && typeof error === 'object'
      ? (error as { code?: unknown }).code
      : null;
    const isSerializationConflict = errorCode === 'P2034' || String(error).includes('P2034') || (() => {
      try { return JSON.stringify(error).includes('P2034'); } catch { return false; }
    })();
    if (isSerializationConflict) {
      try {
        const serverRecord = await prisma.drivingRecord.findUnique({
          where: { pileId },
          select: { updatedAt: true },
        });
        return NextResponse.json(
          {
            error: 'Driving record changed on the server',
            code: 'DRIVING_RECORD_CONFLICT',
            serverUpdatedAt: serverRecord?.updatedAt?.toISOString() ?? null,
          },
          { status: 409 }
        );
      } catch {
        // Fall through to the generic error if the conflict metadata cannot be read.
      }
    }
    console.error('Failed to save driving record:', error);
    return NextResponse.json({ error: 'Failed to save driving record' }, { status: 500 });
  }
}
