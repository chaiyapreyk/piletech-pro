import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function getActiveProject<T extends Prisma.ProjectInclude>(
  include?: T
): Promise<Prisma.ProjectGetPayload<{ include: T }> | null> {
  let activeProjectId: string | undefined = undefined;

  try {
    const cookieStore = await cookies();
    activeProjectId = cookieStore.get('active_project_id')?.value;
  } catch {
    // cookies() may throw if called outside request store (e.g. testing or build prerender)
  }

  let project: any = null;
  if (activeProjectId) {
    try {
      project = await (prisma.project.findUnique as any)({
        where: { id: activeProjectId },
        include,
      });
    } catch (err) {
      console.error('Error finding project by activeProjectId:', err);
    }
  }

  // Fallback to latest project if not found or no cookie
  if (!project) {
    try {
      project = await (prisma.project.findFirst as any)({
        include,
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.error('Error finding fallback project:', err);
    }
  }

  return project as Prisma.ProjectGetPayload<{ include: T }> | null;
}
