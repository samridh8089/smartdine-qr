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
