export function toBoolean({ obj, key }: { obj: Record<string, unknown>; key: string }): unknown {
  const raw = obj[key];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}
