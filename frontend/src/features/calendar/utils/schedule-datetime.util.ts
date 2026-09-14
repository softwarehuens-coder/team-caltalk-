function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function toDatetimeLocalInput(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toIsoString(local: string): string {
  return new Date(local).toISOString();
}
