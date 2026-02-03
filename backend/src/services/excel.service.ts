
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import prisma from '../config/database'; // Import Prisma to fetch data

const FILE_PATH = path.join(__dirname, '../../public/lichmau.xlsx');

export const excelService = {
    // Helpers
    getSheetName(date: Date): string {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
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

        // Adjust end date to include the full day (23:59:59) if needed, 
        // but Prisma logic typically works with Date objects. 
        // Let's rely on Prisma string comparison or Date objects.
        // Ideally use YYYY-MM-DD string for comparison to avoid timezone mess,
        // or use Date objects carefully.

        const schedules = await prisma.schedule.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end,
                },
                // status: 'approved' // Uncomment if only approved schedules should be in Excel
                // For now, dumping all schedules (or filters as needed)
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
            // In production, maybe copy from a template string if missing?
        }

        try {
            await workbook.xlsx.readFile(FILE_PATH);
            const sheetName = this.getSheetName(targetDate);
            let sheet = workbook.getWorksheet(sheetName);

            // 3. Prepare Sheet
            if (!sheet) {
                if (workbook.worksheets.length > 0) {
                    console.log(`[Excel] Cloning template for sheet ${sheetName}...`);
                    const template = workbook.worksheets[0];

                    sheet = workbook.addWorksheet(sheetName);

                    // 3.1 Copy Page Setup
                    sheet.pageSetup = Object.assign({}, template.pageSetup); // Shallow copy is enough for config objects

                    // 3.2 Copy Columns
                    if (template.columns) {
                        sheet.columns = template.columns.map(col => ({ width: col.width, style: col.style }));
                    }

                    // 3.3 Copy Header Rows (1-6)
                    for (let i = 1; i <= 6; i++) {
                        const row = template.getRow(i);
                        const newRow = sheet.getRow(i);
                        newRow.height = row.height;
                        newRow.style = row.style; // Copy row style

                        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                            const newCell = newRow.getCell(colNumber);
                            newCell.value = cell.value;
                            newCell.style = JSON.parse(JSON.stringify(cell.style));
                        });
                    }

                    // 3.4 Copy Merges (Header only)
                    const model = (template as any).model;
                    if (model && model.merges) {
                        model.merges.forEach((merge: string) => {
                            // Simple heuristic: only copy merges that touch top rows
                            // But for now, copying all is safer for header structure, 
                            // and we will be careful not to create conflicting merges in data area.
                            sheet.mergeCells(merge);
                        });
                    }

                    // 3.5 Update Date Range Text
                    // Usually merged A5:H5. We access the top-left cell of the merge or just A5.
                    const dateRangeCell = sheet.getCell('A5');
                    dateRangeCell.value = `(Từ ngày ${format(start, 'dd/MM/yyyy')} đến ngày ${format(end, 'dd/MM/yyyy')})`;

                } else {
                    sheet = workbook.addWorksheet(sheetName);
                }
            }


            // 4. Clear old data rows (from row 7 onwards)
            // Be careful not to delete unlimited rows.
            const rowCount = sheet.rowCount;
            if (rowCount >= 7) {
                // Clear value and styles from row 7 to end
                for (let i = 7; i <= rowCount + 10; i++) { // +10 buffer
                    const row = sheet.getRow(i);
                    row.values = [];
                    row.style = {};
                }
            }

            // 5. Write new data logic
            let currentRowIdx = 7;

            // Generate array of dates for the week (Monday to Sunday)
            const weekDates: Date[] = [];
            for (let i = 0; i < 7; i++) {
                weekDates.push(addDays(start, i));
            }

            for (const date of weekDates) {
                const daySchedules = schedules.filter(s =>
                    format(new Date(s.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                );

                // Start row of this day
                const startDayRow = currentRowIdx;

                if (daySchedules.length === 0) {
                    // Render empty day row
                    const row = sheet.getRow(currentRowIdx);
                    row.getCell(2).value = this.formatDateCol(date);
                    row.getCell(2).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
                    // Empty content cells with borders
                    for (let c = 2; c <= 9; c++) {
                        row.getCell(c).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                    currentRowIdx++;
                } else {
                    // Group by Session: Sáng (<12), Chiều (>=12)
                    const morning = daySchedules.filter(s => {
                        const h = parseInt(format(s.startTime, 'H'));
                        return h < 12;
                    });
                    const afternoon = daySchedules.filter(s => {
                        const h = parseInt(format(s.startTime, 'H'));
                        return h >= 12;
                    });

                    const sessions = [
                        { name: 'Sáng', items: morning },
                        { name: 'Chiều', items: afternoon }
                    ].filter(g => g.items.length > 0);

                    for (const group of sessions) {
                        const startSessionRow = currentRowIdx;

                        for (const sch of group.items) {
                            const row = sheet.getRow(currentRowIdx);

                            // Date col (will merge later)
                            row.getCell(2).value = this.formatDateCol(date);
                            row.getCell(2).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

                            // Time col: Should be just "Sáng" or "Chiều"
                            row.getCell(3).value = group.name;
                            row.getCell(3).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

                            // Content: Append specific time
                            const timeStr = format(sch.startTime, 'HH:mm');
                            // Format: "Content, từ HH:mm"
                            const contentWithTime = `${sch.content.trim().replace(/[.,;]+$/, '')}, từ ${timeStr}`;

                            row.getCell(4).value = contentWithTime;
                            row.getCell(4).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };

                            // Participants
                            let parts = sch.participants;
                            try { parts = JSON.parse(sch.participants); } catch (e) { }
                            if (Array.isArray(parts)) parts = parts.join(', ');
                            row.getCell(5).value = parts;
                            row.getCell(5).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };

                            // Location
                            row.getCell(6).value = sch.location;
                            row.getCell(6).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

                            // Leader
                            row.getCell(7).value = sch.leader;
                            row.getCell(7).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

                            // Unit
                            row.getCell(8).value = sch.preparingUnit;
                            row.getCell(8).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

                            // Coop
                            let coop = sch.cooperatingUnits;
                            try { coop = JSON.parse(coop || '[]'); } catch (e) { }
                            if (Array.isArray(coop)) coop = coop.join(', ');
                            row.getCell(9).value = coop;
                            row.getCell(9).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

                            // Borders and Highlight
                            for (let c = 2; c <= 9; c++) {
                                const cell = row.getCell(c);
                                cell.border = {
                                    top: { style: 'thin' },
                                    left: { style: 'thin' },
                                    bottom: { style: 'thin' },
                                    right: { style: 'thin' }
                                };
                                if (sch.isSupplementary) {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFFFFF00' } // Yellow
                                    };
                                }
                            }

                            currentRowIdx++;
                        }

                        // Merge Session Column (Col 3)
                        if (currentRowIdx - startSessionRow > 1) {
                            sheet.mergeCells(startSessionRow, 3, currentRowIdx - 1, 3);
                        }
                    }

                    // Merge Date Column (Col 2)
                    if (currentRowIdx - startDayRow > 1) {
                        sheet.mergeCells(startDayRow, 2, currentRowIdx - 1, 2);
                    }
                }
            }

            await workbook.xlsx.writeFile(FILE_PATH);
            console.log(`[Excel] Successfully synced week ${sheetName}`);

        } catch (error) {
            console.error('[Excel] Sync Error:', error);
        }
    }
};
