import type { Project } from '../../shared/contracts.js';
import { STATE_HINTS, type FrameStateDef, type FrameStatesView } from '../../shared/frame-state.js';
import type { CanvasService } from '../canvas/service.js';
import { findFrame } from '../canvas/tools.js';
import { BadRequestError } from '../store/errors.js';
import type { EventBus } from '../types.js';
import { frameStatesView, setFrameSession, setFrameState, type SessionChange } from './frame-state.js';
import { sessionCookieNames } from './frame-state-proxy.js';

export interface FrameStateDeps {
  projectDir: (projectId: string) => string;
  bus: EventBus;
  canvas: CanvasService;
}

export interface FrameStateInput {
  frame: string;
  state: string;
  mock?: { name?: string; rules?: unknown[]; signedIn?: boolean };
}

export const FRAME_STATES_NOTE =
  'Frame states are for attached apps. Each state frame loads from its own preview host, and the studio proxy changes only what the browser in that frame sends and gets: session sends a session cookie (common Auth.js, NextAuth, better-auth and Clerk names, plus AUTH_COOKIE_PREFIX from the app env) and answers GET /api/auth/get-session and /api/auth/session with the mock user; empty, loading and error change /api and tRPC calls made in the browser; mock answers calls that match its rules ({path, method?, status?, body?, delayMs?}, path may end in *). Every request also carries the header x-studio-state, so an app can serve its own fixtures for data it loads on the server. States and a recorded session live in the studio data dir, never in the repo or in exports.';

function requireApp(project: Project): void {
  if (!project.app) throw new BadRequestError('frame states work only for attached app projects');
}

async function frameIdOf(deps: FrameStateDeps, project: Project, ref: string): Promise<string> {
  const frames = (await deps.canvas.read(project)).canvas?.frames ?? [];
  if (frames.length === 0 && (ref === 'f1' || ref === '@f1')) return 'f1';
  const frame = findFrame(frames, ref);
  if (!frame) throw new BadRequestError(`no frame ${ref} on the canvas`);
  return frame.id;
}

function emitView(deps: FrameStateDeps, project: Project, view: FrameStatesView): void {
  deps.bus.emit({ type: 'frame-states.changed', projectId: project.id, states: view });
}

export async function readFrameStates(deps: FrameStateDeps, project: Project): Promise<FrameStatesView> {
  requireApp(project);
  return frameStatesView(deps.projectDir(project.id));
}

export async function applyFrameState(deps: FrameStateDeps, project: Project, input: FrameStateInput): Promise<{ view: FrameStatesView; state: FrameStateDef; frameId: string }> {
  requireApp(project);
  const frameId = await frameIdOf(deps, project, input.frame);
  const custom = input.mock ? { ...(input.mock.name ? { name: input.mock.name } : {}), ...(input.mock.rules ? { mocks: input.mock.rules } : {}), ...(input.mock.signedIn !== undefined ? { signedIn: input.mock.signedIn } : {}) } : undefined;
  if (input.state === 'mock' && !custom) throw new BadRequestError('state mock needs mock {name?, rules: [{path, status?, body?}]}');
  const done = await setFrameState(deps.projectDir(project.id), { frameId, state: input.state, ...(custom ? { custom } : {}) });
  emitView(deps, project, done.view);
  return { ...done, frameId };
}

export async function applyFrameSession(deps: FrameStateDeps, project: Project, change: SessionChange): Promise<FrameStatesView> {
  requireApp(project);
  const view = await setFrameSession(deps.projectDir(project.id), change);
  emitView(deps, project, view);
  return view;
}

export function describeFrameStates(project: Project, view: FrameStatesView): string {
  const lines = view.states.map((state) => `- ${state.id}: ${state.name}. ${STATE_HINTS[state.kind]}${state.mocks?.length ? ` Rules: ${state.mocks.map((rule) => `${rule.method ?? 'ANY'} ${rule.path} → ${rule.status ?? 200}`).join(', ')}.` : ''}`);
  const frames = Object.entries(view.frames).map(([frame, state]) => `${frame}=${state}`).join(', ') || 'none (every frame shows the app as it is)';
  const kept = view.session.captured.length > 0 ? ` Cookies the app set in signed-in frames, kept in the data dir: ${view.session.captured.join(', ')}.` : '';
  const session = `${view.session.usesMockUser ? `mock user ${view.session.user.name} <${view.session.user.email}>` : 'a real sign-in recorded in a signed-in frame'}.${kept}`;
  return [`States:`, ...lines, `Frames with a state: ${frames}.`, `Session: ${session} Session cookie names sent: ${sessionCookieNames(project.app?.env).join(', ')}.`].join('\n');
}

let configured: FrameStateDeps | null = null;

export function configureFrameStates(deps: FrameStateDeps): void {
  configured = deps;
}

export function configuredFrameStates(): FrameStateDeps | null {
  return configured;
}
