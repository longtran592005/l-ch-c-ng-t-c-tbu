// src/controllers/schedule.controller.ts
import { Request, Response } from 'express';
import * as scheduleService from '../services/schedule.service';
import { excelService } from '../services/excel.service';
import { AppError } from '../utils/errors.util';
import path from 'path';
import fs from 'fs';

/**
 * Lấy tất cả lịch công tác
 */
export const handleGetAllSchedules = async (req: Request, res: Response) => {
  const schedules = await scheduleService.getAllSchedules();
  res.status(200).json(schedules);
};

/**
 * Lấy một lịch công tác theo ID
 */
export const handleGetScheduleById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const schedule = await scheduleService.getScheduleById(id);
  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }
  res.status(200).json(schedule);
};

/**
 * Tạo lịch công tác mới
 */
export const handleCreateSchedule = async (req: Request, res: Response) => {
  // TODO: Add validation for req.body
  const newSchedule = await scheduleService.createSchedule(req.body);
  res.status(201).json(newSchedule);
};

/**
 * Cập nhật lịch công tác
 */
export const handleUpdateSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  // TODO: Add validation for req.body
  const updatedSchedule = await scheduleService.updateSchedule(id, req.body);
  res.status(200).json(updatedSchedule);
};

/**
 * Xóa lịch công tác
 */
export const handleDeleteSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  await scheduleService.deleteSchedule(id);
  res.status(204).send(); // No content
};

/**
 * Duyệt lịch công tác
 */
export const handleApproveSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  const approvedSchedule = await scheduleService.approveSchedule(id);
  res.status(200).json(approvedSchedule);
};

/**
 * Xuất lịch công tác ra file Excel — chỉ chứa 1 sheet tuần hiện tại
 */
export const handleExportSchedule = async (req: Request, res: Response) => {
  const { date } = req.query;
  const targetDate = date ? new Date(String(date)) : new Date();

  // 1. Sync data to Excel (cập nhật lichmau.xlsx gốc)
  await excelService.syncWeekToExcel(targetDate);

  // 2. Tạo file export tạm chỉ chứa 1 sheet đang xem
  const srcPath = path.join(__dirname, '../../public/lichmau.xlsx');
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ message: 'File not found' });
    return;
  }

  try {
    const ExcelJS = require('exceljs');
    const srcWorkbook = new ExcelJS.Workbook();
    await srcWorkbook.xlsx.readFile(srcPath);

    const sheetName = excelService.getSheetName(targetDate);
    const srcSheet = srcWorkbook.getWorksheet(sheetName);

    if (!srcSheet) {
      // Fallback: gửi file gốc nếu không tìm thấy sheet
      res.download(srcPath, 'LichCongTac.xlsx');
      return;
    }

    // Tạo workbook mới chỉ chứa 1 sheet
    const exportWorkbook = new ExcelJS.Workbook();
    const exportSheet = exportWorkbook.addWorksheet(sheetName);

    // Copy page setup
    exportSheet.pageSetup = Object.assign({}, srcSheet.pageSetup);

    // Copy column widths
    for (let c = 1; c <= 8; c++) {
      const srcCol = srcSheet.getColumn(c);
      exportSheet.getColumn(c).width = srcCol.width;
    }

    // Copy merged cells
    if (srcSheet.model && srcSheet.model.merges) {
      for (const merge of srcSheet.model.merges) {
        exportSheet.mergeCells(merge);
      }
    }

    // Copy rows (data + styles)
    srcSheet.eachRow({ includeEmpty: true }, (srcRow: any, rowNumber: number) => {
      const destRow = exportSheet.getRow(rowNumber);
      destRow.height = srcRow.height;
      srcRow.eachCell({ includeEmpty: true }, (srcCell: any, colNumber: number) => {
        const destCell = destRow.getCell(colNumber);
        destCell.value = srcCell.value;
        destCell.style = JSON.parse(JSON.stringify(srcCell.style || {}));
      });
    });

    // Write to temp buffer and send
    const buffer = await exportWorkbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=LichCongTac_${sheetName}.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[Export] Error creating single-sheet export:', error);
    // Fallback: gửi file gốc
    res.download(srcPath, 'LichCongTac.xlsx');
  }
};
