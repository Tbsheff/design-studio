import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TOKENS_FILE } from '../../shared/contracts.js';
import { TODO_MARK } from '../design-system/extract/compose.js';
import { DESIGN_MD_FILE } from '../design-system/packs.js';
import { DESIGN_SYSTEM_CHECK_TOOL } from './permissions.js';

export const MOCK_DS_FAIL_ONCE = '[ds-fail-once]';
export const MOCK_DS_FAIL_ALWAYS = '[ds-fail-always]';

const SCREENSHOT = 'mcp__studio__screenshot';
const DRAFT_NOTE = /^Draft made from: .*$\n?\n?/m;

interface MockDesignSystemWriter {
  say(text: string): Promise<void>;
  writeFileAsTool(toolName: 'Write' | 'Edit', relativePath: string, content: string): Promise<void>;
  fakeTool(name: string, input: Record<string, unknown>, summary: string, ms?: number): Promise<void>;
}

const TODO_TOOL = 'TodoWrite';
const TODO_STEP_MS = 700;
const DS_TODO_STEPS = ['Read coverage and evidence', 'Read the source images', 'Edit tokens.json', 'Write DESIGN.md', 'Check light and dark'];

function dsTodos(current: number) {
  return DS_TODO_STEPS.map((content, index) => ({ content, activeForm: `${content}…`, status: index < current ? 'completed' : index === current ? 'in_progress' : 'pending' }));
}

async function todo(session: MockDesignSystemWriter, current: number): Promise<void> {
  await session.fakeTool(TODO_TOOL, { todos: dsTodos(current) }, 'Todo list', TODO_STEP_MS);
}

function isTodo(line: string): boolean {
  return line.trimStart().replace(/^[-*]\s+/, '').startsWith(TODO_MARK);
}

function ruleFor(line: string): string {
  const text = line.trim().replace(/^[-*]\s+/, '').slice(TODO_MARK.length).replace(/_$/, '').trim();
  return `- Rule: ${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function fillTodos(markdown: string, keepLast: boolean): string {
  const lines = markdown.replace(DRAFT_NOTE, '').split('\n');
  const todos = lines.flatMap((line, index) => (isTodo(line) ? [index] : []));
  const kept = keepLast ? todos.at(-1) : undefined;
  return lines.map((line, index) => (isTodo(line) && index !== kept ? ruleFor(line) : line)).join('\n');
}

async function readText(workTree: string, file: string): Promise<string> {
  return readFile(path.join(workTree, file), 'utf8');
}

async function improveTokens(session: MockDesignSystemWriter, workTree: string): Promise<void> {
  const tokens = JSON.parse(await readText(workTree, TOKENS_FILE)) as Record<string, unknown>;
  tokens['$description'] = 'Design system tokens, checked by the Improve with AI run.';
  await session.writeFileAsTool('Edit', TOKENS_FILE, `${JSON.stringify(tokens, null, 2)}\n`);
}

async function checkSteps(session: MockDesignSystemWriter): Promise<void> {
  await session.fakeTool(SCREENSHOT, { viewport: 'desktop', from: 0, theme: 'light' }, `${SCREENSHOT} desktop`);
  await session.fakeTool(SCREENSHOT, { viewport: 'desktop', from: 0, theme: 'dark' }, `${SCREENSHOT} desktop dark`);
  await session.fakeTool(DESIGN_SYSTEM_CHECK_TOOL, {}, DESIGN_SYSTEM_CHECK_TOOL);
}

export async function runMockDesignSystem(session: MockDesignSystemWriter, workTree: string, prompt: string, imageBlocks = 0): Promise<string> {
  await todo(session, 0);
  await session.say('Reading the coverage and the source evidence, then filling in the design system.');
  await todo(session, 1);
  const images = `Got ${imageBlocks} image block${imageBlocks === 1 ? '' : 's'} in the user message.`;
  await session.say(images);
  const keepLast = prompt.includes(MOCK_DS_FAIL_ONCE) || prompt.includes(MOCK_DS_FAIL_ALWAYS);
  await todo(session, 2);
  await improveTokens(session, workTree);
  await todo(session, 3);
  await session.writeFileAsTool('Edit', DESIGN_MD_FILE, fillTodos(await readText(workTree, DESIGN_MD_FILE), keepLast));
  await todo(session, 4);
  await checkSteps(session);
  await todo(session, DS_TODO_STEPS.length);
  const finalText = `Filled in DESIGN.md and checked the tokens and the kit page in light and dark. ${images}`;
  await session.say(finalText);
  return finalText;
}

export async function runMockDesignSystemFix(session: MockDesignSystemWriter, workTree: string, prompt: string): Promise<string> {
  await session.writeFileAsTool('Edit', DESIGN_MD_FILE, fillTodos(await readText(workTree, DESIGN_MD_FILE), prompt.includes(MOCK_DS_FAIL_ALWAYS)));
  await session.fakeTool(DESIGN_SYSTEM_CHECK_TOOL, {}, DESIGN_SYSTEM_CHECK_TOOL);
  const finalText = 'Fixed the problems the check listed.';
  await session.say(finalText);
  return finalText;
}
