import { prisma } from '../../lib/prisma.js';

export async function getSummary(userId: string) {
  const [total, byStatus, recentActivity] = await Promise.all([
    prisma.application.count({ where: { userId } }),

    prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    }),

    prisma.application.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    byStatus.map((s) => [s.status, s._count.status]),
  );

  return {
    total,
    thisWeek: recentActivity,
    byStatus: statusCounts,
  };
}

export async function getTimeline(userId: string, days: number) {
  // TODO: Implement timeline analytics
  // Approach: GROUP BY date_trunc('day', created_at) for applications
  // created in the last N days, returning { date, count } pairs
  const _startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  void userId;
  return [] as Array<{ date: string; count: number }>;
}

export async function getFunnel(userId: string) {
  // TODO: Implement funnel analytics
  // Approach: Count applications that have ever reached each status
  // by querying ApplicationEvent STATUS_CHANGE events, giving a
  // conversion funnel: APPLIED → SCREENING → INTERVIEW → OFFER
  void userId;
  return {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
  };
}

export async function getTimeInStage(userId: string, status?: string) {
  // TODO: Implement time-in-stage analytics
  // Approach: For each application, calculate time between consecutive
  // STATUS_CHANGE events to determine average days in each stage
  void userId;
  void status;
  return [] as Array<{ status: string; avgDays: number }>;
}
