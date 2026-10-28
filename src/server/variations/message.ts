import type { ReferenceElement, RunRequest } from '../../shared/contracts.js';
import type { ElementScope } from '../../shared/element-variants.js';

const OUTER_HTML_MAX = 3000;
const SNIPPET_MAX = 4000;
const STYLE_MAX = 40;

function clip(value: string, max: number): string {
  const clean = value.trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function scopedVariationBlock(variation: NonNullable<RunRequest['variation']>, scope: ElementScope): string {
  return [
    `<variation label="${variation.label}" index="${variation.index}" of="${variation.count}">`,
    `This run makes option ${variation.label} of ${variation.count} of one element, not of the page. Other runs build the other options at the same time, each in its own direction.`,
    `Follow this brief for the element's layout, type, color and density, so this option is clearly different from the others:`,
    `${variation.title}: ${variation.brief}`,
    'Keep the content of the element. The rest of the page stays as it is.',
    '</variation>',
    `<element-scope file="${scope.file}" lines="${scope.startLine}-${scope.endLine}">`,
    `Change only the selected <${scope.tag}> element (selector ${scope.selector}) and its children: ${scope.file}, lines ${scope.startLine}-${scope.endLine}, from its start tag to its end tag. Read those lines first.`,
    'Every byte outside that range must stay the same, in this file and in every other file. The studio compares the files after the run and throws away a variant that changes anything else.',
    'So put new styles inside the element: inline style attributes, a <style> element inside it (HTML), or classes the project already has. Do not add imports, do not edit CSS files, tokens or DESIGN.md, and do not create files.',
    'Keep the start tag where it is (same line and column), and keep it one element.',
    '</element-scope>',
  ].join('\n');
}

export function variationBlock(variation: RunRequest['variation'], scope?: ElementScope): string | null {
  if (!variation) return null;
  if (scope) return scopedVariationBlock(variation, scope);
  return [
    `<variation label="${variation.label}" index="${variation.index}" of="${variation.count}">`,
    `This run makes option ${variation.label} of ${variation.count} for the request above. Other runs build the other options at the same time, each in its own direction.`,
    `Follow this brief for layout, type, color and density, so this option is clearly different from the others:`,
    `${variation.title}: ${variation.brief}`,
    'The brief sets the look only. Keep the content the request asks for. If the files already hold a design, rework it to this brief.',
    '</variation>',
  ].join('\n');
}

function styleLines(styles: Record<string, string>): string {
  const entries = Object.entries(styles).slice(0, STYLE_MAX);
  return entries.length ? entries.map(([key, value]) => `${key}: ${value}`).join('; ') : '(none)';
}

export function referenceBlock(reference: ReferenceElement | undefined): string | null {
  if (!reference) return null;
  const loc = reference.source ? `${reference.source.file}:${reference.source.line}:${reference.source.col}` : 'unknown';
  const lines = [
    `<reference-element from="${reference.fromLabel}">`,
    `This element comes from another design option (${reference.fromLabel}). It is a reference, not a file in this work tree. Do not look for its source path here.`,
    'Adapt this part into the current design: rebuild its structure and behavior in this design\'s files, and keep this design\'s tokens, fonts, colors and spacing. Do not copy its colors or fonts unless they match this design.',
    `tag: ${reference.tag}`,
    `selector in ${reference.fromLabel}: ${reference.selector}`,
    `source in ${reference.fromLabel}: ${loc}`,
    `computed styles: ${styleLines(reference.styles)}`,
    'outerHTML:',
    clip(reference.outerHTML, OUTER_HTML_MAX),
  ];
  if (reference.snippet) lines.push('source snippet:', clip(reference.snippet, SNIPPET_MAX));
  lines.push('</reference-element>');
  return lines.join('\n');
}
