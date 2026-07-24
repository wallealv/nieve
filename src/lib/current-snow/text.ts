const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&deg;': '°',
  '&ndash;': '-',
  '&mdash;': '-',
};

export function htmlToText(html: string): string {
  let value = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|li|tr|td|th|h[1-6]|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  Object.entries(HTML_ENTITIES).forEach(([entity, replacement]) => {
    value = value.replaceAll(entity, replacement);
  });

  value = value.replace(/&#(\d+);/g, (_, code: string) =>
    String.fromCodePoint(Number(code)),
  );

  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(',', '.').replace(/[^\d.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseCm(value: string | null | undefined): number | null {
  return parseNumber(value);
}

export function inchesToCm(value: string | null | undefined): number | null {
  const inches = parseNumber(value);
  return inches === null ? null : Math.round(inches * 25.4) / 10;
}

export function extractFirst(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}
