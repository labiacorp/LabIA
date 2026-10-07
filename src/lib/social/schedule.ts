// Import-free: safe for client components.

// A datetime-local value ("YYYY-MM-DDTHH:mm") read as Sao Paulo time (UTC-03:00 all year, no DST since 2019),
// as an ISO string with the offset. Null when the value is empty or invalid.
export function saoPauloIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const iso = `${value}:00-03:00`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}
