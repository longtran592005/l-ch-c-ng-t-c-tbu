import { Request, Response } from 'express';
import { getAuditLogs } from '../services/auditLog.service';

export const handleGetAuditLogs = async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);

  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const result = await getAuditLogs({
    page,
    pageSize,
    action: req.query.action ? String(req.query.action) : undefined,
    role: req.query.role ? String(req.query.role) : undefined,
    keyword: req.query.keyword ? String(req.query.keyword) : undefined,
    from,
    to,
  });

  res.status(200).json(result);
};
