import type { RunStatus, TodoItem } from '../../shared/contracts.js';

export type TodoEvidence =
  | { kind: 'write'; paths: string[]; text: string }
  | { kind: 'check'; ok: boolean }
  | { kind: 'place'; labels: string[] }
  | { kind: 'review'; by: string };

type TodoKind = 'prep' | 'build' | 'place' | 'check' | 'fix';

interface Classified {
  kind: TodoKind;
  files: string[];
  words: string[];
  needsReview: boolean;
}

const PREP_START = /^(load|read|find|explore|look|study|plan|brief|research|inspect|understand|gather|survey|locate|open|learn|pick|choose|decide|outline|sketch)\b/;
const CHECK_WORDS = /\b(checks?|review|verify|qa|test|critic|screenshots?|audit|final)\b/;
const REVIEW_ONLY = /\b(review|critic|final|audit|screenshots?)\b/;
const FIX_WORDS = /\b(fix|fixes|polish|tweak|tweaks|refine)\b/;
const PLACE_WORDS = /\b(place|frames?|canvas)\b/;
const FILE_TOKEN = /[\w@()[\]-]+(?:\/[\w@()[\]-]+)*\.(?:html|tsx|jsx|ts|js|css|md|json|mdx|vue|svelte)\b/g;
const STOP_WORDS = new Set(
  'a an and the of to for with on in into from at by as is it its this that each every all new add adds build builds write writes create make makes implement wire use using page pages screen screens view views step steps card cards section sections component components part layout ui mobile desktop tablet then plus also more style styles code file files list item items'.split(' '),
);

function classify(content: string): Classified {
  const text = content.toLowerCase();
  const files = [...text.matchAll(FILE_TOKEN)].map((match) => match[0].replace(/^[([]+/, ''));
  const plain = text.replace(FILE_TOKEN, ' ');
  const words = [...new Set(plain.split(/[^a-z0-9-]+/).filter((word) => word.length >= 3 && !STOP_WORDS.has(word)))];
  const kind = kindOf(text, files.length > 0);
  return { kind, files, words, needsReview: REVIEW_ONLY.test(text) };
}

function kindOf(text: string, namesFile: boolean): TodoKind {
  if (PREP_START.test(text) || /\bskills?\b/.test(text) || text.trim() === 'brief') return 'prep';
  if (CHECK_WORDS.test(text)) return 'check';
  if (FIX_WORDS.test(text) && !namesFile) return 'fix';
  if (PLACE_WORDS.test(text) && !namesFile) return 'place';
  return 'build';
}

function baseName(file: string): string {
  return file.split('/').pop() ?? file;
}

function attributeHit(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:id|data-[\\w-]+|view|screen|step|route)\\s*[=:]\\s*["'\`{]?[\\w-]*${escaped}`, 'i').test(text);
}

function writeHits(todo: Classified, write: Extract<TodoEvidence, { kind: 'write' }>, placed: readonly string[]): boolean {
  const paths = write.paths.map((item) => item.toLowerCase());
  if (todo.files.length > 0) return todo.files.some((file) => paths.some((item) => item === file || item.endsWith(`/${file}`) || baseName(item) === baseName(file)));
  return todo.words.some((word) => paths.some((item) => item.includes(word)) || placed.some((label) => label.includes(word)) || attributeHit(write.text, word));
}

interface Done {
  by: 'studio';
  note: string;
}

interface ReplayState {
  todos: Classified[];
  done: (Done | null)[];
  agentDone: boolean[];
  writesSinceCheck: Extract<TodoEvidence, { kind: 'write' }>[];
  wroteAfterReview: boolean;
  reviewed: boolean;
  placed: string[];
  anyWork: boolean;
}

function finish(state: ReplayState, index: number, note: string): void {
  if (state.agentDone[index] || state.done[index]) return;
  state.done[index] = { by: 'studio', note };
}

function open(state: ReplayState, kind: TodoKind): number[] {
  return state.todos.flatMap((todo, index) => (todo.kind === kind && !state.agentDone[index] && !state.done[index] ? [index] : []));
}

function finishPrep(state: ReplayState): void {
  for (const index of open(state, 'prep')) finish(state, index, 'The build started.');
}

function onCheck(state: ReplayState, ok: boolean): void {
  if (!ok || state.writesSinceCheck.length === 0) return;
  const writes = state.writesSinceCheck;
  state.writesSinceCheck = [];
  const builds = open(state, 'build');
  const matched = builds.filter((index) => writes.some((write) => writeHits(state.todos[index] as Classified, write, state.placed)));
  for (const index of matched) finish(state, index, 'Its files were written and the render check passed.');
  const generic = builds.find((index) => !matched.includes(index) && (state.todos[index] as Classified).files.length === 0);
  if (matched.length === 0 && generic !== undefined) finish(state, generic, 'A change was written and the render check passed.');
  if (state.wroteAfterReview) for (const index of open(state, 'fix')) finish(state, index, 'Fixes were written after the review and the render check passed.');
}

function onPassingCheck(state: ReplayState): void {
  for (const index of open(state, 'check')) if (!(state.todos[index] as Classified).needsReview) finish(state, index, 'The render check passed.');
}

function apply(state: ReplayState, event: TodoEvidence): void {
  if (event.kind === 'write') {
    state.anyWork = true;
    state.writesSinceCheck.push(event);
    if (state.reviewed) state.wroteAfterReview = true;
  } else if (event.kind === 'check') {
    state.anyWork = true;
    onCheck(state, event.ok);
    if (event.ok) onPassingCheck(state);
    state.reviewed = true;
  } else if (event.kind === 'place') {
    state.anyWork = true;
    state.placed.push(...event.labels.map((label) => label.toLowerCase()));
    for (const index of open(state, 'place')) finish(state, index, 'Frames were placed on the canvas.');
  } else {
    state.reviewed = true;
    for (const index of open(state, 'check')) finish(state, index, `${event.by} ran.`);
  }
  if (state.anyWork) finishPrep(state);
}

function withActive(todos: TodoItem[], running: boolean): TodoItem[] {
  if (!running || todos.some((todo) => todo.status === 'in_progress')) return todos;
  const next = todos.findIndex((todo) => todo.status === 'pending');
  return next === -1 ? todos : todos.map((todo, index) => (index === next ? { ...todo, status: 'in_progress' } : todo));
}

export function trackedTodos(agent: readonly TodoItem[], events: readonly TodoEvidence[], running = true): TodoItem[] {
  const state: ReplayState = { todos: agent.map((todo) => classify(todo.content)), done: agent.map(() => null), agentDone: agent.map((todo) => todo.status === 'completed'), writesSinceCheck: [], wroteAfterReview: false, reviewed: false, placed: [], anyWork: false };
  for (const event of events) apply(state, event);
  const marked = agent.map((todo, index): TodoItem => {
    const done = state.done[index];
    return done ? { ...todo, status: 'completed', by: done.by, note: done.note } : { ...todo };
  });
  return withActive(marked, running);
}

function skipNote(status: RunStatus, builds: boolean): string {
  if (status === 'canceled') return 'Not done: the run was stopped.';
  return builds ? 'Not done: the run ended early.' : 'Not done: this run only planned or reviewed.';
}

export function closeTodos(todos: readonly TodoItem[], status: RunStatus, builds = true): TodoItem[] {
  const success = status === 'completed' && builds;
  return todos.map((todo): TodoItem => {
    if (todo.status === 'completed') return todo;
    if (success) return { ...todo, status: 'completed', by: 'run', note: 'Marked done when the run finished. No step of the run showed this todo.' };
    return { ...todo, status: 'pending', skipped: true, note: skipNote(status, builds) };
  });
}

const REVIEW_TOOLS: Record<string, string> = { mcp__studio__review_frame: 'review_frame', mcp__studio__design_review: 'design_review' };
const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);

function field(input: unknown, key: string): unknown {
  return input && typeof input === 'object' ? (input as Record<string, unknown>)[key] : undefined;
}

function strings(...values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string' && value !== '');
}

function writtenText(input: unknown): string {
  const edits = field(input, 'edits');
  const fromEdits = Array.isArray(edits) ? edits.map((edit) => field(edit, 'new_string')) : [];
  return strings(field(input, 'content'), field(input, 'new_string'), field(input, 'jsx'), field(input, 'text'), ...fromEdits).join('\n');
}

function placedLabels(input: unknown): string[] {
  const frames = field(input, 'frames');
  return Array.isArray(frames) ? frames.flatMap((frame) => strings(field(frame, 'label'), field(frame, 'path'))) : [];
}

export interface ToolFacts {
  name: string;
  input: unknown;
  isError: boolean;
  resultText?: string | undefined;
  filePath: string | null;
  isEditTool: boolean;
  contextFiles: string[];
}

export function evidenceOf(facts: ToolFacts): TodoEvidence | null {
  if (facts.name === 'mcp__studio__render_check') return { kind: 'check', ok: !facts.isError && !/"ok":\s*false/.test(facts.resultText ?? '') };
  if (facts.isError) return null;
  if (FILE_TOOLS.has(facts.name)) return { kind: 'write', paths: strings(facts.filePath), text: writtenText(facts.input) };
  if (facts.isEditTool) return { kind: 'write', paths: [...strings(field(facts.input, 'path')), ...facts.contextFiles], text: writtenText(facts.input) };
  if (facts.name === 'mcp__studio__canvas_place') return { kind: 'place', labels: placedLabels(facts.input) };
  const review = REVIEW_TOOLS[facts.name];
  return review ? { kind: 'review', by: review } : null;
}

export interface TodoTracker {
  setAgent(todos: TodoItem[]): TodoItem[];
  record(event: TodoEvidence): TodoItem[] | null;
  close(status: RunStatus, builds: boolean): TodoItem[] | null;
}

export function createTodoTracker(): TodoTracker {
  let agent: TodoItem[] = [];
  const events: TodoEvidence[] = [];
  let last = '';
  function current(running: boolean): TodoItem[] | null {
    if (agent.length === 0) return null;
    const next = trackedTodos(agent, events, running);
    const key = JSON.stringify(next);
    if (key === last) return null;
    last = key;
    return next;
  }
  return {
    setAgent(todos) {
      agent = todos;
      last = '';
      return current(true) ?? [];
    },
    record(event) {
      events.push(event);
      return current(true);
    },
    close(status, builds) {
      if (agent.length === 0) return null;
      const next = closeTodos(trackedTodos(agent, events, false), status, builds);
      last = JSON.stringify(next);
      return next;
    },
  };
}
