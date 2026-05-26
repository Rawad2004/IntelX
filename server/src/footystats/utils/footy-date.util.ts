export function getBogotaDateKey(date = new Date()): string {
  // en-CA => YYYY-MM-DD
  const key = date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  return key;
}
