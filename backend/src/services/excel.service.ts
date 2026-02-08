import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import prisma from '../config/database';

const FILE_PATH = path.join(__dirname, '../../public/lichmau.xlsx');

// ===========================================
// STYLE CONFIGURATION CHÍNH XÁC THEO FILE MẪU
// ===========================================

// Font sizes theo cột (từ phân tích CHÍNH XÁC file mẫu row 7)
const COLUMN_FONT_SIZES: { [key: number]: number } = {
    1: 10,  // Cột A - Ngày (mẫu: 10)
    2: 9,   // Cột B - Thời gian (mẫu: 9)
    3: 10,  // Cột C - Nội dung (mẫu: 10)
    4: 10,  // Cột D - Thành phần tham dự (mẫu: 10)
    5: 9,   // Cột E - Địa điểm (mẫu: 9)
    6: 9,   // Cột F - Lãnh đạo chủ trì (mẫu: 9)
    7: 9,   // Cột G - Đơn vị chuẩn bị (mẫu: 9)
    8: 9,   // Cột H - Đơn vị phối hợp (mẫu: 9)
};

// Alignment theo cột
const COLUMN_ALIGNMENT: { [key: number]: 'center' | 'left' } = {
    1: 'center', // Ngày
    2: 'center', // Thời gian
    3: 'left',   // Nội dung (không explicit horizontal trong mẫu)
    4: 'left',   // Thành phần
    5: 'center', // Địa điểm
    6: 'center', // Lãnh đạo
    7: 'center', // Đơn vị CB
    8: 'center', // Đơn vị PH
};

// Chiều cao dòng dữ liệu
const DATA_ROW_HEIGHT = 30;

export const excelService = {
    // Helpers
    getSheetName(date: Date): string {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        // Format: 26_01-01_02
        return `${format(start, 'dd_MM')}-${format(end, 'dd_MM')}`;
    },

    getSession(timeStr: string): string {
        if (!timeStr) return '';
        const hour = parseInt(timeStr.split(':')[0]);
        return hour < 12 ? 'Sáng' : 'Chiều';
    },

    formatDateCol(date: Date): string {
        const dayName = format(date, 'EEEE', { locale: vi });
        const dateStr = format(date, 'dd/MM');
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        return `${capitalize(dayName)}\n ngày ${dateStr}`;
    },

    /**
     * Syncs all schedules for the week of the given date to the Excel file.
     * This handles Add, Update, and Delete efficiently by rewriting the week's data.
     */
    async syncWeekToExcel(targetDate: Date) {
        console.log(`[Excel] Syncing week for date: ${targetDate}`);

        // 1. Fetch all schedules for this week from DB
        const start = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(targetDate, { weekStartsOn: 1 });     // Sunday

        const schedules = await prisma.schedule.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end,
                }
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
            // In a real scenario, we might want to throw an error or create from a base template
            return;
        }

        try {
            await workbook.xlsx.readFile(FILE_PATH);
            const sheetName = this.getSheetName(targetDate);
            let sheet = workbook.getWorksheet(sheetName);

            // 3. Prepare Sheet
            const existingSheet = workbook.getWorksheet(sheetName);
            if (existingSheet) {
                console.log(`[Excel] Removing existing sheet ${sheetName} for clean sync...`);
                workbook.removeWorksheet(existingSheet.id);
            }

            // Always clone from template
            let templateSheet = workbook.worksheets[0];
            if (workbook.getWorksheet('Template')) {
                templateSheet = workbook.getWorksheet('Template')!;
            }

            if (templateSheet) {
                console.log(`[Excel] Cloning template from ${templateSheet.name} for sheet ${sheetName}...`);

                // High-level clone approach:
                // 1. Add new sheet
                // 2. Copy dimensions, columns, merges, rows, styles from template

                sheet = workbook.addWorksheet(sheetName);

                // Copy page setup
                sheet.pageSetup = Object.assign({}, templateSheet.pageSetup);

                // Copy Columns (widths)
                if (templateSheet.columns) {
                    sheet.columns = templateSheet.columns.map(col => ({
                        header: col.header,
                        key: col.key,
                        width: col.width,
                        style: col.style
                    }));
                }

                // Copy Rows 1-6 (Header)
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
                    templateSheet.model.merges.forEach(merge => {
                        try {
                            // Validate merge range to be within header
                            // merge is typically "A1:B2" or similar
                            // We need to check if it touches any row > 6
                            // A simple heuristic: check the dimensions using sheet.getCell/range logic or regex
                            // Or, since we only really care about the header, let's just attempt strict filtering if possible.

                            // ExcelJS doesn't give easy range object from string "A1:B2".
                            // But we can parse it.
                            const [start, end] = merge.split(':');
                            if (start && end) {
                                const startRow = parseInt(start.replace(/[A-Z]/g, ''));
                                const endRow = parseInt(end.replace(/[A-Z]/g, ''));

                                if (startRow <= 6 && endRow <= 6) {
                                    sheet!.mergeCells(merge);
                                }
                            } else {
                                // Single cell or invalid?
                                const row = parseInt(merge.replace(/[A-Z]/g, ''));
                                if (row <= 6) sheet!.mergeCells(merge);
                            }
                        } catch (e) {
                            // Ignore merge conflicts
                        }
                    });
                }

                // Update Title Date Range (Row 5)
                const dateRangeStr = `(Từ ngày ${format(start, 'dd/MM/yyyy')} đến ngày ${format(end, 'dd/MM/yyyy')})`;

                sheet.eachRow((row, rowNumber) => {
                    if (rowNumber > 6) return;
                    row.eachCell((cell) => {
                        try {
                            if (cell.value && typeof cell.value === 'string' && cell.value.includes('Từ ngày')) {
                                cell.value = `LỊCH CÔNG TÁC TUẦN\n${dateRangeStr}`;
                            }
                        } catch (e) { }
                    });
                });

                // Hardcoded fix for specific template
                const row5 = sheet.getRow(5);
                row5.eachCell((cell) => {
                    if (cell.style.font && cell.style.font.color && cell.style.font.color.argb === 'FFFF0000') {
                        cell.value = dateRangeStr;
                    }
                });

            } else {
                // No template, start fresh (fallback)
                sheet = workbook.addWorksheet(sheetName);
            }

            // 4. Data starts at Row 7
            // logic below writes to currentRowIdx = 7
            // Since we recreated sheet, no need to clear old rows.

            // 5. Write Data
            let currentRowIdx = 7;
            const weekDates: Date[] = [];
            for (let i = 0; i < 7; i++) {
                weekDates.push(addDays(start, i));
            }

            for (const date of weekDates) {
                const daySchedules = schedules.filter(s =>
                    format(new Date(s.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                );

                // Sort by time: Sáng < 12, Chiều >= 12
                const morning = daySchedules.filter(s => parseInt(format(s.startTime, 'H')) < 12);
                const afternoon = daySchedules.filter(s => parseInt(format(s.startTime, 'H')) >= 12);

                const sessions = [
                    { name: 'Sáng', items: morning },
                    { name: 'Chiều', items: afternoon }
                ];

                // Determine if we need to merge the Date column (Col 1 - A)
                // Total rows for this day = sum of items in morning + afternoon.
                // If 0 items, we still add 1 row for empty day.

                let startDayRow = currentRowIdx;

                // If no schedules for the day, create one empty row
                if (morning.length === 0 && afternoon.length === 0) {
                    const row = sheet.getRow(currentRowIdx);
                    row.height = DATA_ROW_HEIGHT;

                    // Date Cell (Col A)
                    const dateCell = row.getCell(1);
                    dateCell.value = this.formatDateCol(date);
                    this.applyCellStyle(dateCell, 1, true, false);

                    // Empty cells with borders
                    for (let c = 2; c <= 8; c++) {
                        this.applyCellStyle(row.getCell(c), c, false, c === 8);
                    }

                    currentRowIdx++;
                } else {
                    for (const session of sessions) {
                        if (session.items.length === 0) {
                            // Do we show empty session? The image shows "Sáng" / "Chiều" even if empty?
                            // Usually if a day has data, we assume standard layout.
                            // But strict template: If day has Morning but no Afternoon, do we show Afternoon row?
                            // The image shows 'Sáng' and 'Chiều' separately.
                            // Let's render session if it exists. If empty but day has other data, maybe skip?
                            // Pattern in image: Day -> Morning/Afternoon.
                            // Let's iterate items.
                        }

                        // If we want to force 'Sáng' and 'Chiều' rows existence like the template seems to imply?
                        // The template has explicit rows.
                        // Let's just map existing data for now.

                        if (session.items.length > 0) {
                            let startSessionRow = currentRowIdx;
                            for (const sch of session.items) {
                                const row = sheet.getRow(currentRowIdx);
                                row.height = DATA_ROW_HEIGHT;

                                // Col 1 (A): Date (set on first row, merge later)
                                const dateCell = row.getCell(1);
                                if (currentRowIdx === startDayRow) {
                                    dateCell.value = this.formatDateCol(date);
                                } else {
                                    dateCell.value = null;
                                }
                                this.applyCellStyle(dateCell, 1, true, false);

                                // Col 2 (B): Session (Thời gian)
                                const sessCell = row.getCell(2);
                                if (currentRowIdx === startSessionRow) {
                                    sessCell.value = session.name;
                                } else {
                                    sessCell.value = null;
                                }
                                this.applyCellStyle(sessCell, 2, false, false);

                                // Col 3 (C): Content (Nội dung) - font size 11
                                const hours = format(sch.startTime, 'H');
                                const minutes = format(sch.startTime, 'mm');
                                const timeStr = `${hours}h${minutes}`;
                                const contentCell = row.getCell(3);
                                contentCell.value = `${sch.content}, từ ${timeStr}`;
                                this.applyCellStyle(contentCell, 3, false, false);

                                // Col 4 (D): Participants (Thành phần tham dự) - font size 11
                                let parts = sch.participants;
                                try { parts = JSON.parse(sch.participants); } catch (e) { }
                                if (Array.isArray(parts)) parts = parts.join(', ');
                                const partCell = row.getCell(4);
                                partCell.value = parts || null;
                                this.applyCellStyle(partCell, 4, false, false);

                                // Col 5 (E): Location (Địa điểm) - font size 10
                                const locCell = row.getCell(5);
                                locCell.value = sch.location || null;
                                this.applyCellStyle(locCell, 5, false, false);

                                // Col 6 (F): Leader (Lãnh đạo chủ trì) - font size 10
                                const leaderCell = row.getCell(6);
                                leaderCell.value = sch.leader || null;
                                this.applyCellStyle(leaderCell, 6, false, false);

                                // Col 7 (G): Preparing Unit (Đơn vị chuẩn bị) - font size 9
                                const prepCell = row.getCell(7);
                                prepCell.value = sch.preparingUnit || null;
                                this.applyCellStyle(prepCell, 7, false, false);

                                // Col 8 (H): Cooperating Units (Đơn vị phối hợp) - font size 9
                                let coop = sch.cooperatingUnits;
                                try { coop = JSON.parse(coop || '[]'); } catch (e) { }
                                if (Array.isArray(coop)) coop = coop.join(', ');
                                const coopCell = row.getCell(8);
                                coopCell.value = coop || null;
                                this.applyCellStyle(coopCell, 8, false, true);

                                // Highlight if Supplementary (Lịch bổ sung - màu vàng)
                                if (sch.isSupplementary) {
                                    for (let c = 1; c <= 8; c++) {
                                        this.applyYellowHighlight(row.getCell(c));
                                    }
                                }

                                currentRowIdx++;
                            }
                            // Merge Session (Col B)
                            if (currentRowIdx - startSessionRow > 1) {
                                sheet.mergeCells(startSessionRow, 2, currentRowIdx - 1, 2);
                            }
                        } else {
                            // Only render empty session row if NO items for the WHOLE day?
                            // Or if the day exists but this session is empty?
                            // Simplest: Just render items. If 0 items total, handled above.
                        }
                    }
                }

                // Merge Date (Col A)
                if (currentRowIdx - startDayRow > 1) {
                    sheet.mergeCells(startDayRow, 1, currentRowIdx - 1, 1);
                }
            }

            // Save
            await workbook.xlsx.writeFile(FILE_PATH);
            console.log(`[Excel] Successfully synced week ${sheetName}`);

        } catch (error) {
            console.error('[Excel] Sync Error:', error);
        }
    },

    applyCellStyle(cell: ExcelJS.Cell, colNumber: number, isFirstCol: boolean = false, isLastCol: boolean = false) {
        // Font - Times New Roman, size theo cột
        cell.font = {
            name: 'Times New Roman',
            size: COLUMN_FONT_SIZES[colNumber] || 10,
            family: 1,
        };

        // Alignment
        cell.alignment = {
            horizontal: COLUMN_ALIGNMENT[colNumber] || 'center',
            vertical: 'middle',
            wrapText: true,
        };

        // Border - theo file mẫu (cột A trái double, cột H phải double)
        cell.border = {
            left: { style: isFirstCol ? 'double' : 'thin', color: { indexed: 64 } },
            right: { style: isLastCol ? 'double' : 'thin', color: { indexed: 64 } },
            top: { style: 'thin', color: { indexed: 64 } },
            bottom: { style: 'thin', color: { indexed: 64 } },
        };

        // Fill - white background (theme 0)
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { theme: 0 },
            bgColor: { indexed: 64 },
        };
    },

    /**
     * Áp dụng màu nền vàng cho lịch bổ sung
     */
    applyYellowHighlight(cell: ExcelJS.Cell) {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' }, // Màu vàng
        };
    }
};
