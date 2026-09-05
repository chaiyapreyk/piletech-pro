import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pile = await prisma.pile.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            settings: true,
          },
        },
        criteria: true,
        drivingRecord: true,
        qcInspection: true,
      },
    });

    if (!pile) {
      return NextResponse.json({ error: 'Pile not found' }, { status: 404 });
    }

    return NextResponse.json(pile);
  } catch (error) {
    console.error('Failed to fetch pile:', error);
    return NextResponse.json({ error: 'Failed to fetch pile' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if pile exists
    const existing = await prisma.pile.findUnique({
      where: { id },
      include: { drivingRecord: true, qcInspection: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pile not found' }, { status: 404 });
    }

    // Delete pile (drivingRecord and qcInspection will cascade delete via foreign keys)
    await prisma.pile.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Pile ${existing.pileNo} deleted successfully`,
    });
  } catch (error) {
    console.error('Failed to delete pile:', error);
    return NextResponse.json({ error: 'Failed to delete pile' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { pileNo, gridLine, criteriaId, building, status } = body;

    const existing = await prisma.pile.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pile not found' }, { status: 404 });
    }

    const updated = await prisma.pile.update({
      where: { id },
      data: {
        ...(pileNo && { pileNo }),
        ...(gridLine && { gridLine }),
        ...(criteriaId !== undefined && { criteriaId }),
        ...(building && { building }),
        ...(status && { status }),
      },
      include: {
        criteria: true,
        drivingRecord: true,
        qcInspection: true,
      },
    });

    return NextResponse.json({
      success: true,
      pile: updated,
      message: `อัปเดตข้อมูลเสาเข็ม ${updated.pileNo} สำเร็จ`,
    });
  } catch (error) {
    console.error('Failed to update pile:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการแก้ไขเสาเข็ม' }, { status: 500 });
  }
}
