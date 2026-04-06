import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as scheduleController from '../controllers/schedule.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate, requireManageSchedule } from '../middleware/auth.middleware';

const scheduleRouter = Router();

// ─── Multer config for Excel file upload ─────────────────────────
const EXCEL_UPLOAD_DIR = './uploads/temp';
if (!fs.existsSync(EXCEL_UPLOAD_DIR)) {
  fs.mkdirSync(EXCEL_UPLOAD_DIR, { recursive: true });
}

const excelStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, EXCEL_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `import-${uniqueSuffix}${ext}`);
  },
});

const uploadExcel = multer({
  storage: excelStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'));
    }
  },
});

// Public routes
scheduleRouter.get('/schedules', asyncHandler(scheduleController.handleGetAllSchedules));
scheduleRouter.get('/schedules/export', asyncHandler(scheduleController.handleExportSchedule)); // Public or Protected? Let's make it public for now or same as get all.
scheduleRouter.get('/schedules/:id', asyncHandler(scheduleController.handleGetScheduleById));

// Protected routes (require login and manage permission)
scheduleRouter.post('/schedules', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleCreateSchedule));
scheduleRouter.post('/schedules/check-conflict', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleCheckScheduleConflict));
scheduleRouter.post('/schedules/import', authenticate, requireManageSchedule, uploadExcel.single('file'), asyncHandler(scheduleController.handleImportSchedule));
scheduleRouter.put('/schedules/:id', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleUpdateSchedule));
scheduleRouter.delete('/schedules/:id', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleDeleteSchedule));
scheduleRouter.post('/schedules/:id/approve', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleApproveSchedule));

export default scheduleRouter;
