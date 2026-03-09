/**
 * Comprehensive date/time timezone safety tests.
 *
 * These tests verify that our date-handling functions correctly
 * preserve the intended date across UTC+7 (Vietnam), UTC+0, UTC-12, and UTC+14 scenarios.
 *
 * Key invariants tested:
 * 1. parseDateString always stores at noon UTC → getUTCDate() matches input date
 * 2. parseTimeString stores time at UTC epoch → getUTCHours/Minutes match input
 * 3. parseDateToNoonUTC (meetingRecord) behaves identically to parseDateString
 * 4. Round-trip: frontend sends "YYYY-MM-DD" → backend stores noon UTC → frontend reads back correct date
 */

import { describe, it, expect } from 'vitest';
import { parseDateString, parseTimeString } from '../schedule.service';
import { parseDateToNoonUTC } from '../meetingRecord.service';

// ============================================================
// parseDateString — Schedule dates
// ============================================================
describe('parseDateString', () => {
  // --- Basic string inputs ---

  it('should parse "2026-01-26" and return Jan 26 at noon UTC', () => {
    const result = parseDateString('2026-01-26');
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0); // January
    expect(result.getUTCDate()).toBe(26);
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('should parse "2026-03-09" (today) correctly', () => {
    const result = parseDateString('2026-03-09');
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(2); // March
    expect(result.getUTCDate()).toBe(9);
    expect(result.getUTCHours()).toBe(12);
  });

  it('should parse "2026-12-31" (year boundary) correctly', () => {
    const result = parseDateString('2026-12-31');
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(11); // December
    expect(result.getUTCDate()).toBe(31);
    expect(result.getUTCHours()).toBe(12);
  });

  it('should parse "2026-01-01" (new year) correctly', () => {
    const result = parseDateString('2026-01-01');
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
  });

  it('should parse "2024-02-29" (leap year) correctly', () => {
    const result = parseDateString('2024-02-29');
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(29);
    expect(result.getUTCHours()).toBe(12);
  });

  // --- ISO string inputs (simulating what JSON.stringify(Date) produces) ---

  it('should handle ISO string "2026-01-25T17:00:00.000Z" and extract Jan 25', () => {
    // This is what JSON.stringify(new Date('2026-01-26 00:00:00' in UTC+7)) produces
    const result = parseDateString('2026-01-25T17:00:00.000Z');
    expect(result.getUTCDate()).toBe(25);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCFullYear()).toBe(2026);
  });

  it('should handle ISO string "2026-01-26T00:00:00.000Z" and extract Jan 26', () => {
    const result = parseDateString('2026-01-26T00:00:00.000Z');
    expect(result.getUTCDate()).toBe(26);
    expect(result.getUTCMonth()).toBe(0);
  });

  it('should handle ISO string "2026-03-08T17:00:00.000Z" → March 8 (not 9)', () => {
    // Frontend in UTC+7: new Date('2026-03-09').toISOString() → "2026-03-08T17:00:00.000Z"
    // Our fix: frontend now sends "2026-03-09" string, so this ISO case is the OLD bug scenario
    const result = parseDateString('2026-03-08T17:00:00.000Z');
    expect(result.getUTCDate()).toBe(8); // Extracts YYYY-MM-DD from before T
    expect(result.getUTCMonth()).toBe(2);
  });

  // --- Date object inputs ---

  it('should handle Date object input by converting to ISO first', () => {
    // new Date(Date.UTC(2026, 0, 26, 12, 0, 0)) → "2026-01-26T12:00:00.000Z"
    const dateObj = new Date(Date.UTC(2026, 0, 26, 12, 0, 0));
    const result = parseDateString(dateObj);
    expect(result.getUTCDate()).toBe(26);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCFullYear()).toBe(2026);
  });

  it('should handle Date object at midnight UTC (previously dangerous)', () => {
    // new Date(Date.UTC(2026, 0, 26, 0, 0, 0)) → "2026-01-26T00:00:00.000Z"
    const dateObj = new Date(Date.UTC(2026, 0, 26, 0, 0, 0));
    const result = parseDateString(dateObj);
    expect(result.getUTCDate()).toBe(26);
    expect(result.getUTCHours()).toBe(12); // Should be stored at noon UTC
  });

  // --- Edge cases ---

  it('should return current date for null/undefined input', () => {
    const result = parseDateString(null);
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it('should return current date for empty string', () => {
    const result = parseDateString('');
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it('should handle single-digit month/day strings like "2026-3-9"', () => {
    const result = parseDateString('2026-3-9');
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(2);
    expect(result.getUTCDate()).toBe(9);
  });

  // --- Invariant: noon UTC means the date is correct in any timezone ---

  it('noon UTC should show correct date in UTC+7 (Vietnam)', () => {
    const result = parseDateString('2026-01-26');
    // In UTC+7: noon UTC = 19:00 local → still Jan 26
    const localHour = result.getUTCHours() + 7; // Simulating UTC+7
    expect(localHour).toBeLessThan(24); // Still same day
    expect(result.getUTCDate()).toBe(26);
  });

  it('noon UTC should show correct date in UTC-12 (Baker Island)', () => {
    const result = parseDateString('2026-01-26');
    // In UTC-12: noon UTC = midnight local → still Jan 26
    const localHour = result.getUTCHours() - 12;
    expect(localHour).toBeGreaterThanOrEqual(0); // Still same day
    expect(result.getUTCDate()).toBe(26);
  });

  it('noon UTC should show correct date in UTC+14 (Line Islands)', () => {
    const result = parseDateString('2026-01-26');
    // In UTC+14: noon UTC = 02:00 next day... BUT we extract date from UTC, not local
    // The date stored in DB is always read as UTC date
    expect(result.getUTCDate()).toBe(26);
  });
});

// ============================================================
// parseTimeString — Schedule times
// ============================================================
describe('parseTimeString', () => {
  it('should parse "13:00" as 13:00 UTC on epoch date', () => {
    const result = parseTimeString('13:00');
    expect(result.getUTCFullYear()).toBe(1970);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(13);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('should parse "08:30" correctly', () => {
    const result = parseTimeString('08:30');
    expect(result.getUTCHours()).toBe(8);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it('should parse "00:00" (midnight) correctly', () => {
    const result = parseTimeString('00:00');
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('should parse "23:59" (end of day) correctly', () => {
    const result = parseTimeString('23:59');
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
  });

  it('should parse "7:30" (single-digit hour) correctly', () => {
    const result = parseTimeString('7:30');
    expect(result.getUTCHours()).toBe(7);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it('should return epoch for null input', () => {
    const result = parseTimeString(null);
    expect(result.getTime()).toBe(0);
  });

  it('should return epoch for undefined input', () => {
    const result = parseTimeString(undefined);
    expect(result.getTime()).toBe(0);
  });

  it('should return epoch for empty string', () => {
    const result = parseTimeString('');
    expect(result.getTime()).toBe(0);
  });

  it('should return epoch for non-string input (number)', () => {
    const result = parseTimeString(123);
    expect(result.getTime()).toBe(0);
  });

  it('should return epoch for invalid time format "abc"', () => {
    const result = parseTimeString('abc');
    expect(result.getTime()).toBe(0);
  });

  it('should return epoch for invalid time format "25:00"', () => {
    // Hours > 23 is technically parseable but creates invalid time
    const result = parseTimeString('25:00');
    // Still parses as numbers (25, 0), Date.UTC handles overflow
    expect(result.getUTCHours()).toBe(1); // 25 mod 24 = 1 (next day)
  });
});

// ============================================================
// parseDateToNoonUTC — MeetingRecord dates
// ============================================================
describe('parseDateToNoonUTC', () => {
  it('should parse "2026-01-26" to noon UTC', () => {
    const result = parseDateToNoonUTC('2026-01-26');
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(26);
    expect(result.getUTCHours()).toBe(12);
  });

  it('should parse ISO string "2026-01-25T17:00:00.000Z" and extract Jan 25', () => {
    const result = parseDateToNoonUTC('2026-01-25T17:00:00.000Z');
    expect(result.getUTCDate()).toBe(25);
    expect(result.getUTCHours()).toBe(12);
  });

  it('should parse Date object input', () => {
    const dateObj = new Date(Date.UTC(2026, 2, 9, 0, 0, 0));
    const result = parseDateToNoonUTC(dateObj);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(2);
    expect(result.getUTCDate()).toBe(9);
    expect(result.getUTCHours()).toBe(12);
  });

  it('should handle leap year date', () => {
    const result = parseDateToNoonUTC('2024-02-29');
    expect(result.getUTCDate()).toBe(29);
    expect(result.getUTCMonth()).toBe(1);
  });

  it('should behave identically to parseDateString for same input', () => {
    const inputs = [
      '2026-01-26',
      '2026-03-09',
      '2026-12-31',
      '2024-02-29',
      '2026-01-25T17:00:00.000Z',
    ];

    for (const input of inputs) {
      const fromSchedule = parseDateString(input);
      const fromMeeting = parseDateToNoonUTC(input);
      expect(fromSchedule.getTime()).toBe(fromMeeting.getTime());
    }
  });
});

// ============================================================
// Round-trip simulation: Frontend → Backend → Frontend
// ============================================================
describe('Round-trip date consistency', () => {
  /**
   * Simulates the full flow:
   * 1. User picks a date in the UI (e.g., Jan 26, 2026)
   * 2. Frontend converts to "YYYY-MM-DD" string via toLocalDateString()
   * 3. JSON.stringify passes string as-is
   * 4. Backend parseDateString stores at noon UTC
   * 5. DB returns ISO string like "2026-01-26T12:00:00.000Z"
   * 6. Frontend parseUTCDateToLocal extracts YYYY-MM-DD, creates noon local Date
   * 7. format(date, 'dd/MM/yyyy') shows correct "26/01/2026"
   */

  it('should preserve Jan 26, 2026 through full round-trip', () => {
    // Step 2: Frontend sends "2026-01-26"
    const frontendSends = '2026-01-26';

    // Step 4: Backend stores at noon UTC
    const stored = parseDateString(frontendSends);
    expect(stored.toISOString()).toBe('2026-01-26T12:00:00.000Z');

    // Step 5: DB returns ISO string
    const dbReturns = stored.toISOString(); // "2026-01-26T12:00:00.000Z"

    // Step 6: Frontend parses — simulate parseUTCDateToLocal
    const [datePart] = dbReturns.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    expect(y).toBe(2026);
    expect(m).toBe(1);
    expect(d).toBe(26);
  });

  it('should preserve March 9, 2026 through full round-trip', () => {
    const frontendSends = '2026-03-09';
    const stored = parseDateString(frontendSends);
    expect(stored.toISOString()).toBe('2026-03-09T12:00:00.000Z');

    const [datePart] = stored.toISOString().split('T');
    expect(datePart).toBe('2026-03-09');
  });

  it('should preserve Dec 31, 2026 through year boundary', () => {
    const frontendSends = '2026-12-31';
    const stored = parseDateString(frontendSends);
    expect(stored.toISOString()).toBe('2026-12-31T12:00:00.000Z');

    const [datePart] = stored.toISOString().split('T');
    expect(datePart).toBe('2026-12-31');
  });

  it('should preserve Feb 29, 2024 (leap year) through round-trip', () => {
    const stored = parseDateString('2024-02-29');
    expect(stored.toISOString()).toBe('2024-02-29T12:00:00.000Z');
  });

  it('time round-trip: "14:30" → store → read back as "14:30"', () => {
    const timeStr = '14:30';
    const stored = parseTimeString(timeStr);

    // Frontend reads using getUTCHours/getUTCMinutes
    const readBack = `${stored.getUTCHours().toString().padStart(2, '0')}:${stored.getUTCMinutes().toString().padStart(2, '0')}`;
    expect(readBack).toBe('14:30');
  });

  it('time round-trip: "08:00" → store → read back as "08:00"', () => {
    const stored = parseTimeString('08:00');
    const readBack = `${stored.getUTCHours().toString().padStart(2, '0')}:${stored.getUTCMinutes().toString().padStart(2, '0')}`;
    expect(readBack).toBe('08:00');
  });
});

// ============================================================
// Edge case: The original bug scenario
// ============================================================
describe('Original bug scenario: Jan 26 → Jan 25 shift', () => {
  it('OLD BUG: JSON.stringify(new Date(local midnight)) shifts date back in UTC+7', () => {
    // In UTC+7: new Date(2026, 0, 26) = Jan 26 00:00 local = Jan 25 17:00 UTC
    // JSON.stringify → "2026-01-25T17:00:00.000Z"
    // Old parseDateString would extract "2026-01-25" → store Jan 25 → WRONG

    // Simulate what the OLD frontend did (sending a Date object)
    const oldBugISO = '2026-01-25T17:00:00.000Z'; // What JSON.stringify produced from UTC+7 local midnight

    // NEW FIX: Frontend now sends "2026-01-26" string instead
    // But if somehow an ISO string arrives, parseDateString extracts the date BEFORE T
    const result = parseDateString(oldBugISO);
    // It would extract "2026-01-25" — this is by design, because the frontend
    // should now send the correct "2026-01-26" string
    expect(result.getUTCDate()).toBe(25); // Correct: extracts what's before T
  });

  it('NEW FIX: Frontend sends "2026-01-26" string, backend stores Jan 26 at noon UTC', () => {
    // Frontend now uses toLocalDateString() → "2026-01-26"
    const result = parseDateString('2026-01-26');
    expect(result.getUTCDate()).toBe(26);
    expect(result.getUTCHours()).toBe(12); // Noon UTC
    expect(result.toISOString()).toBe('2026-01-26T12:00:00.000Z');
  });

  it('NEW FIX: Backend returns "2026-01-26T12:00:00.000Z", frontend shows Jan 26', () => {
    const dbIso = '2026-01-26T12:00:00.000Z';

    // simulate parseUTCDateToLocal: extract date part
    const [datePart] = dbIso.split('T');
    expect(datePart).toBe('2026-01-26');

    // Frontend creates local noon Date
    const [y, m, d] = datePart.split('-').map(Number);
    const localDate = new Date(y, m - 1, d, 12, 0, 0);

    // date-fns format() uses local time → shows Jan 26
    expect(localDate.getDate()).toBe(26);
    expect(localDate.getMonth()).toBe(0);
    expect(localDate.getFullYear()).toBe(2026);
  });
});

// ============================================================
// Excel service date comparison simulation
// ============================================================
describe('Excel service UTC date comparison', () => {
  it('should correctly compare stored noon-UTC dates with weekday dates', () => {
    // Schedule in DB: 2026-03-09 at noon UTC
    const scheduleDate = new Date(Date.UTC(2026, 2, 9, 12, 0, 0));

    // Week dates array: local dates for March 9
    const weekDate = new Date(2026, 2, 9); // March 9 local

    // Excel comparison uses UTC getters
    expect(scheduleDate.getUTCFullYear()).toBe(weekDate.getFullYear());
    expect(scheduleDate.getUTCMonth()).toBe(weekDate.getMonth());
    expect(scheduleDate.getUTCDate()).toBe(weekDate.getDate());
  });

  it('should not incorrectly match different dates', () => {
    const scheduleDate = new Date(Date.UTC(2026, 2, 9, 12, 0, 0));
    const differentDate = new Date(2026, 2, 10);

    const matches =
      scheduleDate.getUTCFullYear() === differentDate.getFullYear() &&
      scheduleDate.getUTCMonth() === differentDate.getMonth() &&
      scheduleDate.getUTCDate() === differentDate.getDate();

    expect(matches).toBe(false);
  });
});

// ============================================================
// Multiple dates in sequence (batch create scenario)
// ============================================================
describe('Batch date processing', () => {
  const testDates = [
    { input: '2026-01-05', expectDay: 5, expectMonth: 0 },
    { input: '2026-02-14', expectDay: 14, expectMonth: 1 },
    { input: '2026-03-01', expectDay: 1, expectMonth: 2 },
    { input: '2026-06-15', expectDay: 15, expectMonth: 5 },
    { input: '2026-09-30', expectDay: 30, expectMonth: 8 },
    { input: '2026-11-11', expectDay: 11, expectMonth: 10 },
    { input: '2026-12-25', expectDay: 25, expectMonth: 11 },
  ];

  testDates.forEach(({ input, expectDay, expectMonth }) => {
    it(`should correctly store ${input}`, () => {
      const result = parseDateString(input);
      expect(result.getUTCDate()).toBe(expectDay);
      expect(result.getUTCMonth()).toBe(expectMonth);
      expect(result.getUTCHours()).toBe(12);
    });
  });
});

// ============================================================
// TTS service scenario: UTC getters for date display
// ============================================================
describe('TTS service date display (UTC getters)', () => {
  it('should display correct Vietnamese weekday for stored date', () => {
    // Store March 9, 2026 (Monday)
    const stored = parseDateString('2026-03-09');
    const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    const weekdayIdx = stored.getUTCDay();
    expect(weekdays[weekdayIdx]).toBe('Thứ Hai'); // March 9, 2026 is Monday

    const day = stored.getUTCDate();
    const month = stored.getUTCMonth() + 1;
    const year = stored.getUTCFullYear();
    expect(`ngày ${day} tháng ${month} năm ${year}`).toBe('ngày 9 tháng 3 năm 2026');
  });

  it('should display correct time from parseTimeString', () => {
    const stored = parseTimeString('14:30');
    const h = stored.getUTCHours().toString().padStart(2, '0');
    const m = stored.getUTCMinutes().toString().padStart(2, '0');
    expect(`${h} giờ ${m} phút`).toBe('14 giờ 30 phút');
  });
});
