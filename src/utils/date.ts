export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  return todayKey(date);
}

export function formatDateLabel(dateKey: string): string {
  const today = todayKey();
  if (dateKey === today) return 'Днес';
  const yesterday = shiftDateKey(today, -1);
  if (dateKey === yesterday) return 'Вчера';
  const tomorrow = shiftDateKey(today, 1);
  if (dateKey === tomorrow) return 'Утре';
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' });
}
