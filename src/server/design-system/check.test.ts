import { beforeAll, describe, expect, it } from 'vitest';
import type { DesignSystemCheckRule } from '../../shared/contracts.js';
import { checkDesignSystemFiles, familiesInFontLinks, type DesignSystemFiles } from './check.js';
import { DESIGN_MD_SECTIONS } from './extract/compose.js';
import { renderKitPage } from './extract/kit-page.js';
import { packRegistry, type LoadedPack } from './packs.js';

let light: LoadedPack;
let dark: LoadedPack;

const filledDesignMd = (name: string) => [`# ${name}`, '', ...DESIGN_MD_SECTIONS.flatMap((section) => [`## ${section}`, '', `Concrete rules for ${section.toLowerCase()}.`, ''])].join('\n');

function filesOf(pack: LoadedPack): DesignSystemFiles {
  return {
    tokensText: pack.tokensText,
    manifestText: JSON.stringify(pack.manifest),
    designMd: filledDesignMd(pack.manifest.name),
    kitHtml: renderKitPage({ name: pack.manifest.name, mode: pack.manifest.mode, ...(pack.manifest.fonts.googleFontsUrl ? { googleFontsUrl: pack.manifest.fonts.googleFontsUrl } : {}) }),
  };
}

type Tokens = { color: Record<string, { $value: string; $extensions?: { 'studio.modes'?: { dark?: string } } }>; font: Record<string, { $value: string }> };

function withTokens(files: DesignSystemFiles, edit: (tokens: Tokens) => void): DesignSystemFiles {
  const tokens = JSON.parse(files.tokensText ?? '{}') as Tokens;
  edit(tokens);
  return { ...files, tokensText: JSON.stringify(tokens) };
}

function rules(files: DesignSystemFiles): DesignSystemCheckRule[] {
  return [...new Set(checkDesignSystemFiles(files).problems.map((problem) => problem.rule))];
}

function messages(files: DesignSystemFiles, rule: DesignSystemCheckRule): string[] {
  return checkDesignSystemFiles(files).problems.filter((problem) => problem.rule === rule).map((problem) => problem.message);
}

beforeAll(async () => {
  light = (await packRegistry().get('modern-minimal'))!;
  dark = (await packRegistry().get('dark-product'))!;
});

describe('design system check', () => {
  it('passes a complete light pack and a complete dark pack', () => {
    expect(checkDesignSystemFiles(filesOf(light))).toEqual({ passed: true, problems: [] });
    expect(checkDesignSystemFiles(filesOf(dark))).toEqual({ passed: true, problems: [] });
  });

  it('tokens: missing required tokens, bad JSON, non-OKLCH values and missing dark values', () => {
    const missing = withTokens(filesOf(light), (tokens) => {
      delete (tokens.color as Record<string, unknown>)['ring'];
    });
    expect(messages(missing, 'tokens').join('\n')).toMatch(/color\.ring/);
    expect(rules({ ...filesOf(light), tokensText: '{ not json' })).toContain('tokens');
    const hex = withTokens(filesOf(light), (tokens) => {
      tokens.color['danger']!.$value = '#ff0000';
    });
    expect(messages(hex, 'tokens')).toContain('color.danger must be an OKLCH value (oklch(L% C H)) or an alias.');
    const noDark = withTokens(filesOf(light), (tokens) => {
      delete tokens.color['primary']!.$extensions;
    });
    expect(messages(noDark, 'tokens')).toContain('color.primary has no dark value ($extensions["studio.modes"].dark).');
    expect(messages(filesOf(dark), 'tokens')).toEqual([]);
  });

  it('contrast: checks fg, muted and *-fg pairs in light and in dark mode', () => {
    const lightFail = withTokens(filesOf(light), (tokens) => {
      tokens.color['fg-muted']!.$value = 'oklch(90% 0 0)';
    });
    expect(messages(lightFail, 'contrast')).toEqual([expect.stringMatching(/^--fg-muted on --bg in light mode is \d\.\d\d:1; AA needs 4\.5:1\.$/)]);
    const darkFail = withTokens(filesOf(light), (tokens) => {
      tokens.color['primary-fg']!.$extensions = { 'studio.modes': { dark: tokens.color['primary']!.$extensions?.['studio.modes']?.dark ?? 'oklch(70% 0.1 250)' } };
    });
    expect(messages(darkFail, 'contrast')).toEqual([expect.stringMatching(/^--primary-fg on --primary in dark mode is 1\.00:1/)]);
    const extraPair = withTokens(filesOf(light), (tokens) => {
      tokens.color['danger-fg'] = { $value: tokens.color['danger']!.$value, $extensions: { 'studio.modes': { dark: 'oklch(99% 0 0)' } } };
    });
    expect(messages(extraPair, 'contrast')[0]).toMatch(/^--danger-fg on --danger in light mode/);
    const darkPack = withTokens(filesOf(dark), (tokens) => {
      tokens.color['fg']!.$value = tokens.color['bg']!.$value;
    });
    expect(messages(darkPack, 'contrast')).toEqual(expect.arrayContaining([expect.stringMatching(/^--fg on --bg is 1\.00:1/)]));
    expect(messages(darkPack, 'contrast').join('\n')).not.toMatch(/mode/);
  });

  it('contrast follows aliases in each mode', () => {
    const aliased = withTokens(filesOf(light), (tokens) => {
      tokens.color['accent-fg'] = { $value: '{color.accent}', $extensions: { 'studio.modes': { dark: '{color.accent}' } } };
    });
    expect(messages(aliased, 'contrast')).toEqual([expect.stringMatching(/^--accent-fg on --accent in light mode is 1\.00:1/), expect.stringMatching(/^--accent-fg on --accent in dark mode is 1\.00:1/)]);
  });

  it('DESIGN.md: needs the 9 sections, with text, and no to-do lines', () => {
    const files = filesOf(light);
    const noSection = { ...files, designMd: files.designMd!.replace('## Responsive Behavior', '## Breakpoints') };
    expect(messages(noSection, 'design-md')).toEqual(['DESIGN.md has no "## Responsive Behavior" section.']);
    const empty = { ...files, designMd: files.designMd!.replace('Concrete rules for typography rules.', '') };
    expect(messages(empty, 'design-md')).toEqual(['"## Typography Rules" in DESIGN.md is empty.']);
    const todo = { ...files, designMd: `${files.designMd}\n_To do: add example prompts._\n- _To do: and more._\n` };
    expect(messages(todo, 'design-md')).toHaveLength(2);
    const quoted = { ...files, designMd: files.designMd!.replace('# Modern Minimal', '# Modern Minimal\n\nLines that start with "_To do:" still need work.') };
    expect(messages(quoted, 'design-md')).toEqual([]);
    const fenced = { ...files, designMd: `${files.designMd}\n\`\`\`\n## Not a heading\n\`\`\`\n` };
    expect(messages(fenced, 'design-md')).toEqual([]);
    expect(messages({ ...files, designMd: null }, 'design-md')).toEqual(['DESIGN.md is missing or empty.']);
  });

  it('kit page: no raw colors in style blocks or style attributes', () => {
    const files = filesOf(light);
    const raw = { ...files, kitHtml: files.kitHtml!.replace('.btn-primary { background: var(--primary);', '.btn-primary { background: #1f6feb;').replace('<div class="chip" style="background: var(--bg)">', '<div class="chip" style="background: rebeccapurple">') };
    const found = messages(raw, 'kit-colors');
    expect(found).toHaveLength(2);
    expect(found.join('\n')).toMatch(/#1f6feb/);
    expect(found.join('\n')).toMatch(/rebeccapurple/);
    const okShadow = { ...files, kitHtml: files.kitHtml!.replace('.btn {', '.btn { border-color: transparent; color: currentColor;') };
    expect(messages(okShadow, 'kit-colors')).toEqual([]);
  });

  it('fonts: token fonts, the kit page font link and pack.json agree', () => {
    const files = filesOf(light);
    const changed = withTokens(files, (tokens) => {
      tokens.font['display']!.$value = "'Fraunces', Georgia, serif";
    });
    expect(messages(changed, 'fonts')).toEqual([
      'The font Fraunces is in tokens.json but not in the Google Fonts <link> of index.html.',
      'design-system/pack.json fonts.display is Geist, but font.display in tokens.json is Fraunces.',
      'design-system/pack.json fonts.googleFontsUrl does not load Fraunces.',
    ]);
    const extra = { ...files, kitHtml: files.kitHtml!.replace('family=Geist+Mono', 'family=Lobster&family=Geist+Mono') };
    expect(messages(extra, 'fonts')).toEqual(['The Google Fonts <link> of index.html loads Lobster, which no font token uses.']);
    const system = withTokens({ ...files, kitHtml: renderKitPage({ name: 'Plain', mode: 'light' }), manifestText: JSON.stringify({ ...light.manifest, fonts: { display: 'Georgia', body: 'Georgia', mono: 'Menlo' } }) }, (tokens) => {
      tokens.font['display']!.$value = 'Georgia, serif';
      tokens.font['body']!.$value = 'Georgia, serif';
      tokens.font['mono']!.$value = 'Menlo, monospace';
    });
    expect(messages(system, 'fonts')).toEqual([]);
  });

  it('reads families from Google Fonts links', () => {
    expect(familiesInFontLinks(['https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400&amp;family=Inter:wght@400&display=swap'])).toEqual(['Source Sans 3', 'Inter']);
  });
});
