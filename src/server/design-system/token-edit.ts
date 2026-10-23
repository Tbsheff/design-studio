import type { TokenChange } from '../../shared/contracts.js';
import { endOfString, insertMember, matchingBrace, skipSpace, valueStartAfterKey } from './token-insert.js';

const EXTENSIONS = '$extensions';
const MODES = 'studio.modes';

interface Member {
  key: string;
  keyStart: number;
  valueStart: number;
  valueEnd: number;
}

function valueEnd(text: string, start: number): number {
  const char = text[start];
  if (char === '{' || char === '[') return matchingBrace(text, start) + 1;
  if (char === '"') return endOfString(text, start) + 1;
  let index = start;
  while (index < text.length && !/[\s,}\]]/.test(text[index] ?? '')) index += 1;
  return index;
}

function parseKey(text: string, start: number, end: number): string | null {
  try {
    const key: unknown = JSON.parse(text.slice(start, end + 1));
    return typeof key === 'string' ? key : null;
  } catch {
    return null;
  }
}

function membersOf(text: string, open: number): Member[] {
  const members: Member[] = [];
  const close = matchingBrace(text, open);
  let index = skipSpace(text, open + 1);
  while (index < close && text[index] === '"') {
    const keyEnd = endOfString(text, index);
    const key = parseKey(text, index, keyEnd);
    const valueStart = valueStartAfterKey(text, keyEnd);
    if (key === null || valueStart < 0) break;
    const end = valueEnd(text, valueStart);
    members.push({ key, keyStart: index, valueStart, valueEnd: end });
    index = skipSpace(text, end);
    if (text[index] === ',') index = skipSpace(text, index + 1);
  }
  return members;
}

function childObject(text: string, open: number, key: string): number {
  const member = membersOf(text, open).find((item) => item.key === key);
  return member && text[member.valueStart] === '{' ? member.valueStart : -1;
}

function objectAt(text: string, segments: string[]): number {
  let open = skipSpace(text, 0);
  if (text[open] !== '{') return -1;
  for (const segment of segments) {
    open = childObject(text, open, segment);
    if (open < 0) return -1;
  }
  return open;
}

function replaceValue(text: string, member: Member, value: string): string {
  return text.slice(0, member.valueStart) + JSON.stringify(value) + text.slice(member.valueEnd);
}

function removeMember(text: string, open: number, key: string): string {
  const members = membersOf(text, open);
  const index = members.findIndex((item) => item.key === key);
  const member = members[index];
  if (!member) return text;
  const next = members[index + 1];
  if (next) return text.slice(0, member.keyStart) + text.slice(next.keyStart);
  const previous = members[index - 1];
  if (previous) return text.slice(0, previous.valueEnd) + text.slice(member.valueEnd);
  return text.slice(0, open + 1) + text.slice(matchingBrace(text, open));
}

function setMember(text: string, open: number, key: string, value: unknown): string | null {
  const member = membersOf(text, open).find((item) => item.key === key);
  if (member && typeof value === 'string') return replaceValue(text, member, value);
  if (member) return null;
  return insertMember(text, open, key, value);
}

function setDark(text: string, token: number, dark: string): string | null {
  const extensions = childObject(text, token, EXTENSIONS);
  if (extensions < 0) return setMember(text, token, EXTENSIONS, { [MODES]: { dark } });
  const modes = childObject(text, extensions, MODES);
  if (modes < 0) return setMember(text, extensions, MODES, { dark });
  return setMember(text, modes, 'dark', dark);
}

function onlyKey(text: string, open: number, key: string): boolean {
  const members = membersOf(text, open);
  return members.length === 1 && members[0]?.key === key;
}

function removeDark(text: string, token: number): string {
  const extensions = childObject(text, token, EXTENSIONS);
  const modes = extensions < 0 ? -1 : childObject(text, extensions, MODES);
  if (modes < 0) return text;
  if (!onlyKey(text, modes, 'dark')) return removeMember(text, modes, 'dark');
  if (!onlyKey(text, extensions, MODES)) return removeMember(text, extensions, MODES);
  return removeMember(text, token, EXTENSIONS);
}

function applyOne(text: string, change: TokenChange): string | null {
  const segments = change.path.split('.');
  const token = objectAt(text, segments);
  if (token < 0) return null;
  let next: string | null = text;
  if (change.value !== undefined) next = setMember(next, token, '$value', change.value);
  if (next === null || change.darkValue === undefined) return next;
  const again = objectAt(next, segments);
  if (again < 0) return null;
  return change.darkValue === null ? removeDark(next, again) : setDark(next, again, change.darkValue);
}

export function editTokensText(text: string, changes: TokenChange[]): string | null {
  let next: string | null = text;
  for (const change of changes) {
    if (next === null) return null;
    next = applyOne(next, change);
  }
  return next;
}
