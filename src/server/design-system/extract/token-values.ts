export class TokensFileError extends Error {}

export type JsonKind = 'color' | 'font' | 'dimension' | 'shadow' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing' | 'unknown';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function dimensionText(value: unknown): string | null {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return /^-?\d*\.?\d+$/.test(value.trim()) ? `${value.trim()}px` : value;
  if (isRecord(value) && typeof value.value === 'number' && typeof value.unit === 'string') return `${value.value}${value.unit}`;
  return null;
}

export function colorText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return null;
  if (typeof value.hex === 'string') return value.hex;
  const components = Array.isArray(value.components) ? value.components.map(Number) : null;
  if (!components || components.length !== 3 || components.some((item) => !Number.isFinite(item))) return null;
  const space = String(value.colorSpace ?? 'srgb');
  if (space === 'oklch') return `oklch(${components[0]} ${components[1]} ${components[2]})`;
  if (space === 'hsl') return `hsl(${components[0]} ${components[1]}% ${components[2]}%)`;
  if (space === 'srgb') return `color(srgb ${components.join(' ')})`;
  return null;
}

function oneShadow(item: unknown): string | null {
  if (typeof item === 'string') return item;
  if (!isRecord(item)) return null;
  const part = (key: string, alt: string) => dimensionText(item[key] ?? item[alt]) ?? '0px';
  const color = typeof item.color === 'string' ? item.color : colorText(item.color);
  if (!color) return null;
  const inset = item.inset === true || item.type === 'innerShadow' ? 'inset ' : '';
  return `${inset}${part('offsetX', 'x')} ${part('offsetY', 'y')} ${part('blur', 'blur')} ${part('spread', 'spread')} ${color}`;
}

export function shadowText(value: unknown): string | null {
  if (!Array.isArray(value)) return oneShadow(value);
  const parts = value.map(oneShadow);
  return parts.every((item): item is string => item !== null) ? parts.join(', ') : null;
}

const WEIGHTS: Record<string, number> = { thin: 100, hairline: 100, extralight: 200, ultralight: 200, light: 300, regular: 400, normal: 400, book: 400, medium: 500, semibold: 600, demibold: 600, bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900 };

export function fontWeightText(value: unknown): string | null {
  const text = String(value ?? '').trim().toLowerCase();
  const number = Number(text);
  if (text !== '' && Number.isFinite(number)) return number >= 1 && number <= 1000 ? String(Math.round(number)) : null;
  const named = WEIGHTS[text.replace(/[\s_-]+/g, '').replace(/italic$/, '')];
  return named === undefined ? null : String(named);
}

export function lineHeightText(value: unknown): { value: string; type: 'number' | 'dimension' } | null {
  if (typeof value === 'number') return value > 0 && value <= 4 ? { value: String(value), type: 'number' } : value > 4 ? { value: `${value}px`, type: 'dimension' } : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (/^\d*\.?\d+$/.test(text)) return lineHeightText(Number(text));
  if (/^\d*\.?\d+(px|rem|em|%)$/.test(text)) return { value: text, type: 'dimension' };
  return null;
}

export function letterSpacingText(value: unknown): string | null {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value !== 'string') return dimensionText(value);
  const text = value.trim();
  const percent = /^(-?\d*\.?\d+)%$/.exec(text);
  if (percent) return `${Math.round(Number(percent[1]) * 10) / 1000}em`;
  return /^-?\d*\.?\d+$/.test(text) ? `${text}px` : /^-?\d*\.?\d+(px|rem|em)$/.test(text) ? text : null;
}

const TYPE_KINDS: Record<string, JsonKind> = {
  color: 'color',
  fontfamily: 'font',
  fontfamilies: 'font',
  shadow: 'shadow',
  boxshadow: 'shadow',
  fontsize: 'fontSize',
  fontsizes: 'fontSize',
  fontweight: 'fontWeight',
  fontweights: 'fontWeight',
  lineheight: 'lineHeight',
  lineheights: 'lineHeight',
  letterspacing: 'letterSpacing',
  dimension: 'dimension',
  borderradius: 'dimension',
  spacing: 'dimension',
  sizing: 'dimension',
};

export function kindOf(type: string | null, value: unknown): JsonKind {
  const lower = (type ?? '').toLowerCase();
  if (lower !== '') return TYPE_KINDS[lower] ?? 'unknown';
  if (typeof value === 'string' && /^(#|rgb|hsl|oklch)/i.test(value.trim())) return 'color';
  if (typeof value === 'string' && /^-?\d*\.?\d+(px|rem|em)$/.test(value.trim())) return 'dimension';
  return 'unknown';
}

export function fontText(value: unknown): string | null {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(', ') || null;
  return typeof value === 'string' ? value : null;
}
