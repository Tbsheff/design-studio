export const RULE_MAX_CHARS = 2000;

const SHELL_META = /[;&|`<>\n\r]|\$\(/;
const PREFIX_SUFFIX = ' *';

function words(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean);
}

export function hasShellMeta(command: string): boolean {
  return SHELL_META.test(command);
}

export function ruleForCommand(command: string): string {
  const trimmed = command.trim();
  if (trimmed === '' || hasShellMeta(trimmed)) return trimmed;
  const parts = words(trimmed);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}${PREFIX_SUFFIX}` : trimmed;
}

function prefixOf(rule: string): string[] | null {
  if (!rule.endsWith(PREFIX_SUFFIX)) return null;
  const head = rule.slice(0, -PREFIX_SUFFIX.length);
  if (hasShellMeta(head)) return null;
  const parts = words(head);
  return parts.length > 0 ? parts : null;
}

export function ruleMatches(rule: string, command: string): boolean {
  const trimmed = command.trim();
  if (trimmed === '') return false;
  const prefix = prefixOf(rule);
  if (!prefix) return rule === trimmed;
  if (hasShellMeta(trimmed)) return false;
  const parts = words(trimmed);
  return parts.length >= prefix.length && prefix.every((word, index) => parts[index] === word);
}

export function anyRuleMatches(rules: readonly string[], command: string): boolean {
  return rules.some((rule) => ruleMatches(rule, command));
}
