/**
 * CleverOps Canonical Global Exact Timestamp Formatter
 * Format: "DD MMM YYYY • HH:MM:SS AM/PM" (e.g. "13 Aug 2026 • 12:18:42 PM")
 * Timezone: Asia/Kolkata (IST) for consistent cross-surface rendering
 */

export function formatExactTimestamp(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const dayFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  const dateParts = dayFormatter.format(date); // e.g. "13 Aug 2026"
  const timeParts = timeFormatter.format(date); // e.g. "12:18:42 PM"

  return `${dateParts} • ${timeParts}`;
}

export function formatExactTimeOnly(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).format(date);
}

export function formatExactDateOnly(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(date);
}

/**
 * Returns today's calendar date string "YYYY-MM-DD" in the restaurant's timezone.
 */
export function getTodayDateString(timeZone = 'Asia/Kolkata'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Computes exact UTC ISO start (00:00:00) and end (23:59:59.999) for a YYYY-MM-DD date in a specific timezone.
 */
export function getDayRangeInTimezone(dateStr: string, timeZone = 'Asia/Kolkata'): { startIso: string; endIso: string; startLocal: string; endLocal: string } {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const today = getTodayDateString(timeZone);
    dateStr = today;
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  try {
    const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const tzParts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Asia/Kolkata',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    }).formatToParts(probe);

    const getPart = (type: string) => Number(tzParts.find(p => p.type === type)?.value || 0);
    const tzDate = new Date(Date.UTC(
      getPart('year'),
      getPart('month') - 1,
      getPart('day'),
      getPart('hour') === 24 ? 0 : getPart('hour'),
      getPart('minute'),
      getPart('second')
    ));
    const offsetMs = tzDate.getTime() - probe.getTime();

    const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs);
    const endUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs);

    return {
      startIso: startUtc.toISOString(),
      endIso: endUtc.toISOString(),
      startLocal: `${dateStr} 00:00:00`,
      endLocal: `${dateStr} 23:59:59`
    };
  } catch (_) {
    // Fallback if timezone resolution fails
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      startLocal: `${dateStr} 00:00:00`,
      endLocal: `${dateStr} 23:59:59`
    };
  }
}

