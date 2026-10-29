import { customProperties, parseCss } from './css.js';
import { harvestJsonTokens } from './json-tokens.js';
import { TokensFileError } from './token-values.js';
import type { Harvest } from './types.js';
import { harvestCssVars } from './vars.js';

export { TokensFileError };
export { parseTokensJson } from './json-tokens.js';

function harvestCssFile(text: string, label: string): Harvest {
  const found = harvestCssVars(customProperties(parseCss(text)), 'tokens-file', label);
  if (found.candidates.length === 0 && found.extras.length === 0) throw new TokensFileError('the CSS file has no custom properties in :root, @theme or a dark block');
  return { source: 'tokens-file', label, candidates: found.candidates, extras: found.extras };
}

export function isCssTokensFile(name: string, text: string): boolean {
  return /\.css$/i.test(name) || (!/^\s*[{[]/.test(text) && /--[\w-]+\s*:/.test(text));
}

export function harvestTokensFile(text: string, label: string): Harvest {
  return isCssTokensFile(label, text) ? harvestCssFile(text, label) : harvestJsonTokens(text, label);
}
