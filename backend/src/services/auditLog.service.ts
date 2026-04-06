import prisma from '../config/database';

const auditLogModel = (prisma as any).auditLog;

interface AuditLogInput {
  userId?: string | null;
  username?: string | null;
  account?: string | null;
  role?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  status?: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown> | null;
}

export const createAuditLog = async (input: AuditLogInput): Promise<void> => {
  try {
    await auditLogModel.create({
      data: {
        userId: input.userId || null,
        username: input.username || null,
        account: input.account || input.username || null,
        role: input.role || null,
        action: input.action,
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
        status: input.status || 'SUCCESS',
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to write audit log:', error);
  }
};

export const getAuditLogs = async (query: {
  page: number;
  pageSize: number;
  action?: string;
  role?: string;
  keyword?: string;
  from?: Date;
  to?: Date;
}) => {
  const where: any = {};

  if (query.action) {
    where.action = query.action;
  }
  if (query.role) {
    where.role = query.role;
  }
  if (query.from || query.to) {
    where.timestamp = {};
    if (query.from) where.timestamp.gte = query.from;
    if (query.to) where.timestamp.lte = query.to;
  }
  if (query.keyword) {
    where.OR = [
      { username: { contains: query.keyword, mode: 'insensitive' } },
      { account: { contains: query.keyword, mode: 'insensitive' } },
      { action: { contains: query.keyword, mode: 'insensitive' } },
      { resourceType: { contains: query.keyword, mode: 'insensitive' } },
    ];
  }

  const skip = (query.page - 1) * query.pageSize;
  const take = query.pageSize;

  const [items, total] = await Promise.all([
    auditLogModel.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    }),
    auditLogModel.count({ where }),
  ]);

  return {
    items: items.map((item: any) => ({
      ...item,
      metadata: item.metadata ? safeParseJson(item.metadata) : null,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
};

const safeParseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
