import { REQUIRED_TOKENS } from '../../../shared/contracts.js';
import type { PackManifest } from '../../../shared/contracts.js';
import type { Coverage } from './types.js';

export const TODO_MARK = '_To do:';

const SECTION = {
  theme: 'Visual Theme & Atmosphere',
  color: 'Color Palette & Roles',
  type: 'Typography Rules',
  components: 'Component Stylings',
  layout: 'Layout Principles',
  depth: 'Depth & Elevation',
  rules: "Do's and Don'ts",
  responsive: 'Responsive Behavior',
  agent: 'Agent Prompt Guide',
} as const;

export const DESIGN_MD_SECTIONS: readonly string[] = Object.values(SECTION);

const COLOR_ROLES: Record<string, string> = {
  bg: 'Page background',
  surface: 'Cards, panels, inputs',
  fg: 'Body text and headings',
  'fg-muted': 'Secondary text, captions',
  border: 'Dividers and outlines',
  primary: 'Main action fill, links',
  'primary-fg': 'Text on primary',
  accent: 'Highlight fill: tags, selected rows',
  'accent-fg': 'Text on accent',
  success: 'Success states',
  warning: 'Warning states',
  danger: 'Errors and destructive actions',
  ring: 'Focus ring',
};

const SOURCE_LABELS: Record<string, string> = {
  'tokens-file': 'tokens file',
  folder: 'local folder',
  url: 'website',
  'design-md': 'pasted DESIGN.md',
  brief: 'brief',
  images: 'images',
};

function todo(text: string): string {
  return `${TODO_MARK} ${text}_`;
}

function valueOf(tokens: Record<string, unknown>, token: string): string {
  const [group, name] = token.split('.');
  const node = (tokens[group ?? ''] as Record<string, unknown> | undefined)?.[name ?? ''] as { $value?: unknown } | undefined;
  return typeof node?.$value === 'string' ? node.$value : '';
}

export interface ComposeInput {
  name: string;
  brief?: string;
  baseName: string;
  fonts: PackManifest['fonts'];
  tokens: Record<string, unknown>;
  coverage: Coverage;
}

export function sourceSummary(coverage: Coverage): string {
  const kinds = [...new Set(coverage.sources.filter((source) => source.ok).map((source) => SOURCE_LABELS[source.kind] ?? source.kind))];
  return kinds.length > 0 ? kinds.join(', ') : 'no sources';
}

export function composeDraftDesignMd(input: ComposeInput): string {
  const { name, brief, baseName, fonts, tokens, coverage } = input;
  const from = new Map(coverage.tokens.map((entry) => [entry.token, entry]));
  const note = (token: string) => (from.get(token)?.confidence === 'fallback' ? ` (from ${baseName}; check it)` : '');
  const colors = REQUIRED_TOKENS.color.map((token) => `- **${COLOR_ROLES[token] ?? token}**: \`--${token}\` = \`${valueOf(tokens, `color.${token}`)}\`${note(`color.${token}`)}`);
  const briefLines = brief?.trim() ? brief.trim().slice(0, 2000).split('\n').map((line) => `> ${line}`) : [];
  return [
    `# ${name}`,
    '',
    `Draft made from: ${sourceSummary(coverage)}. Coverage ${coverage.score}/100 (${coverage.grade}). Lines that start with "${TODO_MARK}" still need work.`,
    '',
    `## ${SECTION.theme}`,
    '',
    ...(briefLines.length > 0 ? ['Brief:', '', ...briefLines, ''] : []),
    todo('describe the mood, density and personality in 3 to 5 sentences.'),
    '',
    `## ${SECTION.color}`,
    '',
    ...colors,
    '',
    todo('say when to use primary and accent, and which pairs pass contrast.'),
    '',
    `## ${SECTION.type}`,
    '',
    `- Display: ${fonts.display}${note('font.display')}`,
    `- Body: ${fonts.body}${note('font.body')}`,
    `- Mono: ${fonts.mono}${note('font.mono')}`,
    `- Scale: \`${REQUIRED_TOKENS.text.map((step) => `--text-${step}`).join('`, `')}\`.`,
    '',
    todo('give weights, line heights and letter spacing per role.'),
    '',
    `## ${SECTION.components}`,
    '',
    todo('describe buttons, inputs, cards, nav, tables and badges with their tokens.'),
    '',
    `## ${SECTION.layout}`,
    '',
    `- Spacing: \`${REQUIRED_TOKENS.space.map((step) => `--space-${step}`).join('`, `')}\`.`,
    '',
    todo('give the grid, max widths and section spacing.'),
    '',
    `## ${SECTION.depth}`,
    '',
    `- Radius: \`--radius-sm\` = \`${valueOf(tokens, 'radius.sm')}\`, \`--radius-md\` = \`${valueOf(tokens, 'radius.md')}\`, \`--radius-lg\` = \`${valueOf(tokens, 'radius.lg')}\`.`,
    '- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`.',
    '',
    todo('say which surfaces get which shadow.'),
    '',
    `## ${SECTION.rules}`,
    '',
    '- Do use only the tokens in `design-system/tokens.css`.',
    '- Do not write raw color or size values.',
    todo('add rules that are specific to this brand.'),
    '',
    `## ${SECTION.responsive}`,
    '',
    todo('give breakpoints and what changes at each one.'),
    '',
    `## ${SECTION.agent}`,
    '',
    `- Build with \`var(--token)\` from \`design-system/tokens.css\`. Fonts: ${fonts.display} for headings, ${fonts.body} for text.`,
    todo('add short example prompts.'),
    '',
  ].join('\n');
}
