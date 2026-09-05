import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      totalCount,
      prefix = 'P-',
      startNumber = 1,
      digits = 3,
      criteriaId,
    } = body;

    const count = parseInt(totalCount, 10);
    if (!count || count <= 0) {
      return NextResponse.json(
        { error: 'โปรดระบุจำนวนเสาเข็มที่ถูกต้อง (มากกว่า 0)' },
        { status: 400 }
      );
    }

    // Find default project
    const project = await prisma.project.findFirst({
      include: { criteria: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลโครงการในระบบ' },
        { status: 404 }
      );
    }

    const targetCriteriaId = criteriaId || project.criteria[0]?.id || null;

    // Find existing piles
    const existingPiles = await prisma.pile.findMany({
      where: { projectId: project.id },
      select: { pileNo: true },
    });
    const existingSet = new Set(existingPiles.map((p) => p.pileNo));

    // Generate batch list
    const pilesToCreate: Array<{
      projectId: string;
      criteriaId: string | null;
      pileNo: string;
      gridLine: string;
      status: string;
    }> = [];

    for (let i = startNumber; i < startNumber + count; i++) {
      const numStr = String(i).padStart(digits, '0');
      const pileNo = `${prefix}${numStr}`;
      
      if (!existingSet.has(pileNo)) {
        // Calculate a reasonable default gridline e.g. A-1, A-2... or GL-01
        const rowChar = String.fromCharCode(65 + Math.floor((i - 1) / 10) % 26);
        const colNum = ((i - 1) % 10) + 1;
        const gridLine = `${rowChar}-${colNum}`;

        pilesToCreate.push({
          projectId: project.id,
          criteriaId: targetCriteriaId,
          pileNo,
          gridLine,
          status: 'PLANNED',
        });
      }
    }

    if (pilesToCreate.length > 0) {
      // Chunk insertions in batches of 100 for SQLite safety
      const chunkSize = 100;
      for (let i = 0; i < pilesToCreate.length; i += chunkSize) {
        const chunk = pilesToCreate.slice(i, i + chunkSize);
        await prisma.pile.createMany({
          data: chunk,
        });
      }
    }

    const totalNow = await prisma.pile.count({
      where: { projectId: project.id },
    });

    return NextResponse.json({
      success: true,
      createdCount: pilesToCreate.length,
      skippedCount: count - pilesToCreate.length,
      totalPiles: totalNow,
      message: `สร้างเสาเข็มใหม่สำเร็จ ${pilesToCreate.length} ต้น (รวมทั้งโครงการ ${totalNow} ต้น)`,
    });
  } catch (error) {
    console.error('Failed to batch create piles:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างชุดเสาเข็ม' },
      { status: 500 }
    );
  }
}
