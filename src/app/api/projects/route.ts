import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        settings: true,
        criteria: true,
        _count: {
          select: { piles: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, location, clientName, consultantName, contractorName } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อโครงการ/อาคาร และรหัสโครงการ' },
        { status: 400 }
      );
    }

    const existing = await prisma.project.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `รหัสโครงการ "${code}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น` },
        { status: 400 }
      );
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        code,
        location: location || '',
        clientName: clientName || '',
        consultantName: consultantName || '',
        contractorName: contractorName || '',
        settings: {
          create: {
            defaultSafetyFactor: 2.5,
            maxPlumbnessPercent: 1.0,
            devNormalThresholdCm: 5.0,
            devCriticalThresholdCm: 10.0,
          },
        },
        criteria: {
          create: [
            {
              pileType: 'I-Section 0.26x0.26m',
              safeWorkingLoadT: 30.0,
              safetyFactor: 2.5,
              hammerWeightT: 3.5,
              dropHeightCm: 40.0,
              cushionCoeffE: 0.25,
              tempCompressionC: 1.2,
              targetSet10BlowsCm: 2.5,
            },
            {
              pileType: 'Square 0.30x0.30m',
              safeWorkingLoadT: 45.0,
              safetyFactor: 2.5,
              hammerWeightT: 4.5,
              dropHeightCm: 45.0,
              cushionCoeffE: 0.25,
              tempCompressionC: 1.5,
              targetSet10BlowsCm: 2.0,
            },
          ],
        },
      },
      include: {
        settings: true,
        criteria: true,
      },
    });

    return NextResponse.json({
      success: true,
      project: newProject,
      message: `สร้างโครงการ/อาคาร "${name}" สำเร็จ`,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างโครงการ' }, { status: 500 });
  }
}
