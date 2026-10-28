import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isFrameId } from '../../shared/canvas-file.js';
import {
  BUILT_IN_STATES,
  DEFAULT_FRAME_STATE,
  DEFAULT_MOCK_USER,
  MAX_CUSTOM_STATES,
  MAX_MOCK_RULES,
  cleanMockRule,
  isFrameStateId,
  type FrameStateDef,
  type FrameStatesView,
  type MockRule,
  type MockUser,
} from '../../shared/frame-state.js';
import { BadRequestError } from '../store/errors.js';

const STATES_FILE = 'frame-states.json';
const JAR_FILE = 'frame-session.json';
const MAX_COOKIES = 60;

interface StatesFile {
  frames: Record<string, string>;
  custom: FrameStateDef[];
  session: { user: MockUser };
}

export interface JarCookie {
  value: string;
  expires: number | null;
}

interface JarFile {
  cookies: Record<string, JarCookie>;
  capturedAt: number | null;
}

export interface ResolvedFrameState {
  def: FrameStateDef;
  session: StatesFile['session'];
  jar: Record<string, string>;
  projectDir: string;
}

const cache = new Map<string, { states: StatesFile; jar: JarFile }>();
const locks = new Map<string, Promise<unknown>>();

function emptyStates(): StatesFile {
  return { frames: {}, custom: [], session: { user: { ...DEFAULT_MOCK_USER } } };
}

async function writePrivate(target: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

function cleanUser(raw: unknown): MockUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const user = raw as Record<string, unknown>;
  const name = typeof user.name === 'string' ? user.name.trim().slice(0, 80) : '';
  const email = typeof user.email === 'string' ? user.email.trim().slice(0, 120) : '';
  if (!name || !/^[^\s@]+@[^\s@]+$/.test(email)) return null;
  return { name, email };
}

function cleanCustom(raw: unknown): FrameStateDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const def = raw as Record<string, unknown>;
  if (!isFrameStateId(def.id) || BUILT_IN_STATES.some((state) => state.id === def.id)) return null;
  const name = typeof def.name === 'string' && def.name.trim() ? def.name.trim().slice(0, 40) : def.id;
  const mocks = (Array.isArray(def.mocks) ? def.mocks : []).map(cleanMockRule).filter((rule): rule is MockRule => rule !== null).slice(0, MAX_MOCK_RULES);
  return { id: def.id, kind: 'mock', name, signedIn: def.signedIn !== false, mocks };
}

function parseStates(text: string | null): StatesFile {
  const base = emptyStates();
  if (!text) return base;
  try {
    const raw = JSON.parse(text) as Partial<StatesFile>;
    const frames = Object.fromEntries(Object.entries(raw.frames ?? {}).filter(([id, state]) => isFrameId(id) && isFrameStateId(state)));
    const custom = (Array.isArray(raw.custom) ? raw.custom : []).map(cleanCustom).filter((def): def is FrameStateDef => def !== null).slice(0, MAX_CUSTOM_STATES);
    return { frames, custom, session: { user: cleanUser(raw.session?.user) ?? base.session.user } };
  } catch {
    return base;
  }
}

function parseJar(text: string | null): JarFile {
  if (!text) return { cookies: {}, capturedAt: null };
  try {
    const raw = JSON.parse(text) as Partial<JarFile>;
    const cookies: Record<string, JarCookie> = {};
    for (const [name, cookie] of Object.entries(raw.cookies ?? {})) {
      if (typeof cookie?.value === 'string') cookies[name] = { value: cookie.value, expires: typeof cookie.expires === 'number' ? cookie.expires : null };
    }
    return { cookies, capturedAt: typeof raw.capturedAt === 'number' ? raw.capturedAt : null };
  } catch {
    return { cookies: {}, capturedAt: null };
  }
}

async function load(projectDir: string): Promise<{ states: StatesFile; jar: JarFile }> {
  const hit = cache.get(projectDir);
  if (hit) return hit;
  const [states, jar] = await Promise.all([
    readFile(path.join(projectDir, STATES_FILE), 'utf8').catch(() => null),
    readFile(path.join(projectDir, JAR_FILE), 'utf8').catch(() => null),
  ]);
  const loaded = { states: parseStates(states), jar: parseJar(jar) };
  cache.set(projectDir, loaded);
  return loaded;
}

function serial<T>(projectDir: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(projectDir) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  locks.set(projectDir, next);
  return next;
}

function liveCookies(jar: JarFile, now = Date.now()): Record<string, string> {
  return Object.fromEntries(Object.entries(jar.cookies).filter(([, cookie]) => cookie.expires === null || cookie.expires > now).map(([name, cookie]) => [name, cookie.value]));
}

export function hasSessionCookie(cookies: Record<string, string>, names: readonly string[]): boolean {
  return Object.keys(cookies).some((name) => names.includes(name) || /session/i.test(name));
}

function viewOf(loaded: { states: StatesFile; jar: JarFile }): FrameStatesView {
  const { states, jar } = loaded;
  const captured = liveCookies(jar);
  return {
    states: [...BUILT_IN_STATES, ...states.custom],
    frames: { ...states.frames },
    session: { user: { ...states.session.user }, usesMockUser: !hasSessionCookie(captured, []), captured: Object.keys(captured), capturedAt: jar.capturedAt },
  };
}

export async function frameStatesView(projectDir: string): Promise<FrameStatesView> {
  return viewOf(await load(projectDir));
}

function findState(states: StatesFile, id: string): FrameStateDef | null {
  return BUILT_IN_STATES.find((state) => state.id === id) ?? states.custom.find((state) => state.id === id) ?? null;
}

export async function resolveFrameState(projectDir: string, stateId: string): Promise<ResolvedFrameState | null> {
  if (stateId === DEFAULT_FRAME_STATE) return null;
  const { states, jar } = await load(projectDir);
  const def = findState(states, stateId);
  if (!def) return null;
  return { def, session: states.session, jar: liveCookies(jar), projectDir };
}

export function stateOfFrame(view: FrameStatesView, frameId: string): string {
  return view.frames[frameId] ?? DEFAULT_FRAME_STATE;
}

export interface FrameStateChange {
  frameId: string;
  state: string;
  custom?: { name?: string; mocks?: unknown[]; signedIn?: boolean };
}

function nextCustomId(states: StatesFile): string {
  for (let n = 1; n < 100; n += 1) {
    const id = `mock${n}`;
    if (!states.custom.some((state) => state.id === id)) return id;
  }
  throw new BadRequestError('too many mock states');
}

function upsertCustom(states: StatesFile, stateId: string, custom: NonNullable<FrameStateChange['custom']>): string {
  const id = stateId === 'mock' ? nextCustomId(states) : stateId;
  const existing = states.custom.find((state) => state.id === id);
  const def = cleanCustom({ id, name: custom.name ?? existing?.name ?? 'Mock data', mocks: custom.mocks ?? existing?.mocks ?? [], signedIn: custom.signedIn ?? existing?.signedIn ?? true });
  if (!def) throw new BadRequestError('mock state needs an id of lowercase letters, digits and -, and rules with a path that starts with /');
  if (!existing && states.custom.length >= MAX_CUSTOM_STATES) throw new BadRequestError(`at most ${MAX_CUSTOM_STATES} mock states`);
  states.custom = existing ? states.custom.map((state) => (state.id === id ? def : state)) : [...states.custom, def];
  return id;
}

export function setFrameState(projectDir: string, change: FrameStateChange): Promise<{ view: FrameStatesView; state: FrameStateDef }> {
  return serial(projectDir, async () => {
    if (!isFrameId(change.frameId)) throw new BadRequestError('frame must be a frame id such as f2');
    const loaded = await load(projectDir);
    const states: StatesFile = structuredClone(loaded.states);
    let id = change.state;
    if (change.custom) id = upsertCustom(states, id, change.custom);
    const def = findState(states, id);
    if (!def) throw new BadRequestError(`unknown state ${change.state}. Use default, session, empty, loading, error, or mock with mock rules.`);
    if (id === DEFAULT_FRAME_STATE) delete states.frames[change.frameId];
    else states.frames[change.frameId] = id;
    await writePrivate(path.join(projectDir, STATES_FILE), states);
    loaded.states = states;
    return { view: viewOf(loaded), state: def };
  });
}

export interface SessionChange {
  user?: unknown;
  forget?: boolean;
}

export function setFrameSession(projectDir: string, change: SessionChange): Promise<FrameStatesView> {
  return serial(projectDir, async () => {
    const loaded = await load(projectDir);
    const states: StatesFile = structuredClone(loaded.states);
    if (change.user !== undefined) {
      const user = cleanUser(change.user);
      if (!user) throw new BadRequestError('user needs a name and an email');
      states.session.user = user;
    }
    if (change.forget) {
      loaded.jar = { cookies: {}, capturedAt: null };
      await rm(path.join(projectDir, JAR_FILE), { force: true });
    }
    await writePrivate(path.join(projectDir, STATES_FILE), states);
    loaded.states = states;
    return viewOf(loaded);
  });
}

function parseSetCookie(header: string, now: number): { name: string; cookie: JarCookie | null } | null {
  const [pair, ...attrs] = header.split(';');
  const at = pair?.indexOf('=') ?? -1;
  if (!pair || at <= 0) return null;
  const name = pair.slice(0, at).trim();
  const value = pair.slice(at + 1).trim();
  let expires: number | null = null;
  for (const attr of attrs) {
    const [key, raw] = attr.split('=');
    const lower = key?.trim().toLowerCase();
    if (lower === 'max-age' && raw !== undefined) expires = now + Number(raw) * 1000;
    else if (lower === 'expires' && raw !== undefined && expires === null) expires = Date.parse(raw.trim()) || null;
  }
  const gone = value === '' || (expires !== null && expires <= now);
  return { name, cookie: gone ? null : { value, expires } };
}

export function captureCookies(projectDir: string, headers: string[]): Promise<void> {
  if (headers.length === 0) return Promise.resolve();
  return serial(projectDir, async () => {
    const loaded = await load(projectDir);
    const now = Date.now();
    const cookies = { ...loaded.jar.cookies };
    for (const header of headers) {
      const parsed = parseSetCookie(header, now);
      if (!parsed) continue;
      if (parsed.cookie) cookies[parsed.name] = parsed.cookie;
      else delete cookies[parsed.name];
    }
    const names = Object.keys(cookies).slice(0, MAX_COOKIES);
    loaded.jar = { cookies: Object.fromEntries(names.map((name) => [name, cookies[name] as JarCookie])), capturedAt: now };
    await writePrivate(path.join(projectDir, JAR_FILE), loaded.jar);
  });
}
