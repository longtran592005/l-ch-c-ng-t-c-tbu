import { Router } from 'express';
import * as auditLogController from '../controllers/auditLog.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const auditLogRouter = Router();

auditLogRouter.get('/audit-logs', authenticate, requireRole('admin'), asyncHandler(auditLogController.handleGetAuditLogs));

export default auditLogRouter;
