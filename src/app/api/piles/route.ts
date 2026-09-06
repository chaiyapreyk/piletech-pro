import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let projectId = searchParams.get('projectId');
    if (!projectId) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/active_project_id=([^;]+)/);
      if (match) {
        projectId = match[1];
      }
    }

    const piles = await prisma.pile.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        criteria: true,
        drivingRecord: true,
        qcInspection: true,
        project: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        pileNo: 'asc',
      },
    });

    return NextResponse.json(piles);
  } catch (error) {
    console.error('Failed to fetch piles:', error);
    return NextResponse.json({ error: 'Failed to fetch piles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, criteriaId, pileNo, gridLine } = body;

    if (!projectId || !pileNo || !gridLine) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newPile = await prisma.pile.create({
      data: {
        projectId,
        criteriaId,
        pileNo,
        gridLine,
        status: 'PLANNED',
      },
      include: {
        criteria: true,
      },
    });

    return NextResponse.json(newPile, { status: 201 });
  } catch (error) {
    console.error('Failed to create pile:', error);
    return NextResponse.json({ error: 'Failed to create pile' }, { status: 500 });
  }
}
