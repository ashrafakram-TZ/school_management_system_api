export type TemplateData = Record<string, string | number | null | undefined>;

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function renderTemplate(text: string, data: TemplateData): string {
  return text.replace(PLACEHOLDER, (_match, key: string) => {
    const value = data[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export function templateKeys(text: string): string[] {
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((match) => match[1]))];
}

export function toStringData(data: TemplateData): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}
