/**
 * Frontend date utility tests — run with: node --experimental-vm-modules src/__tests__/datetime-frontend.test.mjs
 * 
 * Tests toLocalDateString() and parseUTCDateToLocal() logic without requiring vitest in frontend.
 * These are pure functions that don't depend on React or the DOM.
 */

// Re-implement the functions here since we can't import from .ts directly
function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseUTCDateToLocal(value) {
  const str = typeof value === 'string' ? value : value.toISOString();
  const [datePart] = str.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeInstanceOf(cls) {
      if (!(actual instanceof cls)) {
        throw new Error(`Expected instance of ${cls.name}`);
      }
    }
  };
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ============================================================
// toLocalDateString tests
// ============================================================
describe('toLocalDateString', () => {
  test('should convert Jan 26 2026 local midnight to "2026-01-26"', () => {
    const date = new Date(2026, 0, 26, 0, 0, 0); // Local midnight
    expect(toLocalDateString(date)).toBe('2026-01-26');
  });

  test('should convert Jan 26 2026 at 23:59 local to "2026-01-26"', () => {
    const date = new Date(2026, 0, 26, 23, 59, 59);
    expect(toLocalDateString(date)).toBe('2026-01-26');
  });

  test('should convert March 9, 2026 to "2026-03-09"', () => {
    const date = new Date(2026, 2, 9);
    expect(toLocalDateString(date)).toBe('2026-03-09');
  });

  test('should convert Dec 31, 2026 to "2026-12-31"', () => {
    const date = new Date(2026, 11, 31);
    expect(toLocalDateString(date)).toBe('2026-12-31');
  });

  test('should convert Jan 1, 2026 to "2026-01-01"', () => {
    const date = new Date(2026, 0, 1);
    expect(toLocalDateString(date)).toBe('2026-01-01');
  });

  test('should convert Feb 29, 2024 (leap year) to "2024-02-29"', () => {
    const date = new Date(2024, 1, 29);
    expect(toLocalDateString(date)).toBe('2024-02-29');
  });

  test('should pad single-digit months: Mar 5 → "2026-03-05"', () => {
    const date = new Date(2026, 2, 5);
    expect(toLocalDateString(date)).toBe('2026-03-05');
  });

  test('should NOT shift date despite timezone (the whole point of this function)', () => {
    // Create a date at local midnight
    const localMidnight = new Date(2026, 0, 26, 0, 0, 0);
    // toLocalDateString uses getFullYear/getMonth/getDate which are LOCAL
    // So it should always return "2026-01-26" regardless of timezone
    expect(toLocalDateString(localMidnight)).toBe('2026-01-26');
  });

  test('should handle noon local time', () => {
    const date = new Date(2026, 0, 26, 12, 0, 0);
    expect(toLocalDateString(date)).toBe('2026-01-26');
  });
});

// ============================================================
// parseUTCDateToLocal tests
// ============================================================
describe('parseUTCDateToLocal', () => {
  test('should parse "2026-01-26T12:00:00.000Z" → local Jan 26 at noon', () => {
    const result = parseUTCDateToLocal('2026-01-26T12:00:00.000Z');
    expect(result.getDate()).toBe(26);
    expect(result.getMonth()).toBe(0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getHours()).toBe(12);
  });

  test('should parse "2026-01-26T00:00:00.000Z" → local Jan 26 at noon', () => {
    const result = parseUTCDateToLocal('2026-01-26T00:00:00.000Z');
    expect(result.getDate()).toBe(26);
    expect(result.getMonth()).toBe(0);
    expect(result.getHours()).toBe(12);
  });

  test('should parse "2026-01-25T17:00:00.000Z" → local Jan 25 at noon', () => {
    // This is the OLD bug ISO string — parseUTCDateToLocal correctly extracts Jan 25
    // The fix is that the frontend now sends "2026-01-26" to backend, 
    // so backend stores "2026-01-26T12:00:00.000Z", not this string
    const result = parseUTCDateToLocal('2026-01-25T17:00:00.000Z');
    expect(result.getDate()).toBe(25);
    expect(result.getMonth()).toBe(0);
  });

  test('should parse plain date string "2026-03-09"', () => {
    const result = parseUTCDateToLocal('2026-03-09');
    expect(result.getDate()).toBe(9);
    expect(result.getMonth()).toBe(2);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getHours()).toBe(12);
  });

  test('should parse "2026-12-31T12:00:00.000Z" → Dec 31', () => {
    const result = parseUTCDateToLocal('2026-12-31T12:00:00.000Z');
    expect(result.getDate()).toBe(31);
    expect(result.getMonth()).toBe(11);
  });

  test('should parse "2024-02-29T12:00:00.000Z" → Feb 29 (leap year)', () => {
    const result = parseUTCDateToLocal('2024-02-29T12:00:00.000Z');
    expect(result.getDate()).toBe(29);
    expect(result.getMonth()).toBe(1);
  });

  test('should parse Date object input', () => {
    const dateObj = new Date(Date.UTC(2026, 2, 9, 12, 0, 0));
    const result = parseUTCDateToLocal(dateObj);
    expect(result.getDate()).toBe(9);
    expect(result.getMonth()).toBe(2);
    expect(result.getFullYear()).toBe(2026);
  });

  test('result at noon local should always show correct date with date-fns format()', () => {
    // date-fns format uses local getters, so noon local = always correct day
    const result = parseUTCDateToLocal('2026-01-26T12:00:00.000Z');
    // Simulate format(date, 'dd/MM/yyyy')
    const dd = String(result.getDate()).padStart(2, '0');
    const mm = String(result.getMonth() + 1).padStart(2, '0');
    const yyyy = result.getFullYear();
    expect(`${dd}/${mm}/${yyyy}`).toBe('26/01/2026');
  });
});

// ============================================================
// Full round-trip: toLocalDateString → API → parseUTCDateToLocal
// ============================================================
describe('Full Frontend Round-Trip', () => {
  test('Jan 26, 2026: pick → serialize → store noon UTC → read back → display', () => {
    // Step 1: User picks date → date picker gives local Date
    const userPicked = new Date(2026, 0, 26, 0, 0, 0); // Jan 26 local midnight

    // Step 2: Frontend serializes with toLocalDateString
    const serialized = toLocalDateString(userPicked);
    expect(serialized).toBe('2026-01-26');

    // Step 3: JSON.stringify sends it as string (no Date mangling!)
    const jsonPayload = JSON.stringify({ date: serialized });
    expect(jsonPayload).toBe('{"date":"2026-01-26"}');

    // Step 4: Backend stores at noon UTC → returns "2026-01-26T12:00:00.000Z"
    const backendReturns = '2026-01-26T12:00:00.000Z';

    // Step 5: Frontend parses with parseUTCDateToLocal
    const displayed = parseUTCDateToLocal(backendReturns);
    expect(displayed.getDate()).toBe(26);
    expect(displayed.getMonth()).toBe(0);
    expect(displayed.getFullYear()).toBe(2026);
  });

  test('March 9, 2026: full round-trip', () => {
    const userPicked = new Date(2026, 2, 9);
    const serialized = toLocalDateString(userPicked);
    expect(serialized).toBe('2026-03-09');

    const backendReturns = '2026-03-09T12:00:00.000Z';
    const displayed = parseUTCDateToLocal(backendReturns);
    expect(displayed.getDate()).toBe(9);
    expect(displayed.getMonth()).toBe(2);
  });

  test('Dec 31, 2026: year boundary round-trip', () => {
    const userPicked = new Date(2026, 11, 31, 23, 59, 59);
    const serialized = toLocalDateString(userPicked);
    expect(serialized).toBe('2026-12-31');

    const backendReturns = '2026-12-31T12:00:00.000Z';
    const displayed = parseUTCDateToLocal(backendReturns);
    expect(displayed.getDate()).toBe(31);
    expect(displayed.getMonth()).toBe(11);
  });

  test('isSameDay comparison should work with noon local dates', () => {
    // Simulate WeeklyScheduleTable: isSameDay(new Date(s.date), day)
    const scheduleDate = parseUTCDateToLocal('2026-03-09T12:00:00.000Z');
    const weekDay = new Date(2026, 2, 9); // March 9 local

    // isSameDay compares getFullYear, getMonth, getDate (local)
    const isSame =
      scheduleDate.getFullYear() === weekDay.getFullYear() &&
      scheduleDate.getMonth() === weekDay.getMonth() &&
      scheduleDate.getDate() === weekDay.getDate();

    expect(isSame).toBe(true);
  });

  test('isSameDay should NOT match different dates', () => {
    const scheduleDate = parseUTCDateToLocal('2026-03-09T12:00:00.000Z');
    const differentDay = new Date(2026, 2, 10);

    const isSame =
      scheduleDate.getFullYear() === differentDay.getFullYear() &&
      scheduleDate.getMonth() === differentDay.getMonth() &&
      scheduleDate.getDate() === differentDay.getDate();

    expect(isSame).toBe(false);
  });
});

// ============================================================
// Summary
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.log('SOME TESTS FAILED!');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED ✓');
}
