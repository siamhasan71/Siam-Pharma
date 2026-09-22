/**
 * Siam Pharma Safe Date Utilities
 * Handles all date formats: ISO strings, Unix timestamps (ms & sec),
 * YYYY-MM-DD, DD/MM/YYYY, Date objects, and invalid/null inputs without crashing.
 */

export function parseRecordDate(rawDate: unknown): Date | null {
  if (rawDate === null || rawDate === undefined || rawDate === '') return null;

  if (rawDate instanceof Date) {
    return isNaN(rawDate.getTime()) ? null : rawDate;
  }

  if (typeof rawDate === 'number') {
    // Check if seconds vs milliseconds
    const ts = rawDate < 1e11 ? rawDate * 1000 : rawDate;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) return null;

    // Check if numeric timestamp as string (e.g., '1789077774469')
    if (/^\d{10,13}$/.test(trimmed)) {
      const num = Number(trimmed);
      const ts = num < 1e11 ? num * 1000 : num;
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    }

    // Try standard Date parsing
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;

    // Handle DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}

export function isToday(rawDate: unknown): boolean {
  const d = parseRecordDate(rawDate);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isYesterday(rawDate: unknown): boolean {
  const d = parseRecordDate(rawDate);
  if (!d) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

export function isThisMonth(rawDate: unknown): boolean {
  const d = parseRecordDate(rawDate);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

export function isLast7Days(rawDate: unknown): boolean {
  const d = parseRecordDate(rawDate);
  if (!d) return false;
  const now = new Date();
  const past7 = new Date();
  past7.setDate(now.getDate() - 7);
  past7.setHours(0, 0, 0, 0);
  return d >= past7 && d <= now;
}

export function isLast30Days(rawDate: unknown): boolean {
  const d = parseRecordDate(rawDate);
  if (!d) return false;
  const now = new Date();
  const past30 = new Date();
  past30.setDate(now.getDate() - 30);
  past30.setHours(0, 0, 0, 0);
  return d >= past30 && d <= now;
}

export function formatDateSafe(rawDate: unknown, format: 'iso' | 'display' | 'short' = 'display'): string {
  const d = parseRecordDate(rawDate);
  if (!d) return 'N/A';

  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }

  if (format === 'short') {
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
