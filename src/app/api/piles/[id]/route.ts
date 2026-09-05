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
