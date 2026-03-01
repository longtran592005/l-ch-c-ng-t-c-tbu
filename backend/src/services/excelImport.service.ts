/**
 * Excel Import Service
 * Parses uploaded Excel files (based on the lichmau.xlsx template) and converts
 * them into schedule records that can be saved to the database.
 *
 * Template structure:
 *   Rows 1-5: Header (university name, title, date range)
 *   Row 6: Column headers
 *   Row 7+: Data rows
 *
 * Columns:
 *   A (1): Ngày (date) — e.g. "Thứ Hai\n ngày 26/01"
 *   B (2): Thời gian (session) — "Sáng" / "Chiều"
 *   C (3): Nội dung (content) — e.g. "Họp giao ban, từ 8h00"
 *   D (4): Thành phần tham dự (participants) — comma-separated
 *   E (5): Địa điểm (location)
 *   F (6): Lãnh đạo chủ trì (leader)
 *   G (7): Đơn vị chuẩn bị (preparingUnit)
 *   H (8): Đơn vị/cá nhân phối hợp (cooperatingUnits)
 */

import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────

export interface ParsedScheduleRow {
  date: string;          // YYYY-MM-DD
  dayOfWeek: string;     // "Thứ Hai", "Thứ Ba", ...
  startTime: string;     // HH:MM (24h)
  endTime?: string;      // HH:MM (24h) or empty
  content: string;
  location: string;
  leader: string;
  participants: string[];
  preparingUnit: string;
  cooperatingUnits: string[];
  eventType?: string;
  isSupplementary: boolean;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  totalParsed: number;
  totalSkipped: number;
  schedules: ParsedScheduleRow[];
  errors: string[];
  warnings: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Get the text value of a cell, handling merged cells, rich text, etc.
 */
function getCellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) return '';

  const val = cell.value;

  // Rich text
  if (typeof val === 'object' && 'richText' in (val as any)) {
    return ((val as any).richText as Array<{ text: string }>)
      .map(r => r.text)
      .join('');
  }

  // Formula
  if (typeof val === 'object' && 'result' in (val as any)) {
    return String((val as any).result ?? '');
  }

  return String(val).trim();
}

/**
 * Detect the year from header rows (row 5 typically has date range like
 * "(Từ ngày 26/01/2025 đến ngày 01/02/2025)").
 * Returns null if unable to detect.
 */
function detectYearFromHeader(sheet: ExcelJS.Worksheet): number | null {
  for (let r = 1; r <= 6; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= 8; c++) {
      const text = getCellText(row.getCell(c));
      // Look for a pattern like dd/MM/yyyy
      const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        return parseInt(match[3], 10);
      }
    }
  }
  return null;
}

/**
 * Parse a date string from column A. Examples:
 *   "Thứ Hai\n ngày 26/01"
 *   "Thứ Ba ngày 27/01"
 *   "Chủ Nhật\n ngày 01/02"
 * Returns { dayOfWeek, day, month } or null.
 */
function parseDateLabel(text: string): { dayOfWeek: string; day: number; month: number } | null {
  if (!text) return null;

  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();

  // Try matching "Thứ ... ngày dd/MM" or "Chủ Nhật ngày dd/MM"
  const match = normalized.match(/((?:Thứ\s+\S+|Chủ\s+[Nn]hật))\s*[,.]?\s*(?:ngày\s*)?(\d{1,2})\/(\d{1,2})/i);
  if (match) {
    return {
      dayOfWeek: match[1].trim(),
      day: parseInt(match[2], 10),
      month: parseInt(match[3], 10),
    };
  }

  // Fallback: just dd/MM
  const fallback = normalized.match(/(\d{1,2})\/(\d{1,2})/);
  if (fallback) {
    return {
      dayOfWeek: '',
      day: parseInt(fallback[1], 10),
      month: parseInt(fallback[2], 10),
    };
  }

  return null;
}

/**
 * Extract time from content string. Examples:
 *   "Họp giao ban, từ 8h00" → { content: "Họp giao ban", startTime: "08:00" }
 *   "Hội nghị khoa học, từ 14h00 đến 16h30" → { content: "Hội nghị khoa học", startTime: "14:00", endTime: "16:30" }
 *   "Họp ban giám hiệu từ 8h30-11h00" → { content: "Họp ban giám hiệu", startTime: "08:30", endTime: "11:00" }
 *   "8h00 Họp giao ban" → { content: "Họp giao ban", startTime: "08:00" }
 */
function extractTimeFromContent(raw: string): { content: string; startTime: string; endTime?: string } {
  if (!raw) return { content: '', startTime: '' };

  let content = raw.trim();
  let startTime = '';
  let endTime: string | undefined;

  // Pattern 1: "..., từ Xh(XX) (đến|-)  Yh(YY)"
  const pattern1 = /[,;]?\s*từ\s+(\d{1,2})[hH:](\d{0,2})\s*(?:[-–đến\s]+(\d{1,2})[hH:](\d{0,2}))?\s*$/i;
  const m1 = content.match(pattern1);
  if (m1) {
    startTime = `${m1[1].padStart(2, '0')}:${(m1[2] || '00').padStart(2, '0')}`;
    if (m1[3]) {
      endTime = `${m1[3].padStart(2, '0')}:${(m1[4] || '00').padStart(2, '0')}`;
    }
    content = content.replace(pattern1, '').trim().replace(/[,;]\s*$/, '').trim();
    return { content, startTime, endTime };
  }

  // Pattern 2: "..., lúc Xh(XX)"
  const pattern2 = /[,;]?\s*lúc\s+(\d{1,2})[hH:](\d{0,2})\s*$/i;
  const m2 = content.match(pattern2);
  if (m2) {
    startTime = `${m2[1].padStart(2, '0')}:${(m2[2] || '00').padStart(2, '0')}`;
    content = content.replace(pattern2, '').trim().replace(/[,;]\s*$/, '').trim();
    return { content, startTime, endTime };
  }

  // Pattern 3: "Xh(XX) - Yh(YY): Nội dung" or "Xh(XX): Nội dung"
  const pattern3 = /^(\d{1,2})[hH:](\d{0,2})\s*(?:[-–]\s*(\d{1,2})[hH:](\d{0,2}))?\s*[:\-–]?\s*/;
  const m3 = content.match(pattern3);
  if (m3) {
    startTime = `${m3[1].padStart(2, '0')}:${(m3[2] || '00').padStart(2, '0')}`;
    if (m3[3]) {
      endTime = `${m3[3].padStart(2, '0')}:${(m3[4] || '00').padStart(2, '0')}`;
    }
    content = content.replace(pattern3, '').trim();
    return { content, startTime, endTime };
  }

  // Pattern 4: inline "từ Xh(XX)" anywhere in the text
  const pattern4 = /[,;]?\s*từ\s+(\d{1,2})[hH:](\d{0,2})\s*(?:[-–đến\s]+(\d{1,2})[hH:](\d{0,2}))?/i;
  const m4 = content.match(pattern4);
  if (m4) {
    startTime = `${m4[1].padStart(2, '0')}:${(m4[2] || '00').padStart(2, '0')}`;
    if (m4[3]) {
      endTime = `${m4[3].padStart(2, '0')}:${(m4[4] || '00').padStart(2, '0')}`;
    }
    content = content.replace(pattern4, '').trim().replace(/[,;]\s*$/, '').trim();
    return { content, startTime, endTime };
  }

  return { content, startTime, endTime };
}

/**
 * Determine default start time based on session.
 */
function defaultTimeForSession(session: string): string {
  const s = session.toLowerCase().trim();
  if (s.startsWith('sáng') || s.startsWith('sang') || s === 's') return '08:00';
  if (s.startsWith('chiều') || s.startsWith('chieu') || s === 'c') return '14:00';
  return '08:00';
}

/**
 * Check if a row has a yellow/supplementary highlight fill.
 */
function isRowHighlighted(row: ExcelJS.Row, colCount: number): boolean {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    if (cell.fill && (cell.fill as any).type === 'pattern' && (cell.fill as any).fgColor) {
      const fg = (cell.fill as any).fgColor;
      // Check for yellow-ish fills: FEBF00, FFFF00, FFD700, etc.
      const argb = (fg.argb || '').toUpperCase();
      if (argb.includes('FEBF00') || argb.includes('FFFF00') || argb.includes('FFD700') ||
        argb.includes('FFC000') || argb.includes('FFBF00')) {
        return true;
      }
    }
  }
  return false;
}

// ─── Main Parser ─────────────────────────────────────────────────

export async function parseExcelImport(filePath: string): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const result: ImportResult = {
    success: false,
    totalParsed: 0,
    totalSkipped: 0,
    schedules: [],
    errors: [],
    warnings: [],
  };

  // Process all sheets (skip "Template")
  const sheets = workbook.worksheets.filter(s => s.name !== 'Template');
  if (sheets.length === 0) {
    result.errors.push('Không tìm thấy sheet dữ liệu nào trong file Excel.');
    return result;
  }

  for (const sheet of sheets) {
    const sheetResult = parseSheet(sheet);
    result.schedules.push(...sheetResult.schedules);
    result.totalParsed += sheetResult.totalParsed;
    result.totalSkipped += sheetResult.totalSkipped;
    result.errors.push(...sheetResult.errors);
    result.warnings.push(...sheetResult.warnings);
  }

  result.success = result.errors.length === 0 || result.schedules.length > 0;
  return result;
}

function parseSheet(sheet: ExcelJS.Worksheet): ImportResult {
  const result: ImportResult = {
    success: false,
    totalParsed: 0,
    totalSkipped: 0,
    schedules: [],
    errors: [],
    warnings: [],
  };

  const sheetName = sheet.name;

  // Detect year from header
  const year = detectYearFromHeader(sheet) || new Date().getFullYear();

  // Find data start row (after the header row with column labels)
  // Typically row 7 (after 6 header rows)
  let dataStartRow = 7;

  // Verify by checking if row 6 looks like headers
  const headerRow = sheet.getRow(6);
  const headerA = getCellText(headerRow.getCell(1)).toLowerCase();
  const headerC = getCellText(headerRow.getCell(3)).toLowerCase();
  if (!headerA.includes('ngày') && !headerC.includes('nội dung')) {
    // Try searching for the header row
    for (let r = 1; r <= 10; r++) {
      const row = sheet.getRow(r);
      const cellA = getCellText(row.getCell(1)).toLowerCase();
      const cellC = getCellText(row.getCell(3)).toLowerCase();
      if (cellA.includes('ngày') || cellC.includes('nội dung')) {
        dataStartRow = r + 1;
        break;
      }
    }
  }

  // State tracking for merged cells
  let currentDate: { dayOfWeek: string; day: number; month: number } | null = null;
  let currentSession = '';

  const rowCount = sheet.rowCount;
  for (let r = dataStartRow; r <= rowCount; r++) {
    const row = sheet.getRow(r);

    // Read cells
    const colA = getCellText(row.getCell(1)); // Date
    const colB = getCellText(row.getCell(2)); // Session
    const colC = getCellText(row.getCell(3)); // Content
    const colD = getCellText(row.getCell(4)); // Participants
    const colE = getCellText(row.getCell(5)); // Location
    const colF = getCellText(row.getCell(6)); // Leader
    const colG = getCellText(row.getCell(7)); // Preparing unit
    const colH = getCellText(row.getCell(8)); // Cooperating units

    // Update date if column A has a value (merged cells only show value on first row)
    if (colA) {
      const parsed = parseDateLabel(colA);
      if (parsed) {
        currentDate = parsed;
      }
    }

    // Update session if column B has a value
    if (colB) {
      currentSession = colB.trim();
    }

    // Skip rows without content
    if (!colC.trim()) {
      result.totalSkipped++;
      continue;
    }

    // Skip if no date context
    if (!currentDate) {
      result.warnings.push(`Sheet "${sheetName}" dòng ${r}: Không xác định được ngày, bỏ qua.`);
      result.totalSkipped++;
      continue;
    }

    // Build date string (YYYY-MM-DD)
    const dateStr = `${year}-${String(currentDate.month).padStart(2, '0')}-${String(currentDate.day).padStart(2, '0')}`;

    // Determine dayOfWeek
    let dayOfWeek = currentDate.dayOfWeek;
    if (!dayOfWeek) {
      try {
        const d = new Date(dateStr);
        dayOfWeek = format(d, 'EEEE', { locale: vi });
        dayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
      } catch {
        dayOfWeek = '';
      }
    }

    // Extract time from content
    const { content, startTime, endTime } = extractTimeFromContent(colC);

    // If no time found, use session default
    const finalStartTime = startTime || defaultTimeForSession(currentSession);

    // Parse participants
    const participants = colD
      ? colD.split(/[,;]/).map(p => p.trim()).filter(Boolean)
      : [];

    // Parse cooperating units
    const cooperatingUnits = colH
      ? colH.split(/[,;]/).map(u => u.trim()).filter(Boolean)
      : [];

    // Check for supplementary highlight
    const isSupplementary = isRowHighlighted(row, 8);

    const scheduleRow: ParsedScheduleRow = {
      date: dateStr,
      dayOfWeek,
      startTime: finalStartTime,
      endTime: endTime || undefined,
      content: content || colC.trim(),
      location: colE || '',
      leader: colF || '',
      participants,
      preparingUnit: colG || '',
      cooperatingUnits,
      isSupplementary,
    };

    result.schedules.push(scheduleRow);
    result.totalParsed++;
  }

  result.success = result.schedules.length > 0;
  return result;
}

export const excelImportService = {
  parseExcelImport,
};
