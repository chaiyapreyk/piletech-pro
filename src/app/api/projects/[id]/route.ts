import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        settings: true,
        criteria: true,
        _count: {
          select: { piles: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'ไม่พบโครงการที่ระบุ' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if project exists
    const existing = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { piles: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบโครงการที่ต้องการลบ' }, { status: 404 });
    }

    // Safety check: Prevent deleting the last project
    const totalProjects = await prisma.project.count();
    if (totalProjects <= 1) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบโครงการสุดท้ายได้ ระบบต้องมีอย่างน้อย 1 โครงการ' },
        { status: 400 }
      );
    }

    // Execute deletion within a transaction in safe relational order
    await prisma.$transaction(async (tx) => {
      // 1. Delete piles (drivingRecord and qcInspection cascade delete via pileId)
      await tx.pile.deleteMany({
        where: { projectId: id },
      });

      // 2. Delete criteria
      await tx.drivingCriteria.deleteMany({
        where: { projectId: id },
      });

      // 3. Delete settings
      await tx.projectSettings.deleteMany({
        where: { projectId: id },
      });

      // 4. Delete the project itself
      await tx.project.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `ลบโครงการ "${existing.name}" (${existing.code}) สำเร็จแล้ว`,
    });
  } catch (error: any) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: error?.message || 'เกิดข้อผิดพลาดในการลบโครงการ' },
      { status: 500 }
    );
  }
}
