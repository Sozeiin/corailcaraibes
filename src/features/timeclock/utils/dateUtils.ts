export function roundToNearestMinutes(date: Date, roundMinutes: number): Date {
  if (!roundMinutes) return date;
  const ms = roundMinutes * 60 * 1000;
  return new Date(Math.round(date.getTime() / ms) * ms);
}

export function formatMinutes(total: number): string {
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  return `${hrs}h${mins.toString().padStart(2, '0')}`;
}
