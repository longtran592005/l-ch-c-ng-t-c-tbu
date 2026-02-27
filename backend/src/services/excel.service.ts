import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import prisma from '../config/database';

const FILE_PATH = path.join(__dirname, '../../public/lichmau.xlsx');

// ===========================================
// STYLE CONFIGURATION CHÍNH XÁC THEO FILE MẪU
// (Phân tích chi tiết từ sheet 29_12-04_01)
// ===========================================

// Font sizes cho DATA ROWS (row 7+) - KHÁC với header row 6
const DATA_FONT_SIZES: { [key: number]: number } = {
    1: 9,   // Cột A - Ngày (mẫu data: 9, header: 10)
    2: 9,   // Cột B - Thời gian (mẫu: 9)
    3: 11,  // Cột C - Nội dung (mẫu data: 11, header: 10) ← LỚN HƠN header
    4: 11,  // Cột D - Thành phần tham dự (mẫu data: 11, header: 10) ← LỚN HƠN header
    5: 10,  // Cột E - Địa điểm (mẫu data: 10, header: 9) ← LỚN HƠN header
    6: 10,  // Cột F - Lãnh đạo chủ trì (mẫu data: 10, header: 9) ← LỚN HƠN header
    7: 9,   // Cột G - Đơn vị chuẩn bị (mẫu: 9)
    8: 9,   // Cột H - Đơn vị phối hợp (mẫu: 9)
};

// Alignment theo cột (data rows) — chính xác từ phân tích mẫu
const DATA_ALIGNMENT: { [key: number]: Partial<ExcelJS.Alignment> } = {
    1: { horizontal: 'center', vertical: 'middle', wrapText: true },  // Ngày
    2: { horizontal: 'center', vertical: 'middle', wrapText: true },  // Thời gian
    3: { vertical: 'middle', wrapText: true },                        // Nội dung (mẫu: không set horizontal → left mặc định)
    4: { horizontal: 'left', vertical: 'middle', wrapText: true },    // Thành phần
    5: { horizontal: 'center', vertical: 'middle', wrapText: true },  // Địa điểm
    6: { horizontal: 'center', vertical: 'middle', wrapText: true },  // Lãnh đạo
    7: { horizontal: 'center', vertical: 'middle', wrapText: true },  // Đơn vị CB
    8: { horizontal: 'center', vertical: 'middle', wrapText: true },  // Đơn vị PH
};

// Column widths chính xác theo mẫu
const COLUMN_WIDTHS: { [key: number]: number } = {
    1: 9.33,   // A - Ngày
    2: 6.33,   // B - Thời gian
    3: 37.44,  // C - Nội dung
    4: 41.11,  // D - Thành phần
    5: 13.33,  // E - Địa điểm
    6: 10.66,  // F - Lãnh đạo
    7: 12.44,  // G - Đơn vị CB
    8: 12.11,  // H - Đơn vị PH
};

// Chiều cao dòng dữ liệu mặc định
const DATA_ROW_HEIGHT = 30;

// Border constants
const THIN_BORDER: ExcelJS.Border = { style: 'thin', color: { indexed: 64 } as any };
const DOUBLE_BORDER: ExcelJS.Border = { style: 'double', color: { indexed: 64 } as any };

// White fill (theme 0) — giống mẫu
const WHITE_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { theme: 0 },
    bgColor: { indexed: 64 } as any,
};

// Yellow fill cho lịch bổ sung
const YELLOW_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF00' },
    bgColor: { indexed: 64 } as any,
};

// ==========================================
// Row data interface cho việc build sheet
// ==========================================
interface RowData {
    dateLabel: string;
    session: string | null;     // 'Sáng' | 'Chiều' | null (ngày trống)
    content: string | null;
    participants: string | null;
    location: string | null;
    leader: string | null;
    preparingUnit: string | null;
    cooperatingUnits: string | null;
    isSupplementary: boolean;
    dayIndex: number;           // 0-6 (Mon-Sun)
    sessionType: 'morning' | 'afternoon' | 'none';
}

export const excelService = {
    // ==================== HELPERS ====================

    getSheetName(date: Date): string {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(start, 'dd_MM')}-${format(end, 'dd_MM')}`;
    },

    formatDateCol(date: Date): string {
        const dayName = format(date, 'EEEE', { locale: vi });
        const dateStr = format(date, 'dd/MM');
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        return `${capitalize(dayName)}\n ngày ${dateStr}`;
    },

    formatTime(startTime: Date): string {
        const hours = startTime.getUTCHours().toString();
        const minutes = startTime.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}h${minutes}`;
    },

    parseParticipants(raw: string): string {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.join(', ');
        } catch { }
        return raw || '';
    },

    parseCooperatingUnits(raw: string | null): string {
        if (!raw) return '';
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.join(', ');
        } catch { }
        return raw;
    },

    // ==================== CELL STYLING ====================

    /**
     * Áp dụng style cho 1 cell data (row 7+) — chính xác theo file mẫu.
     * Col A: left border = double
     * Col H: right border = double
     * Last row: bottom border = double (khung bảng)
     * @param isLastRow - dòng cuối bảng → bottom border double
     * @param isSupplementary - lịch bổ sung → fill vàng
     */
    applyCellStyle(
        cell: ExcelJS.Cell,
        colNumber: number,
        options: { isLastRow?: boolean; isSupplementary?: boolean } = {}
    ) {
        const { isLastRow = false, isSupplementary = false } = options;

        // Font - Times New Roman, size theo cột, KHÔNG bold
        cell.font = {
            name: 'Times New Roman',
            size: DATA_FONT_SIZES[colNumber] || 10,
        };

        // Alignment theo cột
        cell.alignment = DATA_ALIGNMENT[colNumber] || { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Border — Col A left=double, Col H right=double, last row bottom=double
        cell.border = {
            left: colNumber === 1 ? DOUBLE_BORDER : THIN_BORDER,
            right: colNumber === 8 ? DOUBLE_BORDER : THIN_BORDER,
            top: THIN_BORDER,
            bottom: isLastRow ? DOUBLE_BORDER : THIN_BORDER,
        };

        // Fill — trắng mặc định, vàng cho lịch bổ sung
        cell.fill = isSupplementary ? YELLOW_FILL : WHITE_FILL;
    },

    // ==================== HEADER BUILDER ====================

    /**
     * Tạo header rows 1-6 từ template sheet, hoặc fallback nếu không có template.
     */
    buildHeader(
        sheet: ExcelJS.Worksheet,
        templateSheet: ExcelJS.Worksheet | null,
        weekStart: Date,
        weekEnd: Date,
    ) {
        if (templateSheet) {
            // Copy Rows 1-6 (Header) từ template
            for (let i = 1; i <= 6; i++) {
                const srcRow = templateSheet.getRow(i);
                const destRow = sheet.getRow(i);
                destRow.height = srcRow.height;

                srcRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const destCell = destRow.getCell(colNumber);
                    destCell.value = cell.value;
                    destCell.style = JSON.parse(JSON.stringify(cell.style));
                });
                destRow.commit();
            }

            // Copy Merges (Header only - Rows 1-6)
            if (templateSheet.model.merges) {
                for (const merge of templateSheet.model.merges) {
                    try {
                        const parts = merge.split(':');
                        if (parts.length === 2) {
                            const startRow = parseInt(parts[0].replace(/[A-Z]/g, ''));
                            const endRow = parseInt(parts[1].replace(/[A-Z]/g, ''));
                            if (startRow <= 6 && endRow <= 6) {
                                sheet.mergeCells(merge);
                            }
                        }
                    } catch { /* ignore merge conflicts */ }
                }
            }
        } else {
            // Fallback: tạo header cơ bản
            this.buildFallbackHeader(sheet, weekStart, weekEnd);
        }

        // Update Title Date Range (Row 5)
        const dateRangeStr = `(Từ ngày ${format(weekStart, 'dd/MM/yyyy')} đến ngày ${format(weekEnd, 'dd/MM/yyyy')})`;

        // Tìm và update cell chứa "Từ ngày" trong rows 1-6
        for (let r = 1; r <= 6; r++) {
            const row = sheet.getRow(r);
            row.eachCell((cell) => {
                try {
                    if (cell.value && typeof cell.value === 'string' && cell.value.includes('Từ ngày')) {
                        cell.value = dateRangeStr;
                    }
                } catch { }
            });
        }

        // Fallback cho row 5 nếu font đỏ (template cũ)
        const row5 = sheet.getRow(5);
        row5.eachCell((cell) => {
            if (cell.style?.font?.color?.argb === 'FFFF0000') {
                cell.value = dateRangeStr;
            }
        });
    },

    buildFallbackHeader(sheet: ExcelJS.Worksheet, weekStart: Date, weekEnd: Date) {
        // Row 1: University name VN (merged A1:C1, bold, navy)
        const r1 = sheet.getRow(1);
        r1.height = 18;
        r1.getCell(1).value = 'TRƯỜNG ĐẠI HỌC THÁI BÌNH';
        r1.getCell(1).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF002060' } };
        r1.getCell(1).alignment = { horizontal: 'center' };
        r1.getCell(1).fill = WHITE_FILL;
        sheet.mergeCells('A1:C1');

        // Row 2: University name EN (merged A2:C2, navy, not bold)
        const r2 = sheet.getRow(2);
        r2.height = 18;
        r2.getCell(1).value = 'THAI BINH UNIVERSITY';
        r2.getCell(1).font = { name: 'Times New Roman', size: 11, color: { argb: 'FF002060' } };
        r2.getCell(1).alignment = { horizontal: 'center' };
        r2.getCell(1).fill = WHITE_FILL;
        sheet.mergeCells('A2:C2');

        // Row 3: Spacer
        sheet.getRow(3).height = 8.1;

        // Row 4: Title (merged A4:H4, size 14, bold, red)
        const r4 = sheet.getRow(4);
        r4.height = 18.75;
        r4.getCell(1).value = 'LỊCH CÔNG TÁC TUẦN';
        r4.getCell(1).font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFFF0000' } };
        r4.getCell(1).alignment = { horizontal: 'center' };
        r4.getCell(1).fill = WHITE_FILL;
        sheet.mergeCells('A4:H4');

        // Row 5: Date range (merged A5:H5, size 14, bold, italic, red)
        const r5 = sheet.getRow(5);
        r5.height = 20.25;
        const dateRangeStr = `(Từ ngày ${format(weekStart, 'dd/MM/yyyy')} đến ngày ${format(weekEnd, 'dd/MM/yyyy')})`;
        r5.getCell(1).value = dateRangeStr;
        r5.getCell(1).font = { name: 'Times New Roman', size: 14, bold: true, italic: true, color: { argb: 'FFFF0000' } };
        r5.getCell(1).alignment = { horizontal: 'center' };
        r5.getCell(1).fill = WHITE_FILL;
        sheet.mergeCells('A5:H5');

        // Row 6: Column headers (bold, top border double)
        const r6 = sheet.getRow(6);
        r6.height = 30;
        const headers = [
            { col: 1, text: 'Ngày', size: 10 },
            { col: 2, text: 'Thời\n gian', size: 9 },
            { col: 3, text: 'Nội dung', size: 10 },
            { col: 4, text: 'Thành phần tham dự', size: 10 },
            { col: 5, text: 'Địa điểm', size: 9 },
            { col: 6, text: 'Lãnh đạo\n chủ trì', size: 9 },
            { col: 7, text: 'Đơn vị \nchuẩn bị', size: 9 },
            { col: 8, text: 'Đơn vị/cá nhân\nphối hợp', size: 9 },
        ];
        for (const h of headers) {
            const cell = r6.getCell(h.col);
            cell.value = h.text;
            cell.font = { name: 'Times New Roman', size: h.size, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                left: h.col === 1 ? DOUBLE_BORDER : THIN_BORDER,
                right: h.col === 8 ? DOUBLE_BORDER : THIN_BORDER,
                top: DOUBLE_BORDER,    // Row 6 top = double (khung trên)
                bottom: THIN_BORDER,
            };
            cell.fill = WHITE_FILL;
        }
    },

    // ==================== MAIN SYNC ====================

    /**
     * Syncs all schedules for the week of the given date to the Excel file.
     *
     * Phương án A: Dynamic with Session Rows
     * - Ngày CÓ lịch: luôn render cả Sáng + Chiều (buổi trống → 1 dòng "Sáng"/"Chiều" trống)
     * - Ngày KHÔNG có lịch: 1 dòng trống
     * - Lịch bổ sung (isSupplementary): highlight toàn bộ dòng màu vàng
     * - Dòng cuối cùng: bottom border = double (đóng khung bảng)
     * - Font sizes, alignment, borders: chính xác theo phân tích file mẫu
     */
    async syncWeekToExcel(targetDate: Date) {
        console.log(`[Excel] Syncing week for date: ${targetDate}`);

        // 1. Fetch all schedules for this week from DB
        const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });     // Sunday

        const schedules = await prisma.schedule.findMany({
            where: {
                date: { gte: weekStart, lte: weekEnd }
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });

        // 2. Load Excel File
        const workbook = new ExcelJS.Workbook();
        if (!fs.existsSync(FILE_PATH)) {
            console.error('[Excel] File not found at:', FILE_PATH);
            return;
        }

        try {
            await workbook.xlsx.readFile(FILE_PATH);
            const sheetName = this.getSheetName(targetDate);

            // 3. Remove existing sheet if present
            const existingSheet = workbook.getWorksheet(sheetName);
            if (existingSheet) {
                console.log(`[Excel] Removing existing sheet ${sheetName} for clean sync...`);
                workbook.removeWorksheet(existingSheet.id);
            }

            // 4. Find template sheet
            const templateSheet: ExcelJS.Worksheet | null =
                workbook.getWorksheet('Template') || workbook.worksheets[0] || null;

            // 5. Create new sheet
            const sheet = workbook.addWorksheet(sheetName);

            // Copy page setup from template
            if (templateSheet) {
                sheet.pageSetup = Object.assign({}, templateSheet.pageSetup);
            } else {
                sheet.pageSetup = {
                    paperSize: 9,           // A4
                    orientation: 'landscape',
                    horizontalCentered: true,
                    fitToPage: false,
                    margins: {
                        left: 0.236, right: 0, top: 0.236, bottom: 0,
                        header: 0.315, footer: 0.315
                    }
                };
            }

            // Set column widths chính xác theo mẫu
            for (let c = 1; c <= 8; c++) {
                sheet.getColumn(c).width = COLUMN_WIDTHS[c];
            }

            // 6. Build header (rows 1-6)
            this.buildHeader(sheet, templateSheet, weekStart, weekEnd);

            // ==========================================
            // 7. Build data structure for the week
            // ==========================================
            const weekDates: Date[] = [];
            for (let i = 0; i < 7; i++) {
                weekDates.push(addDays(weekStart, i));
            }

            const allRows: RowData[] = [];

            for (let dayIdx = 0; dayIdx < weekDates.length; dayIdx++) {
                const date = weekDates[dayIdx];
                const dateLabel = this.formatDateCol(date);

                const daySchedules = schedules.filter(s =>
                    format(new Date(s.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                );

                // Phân loại Sáng / Chiều theo UTC hours (database lưu UTC)
                const morning = daySchedules.filter(s => new Date(s.startTime).getUTCHours() < 12);
                const afternoon = daySchedules.filter(s => new Date(s.startTime).getUTCHours() >= 12);

                if (morning.length === 0 && afternoon.length === 0) {
                    // Ngày không có lịch → 1 dòng trống (giống mẫu sheet 02_02-08_02)
                    allRows.push({
                        dateLabel, session: null, content: null, participants: null,
                        location: null, leader: null, preparingUnit: null, cooperatingUnits: null,
                        isSupplementary: false, dayIndex: dayIdx, sessionType: 'none',
                    });
                } else {
                    // Phương án A: Luôn render cả Sáng + Chiều cho ngày có lịch

                    // === SÁNG ===
                    if (morning.length === 0) {
                        allRows.push({
                            dateLabel, session: 'Sáng', content: null, participants: null,
                            location: null, leader: null, preparingUnit: null, cooperatingUnits: null,
                            isSupplementary: false, dayIndex: dayIdx, sessionType: 'morning',
                        });
                    } else {
                        for (const sch of morning) {
                            allRows.push({
                                dateLabel, session: 'Sáng',
                                content: `${sch.content}, từ ${this.formatTime(new Date(sch.startTime))}`,
                                participants: this.parseParticipants(sch.participants),
                                location: sch.location || null,
                                leader: sch.leader || null,
                                preparingUnit: sch.preparingUnit || null,
                                cooperatingUnits: this.parseCooperatingUnits(sch.cooperatingUnits),
                                isSupplementary: sch.isSupplementary || false,
                                dayIndex: dayIdx, sessionType: 'morning',
                            });
                        }
                    }

                    // === CHIỀU ===
                    if (afternoon.length === 0) {
                        allRows.push({
                            dateLabel, session: 'Chiều', content: null, participants: null,
                            location: null, leader: null, preparingUnit: null, cooperatingUnits: null,
                            isSupplementary: false, dayIndex: dayIdx, sessionType: 'afternoon',
                        });
                    } else {
                        for (const sch of afternoon) {
                            allRows.push({
                                dateLabel, session: 'Chiều',
                                content: `${sch.content}, từ ${this.formatTime(new Date(sch.startTime))}`,
                                participants: this.parseParticipants(sch.participants),
                                location: sch.location || null,
                                leader: sch.leader || null,
                                preparingUnit: sch.preparingUnit || null,
                                cooperatingUnits: this.parseCooperatingUnits(sch.cooperatingUnits),
                                isSupplementary: sch.isSupplementary || false,
                                dayIndex: dayIdx, sessionType: 'afternoon',
                            });
                        }
                    }
                }
            }

            // ==========================================
            // 8. Write data rows starting at row 7
            // ==========================================
            const dataStartRow = 7;
            const totalDataRows = allRows.length;

            for (let i = 0; i < totalDataRows; i++) {
                const rowIdx = dataStartRow + i;
                const data = allRows[i];
                const isLastRow = (i === totalDataRows - 1);
                const row = sheet.getRow(rowIdx);
                row.height = DATA_ROW_HEIGHT;

                const styleOpts = { isLastRow, isSupplementary: data.isSupplementary };

                // Col A (1): Date — sẽ set value trong merge logic
                const dateCell = row.getCell(1);
                dateCell.value = null;
                this.applyCellStyle(dateCell, 1, styleOpts);

                // Col B (2): Session — sẽ set value trong merge logic
                const sessCell = row.getCell(2);
                sessCell.value = null;
                this.applyCellStyle(sessCell, 2, styleOpts);

                // Col C (3): Nội dung
                const contentCell = row.getCell(3);
                contentCell.value = data.content || null;
                this.applyCellStyle(contentCell, 3, styleOpts);

                // Col D (4): Thành phần tham dự
                const partCell = row.getCell(4);
                partCell.value = data.participants || null;
                this.applyCellStyle(partCell, 4, styleOpts);

                // Col E (5): Địa điểm
                const locCell = row.getCell(5);
                locCell.value = data.location || null;
                this.applyCellStyle(locCell, 5, styleOpts);

                // Col F (6): Lãnh đạo chủ trì
                const leaderCell = row.getCell(6);
                leaderCell.value = data.leader || null;
                this.applyCellStyle(leaderCell, 6, styleOpts);

                // Col G (7): Đơn vị chuẩn bị
                const prepCell = row.getCell(7);
                prepCell.value = data.preparingUnit || null;
                this.applyCellStyle(prepCell, 7, styleOpts);

                // Col H (8): Đơn vị phối hợp
                const coopCell = row.getCell(8);
                coopCell.value = data.cooperatingUnits || null;
                this.applyCellStyle(coopCell, 8, styleOpts);
            }

            // ==========================================
            // 9. Merge cells: Date (Col A) and Session (Col B)
            // ==========================================

            // Group by dayIndex → merge Col A
            const dayGroups = new Map<number, { startIdx: number; endIdx: number }>();
            for (let i = 0; i < totalDataRows; i++) {
                const dayIdx = allRows[i].dayIndex;
                if (!dayGroups.has(dayIdx)) {
                    dayGroups.set(dayIdx, { startIdx: i, endIdx: i });
                } else {
                    dayGroups.get(dayIdx)!.endIdx = i;
                }
            }

            for (const [, group] of dayGroups) {
                const firstRowIdx = dataStartRow + group.startIdx;
                const lastRowIdx = dataStartRow + group.endIdx;

                // Set date label chỉ trên first row
                sheet.getRow(firstRowIdx).getCell(1).value = allRows[group.startIdx].dateLabel;

                // Merge nếu > 1 row
                if (lastRowIdx > firstRowIdx) {
                    sheet.mergeCells(firstRowIdx, 1, lastRowIdx, 1);
                }
            }

            // Group by dayIndex + sessionType → merge Col B
            const sessionGroups = new Map<string, { startIdx: number; endIdx: number; session: string | null }>();
            for (let i = 0; i < totalDataRows; i++) {
                const key = `${allRows[i].dayIndex}_${allRows[i].sessionType}`;
                if (!sessionGroups.has(key)) {
                    sessionGroups.set(key, { startIdx: i, endIdx: i, session: allRows[i].session });
                } else {
                    sessionGroups.get(key)!.endIdx = i;
                }
            }

            for (const [, group] of sessionGroups) {
                const firstRowIdx = dataStartRow + group.startIdx;
                const lastRowIdx = dataStartRow + group.endIdx;

                // Set session label chỉ trên first row
                sheet.getRow(firstRowIdx).getCell(2).value = group.session;

                // Merge nếu > 1 row
                if (lastRowIdx > firstRowIdx) {
                    sheet.mergeCells(firstRowIdx, 2, lastRowIdx, 2);
                }
            }

            // ==========================================
            // 10. Save
            // ==========================================
            await workbook.xlsx.writeFile(FILE_PATH);
            console.log(`[Excel] Successfully synced week ${sheetName} (${totalDataRows} data rows)`);

        } catch (error) {
            console.error('[Excel] Sync Error:', error);
        }
    },
};
