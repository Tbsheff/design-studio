import type { RenderPage } from './render-backend.js';
import { clickablesExpression, replayExpression, screenSignatureExpression, viewMembersExpression, type ScreenStep, type ViewMember } from './screens-probe.js';

export interface PageScreen {
  label: string;
  steps: ScreenStep[];
  forced: boolean;
}

interface Found extends PageScreen {
  signature: string;
}

interface ExploreLimits {
  maxScreens: number;
  maxClicks: number;
  deadlineMs: number;
}

const CLICKS_PER_SCREEN = 16;
const MAX_DEPTH = 5;

interface Explorer {
  page: RenderPage;
  href: string;
  limits: ExploreLimits;
  clicks: number;
  started: number;
  members: number;
  found: Found[];
}

async function signatureOf(page: RenderPage): Promise<{ signature: string; label: string } | null> {
  return page.evaluate<{ signature: string; label: string }>(screenSignatureExpression()).catch(() => null);
}

async function reset(state: Explorer, steps: readonly ScreenStep[]): Promise<boolean> {
  await state.page.goto(state.href);
  if (steps.length === 0) return true;
  return state.page.evaluate<boolean>(replayExpression(steps)).catch(() => false);
}

function allReached(state: Explorer): boolean {
  return state.members > 0 && Array.from({ length: state.members }, (_, index) => `v:${index}`).every((signature) => state.found.some((screen) => screen.signature === signature));
}

function exhausted(state: Explorer): boolean {
  return state.found.length >= state.limits.maxScreens || state.clicks >= state.limits.maxClicks || Date.now() - state.started > state.limits.deadlineMs || allReached(state);
}

async function tryClick(state: Explorer, from: Found, path: string): Promise<Found | null> {
  state.clicks += 1;
  const clicked = await state.page.evaluate<boolean>(replayExpression([{ click: path }])).catch(() => false);
  const now = clicked ? await signatureOf(state.page) : null;
  if (now && now.signature === from.signature) return null;
  const isNew = now !== null && !state.found.some((screen) => screen.signature === now.signature);
  await reset(state, from.steps);
  return isNew && now ? { label: now.label, steps: [...from.steps, { click: path }], forced: false, signature: now.signature } : null;
}

async function expand(state: Explorer, from: Found): Promise<Found[]> {
  if (!(await reset(state, from.steps))) return [];
  const paths = await state.page.evaluate<string[]>(clickablesExpression(CLICKS_PER_SCREEN)).catch(() => []);
  const next: Found[] = [];
  for (const path of paths) {
    if (exhausted(state)) break;
    const screen = await tryClick(state, from, path);
    if (!screen) continue;
    state.found.push(screen);
    next.push(screen);
  }
  return next;
}

function forcedScreens(members: ViewMember[], found: Found[], room: number): Found[] {
  const reached = new Set(found.map((screen) => screen.signature));
  return members
    .filter((member) => !reached.has(`v:${member.index}`))
    .slice(0, Math.max(0, room))
    .map((member) => ({ label: member.label || `View ${member.index + 1}`, steps: [{ force: member.index }], forced: true, signature: `v:${member.index}` }));
}

export async function exploreScreens(page: RenderPage, limits: ExploreLimits): Promise<PageScreen[]> {
  const href = await page.evaluate<string>('location.href');
  const first = await signatureOf(page);
  if (!first) return [{ label: '', steps: [], forced: false }];
  const members = await page.evaluate<ViewMember[]>(viewMembersExpression()).catch(() => []);
  const state: Explorer = { page, href, limits, clicks: 0, started: Date.now(), members: members.length, found: [{ label: first.label, steps: [], forced: false, signature: first.signature }] };
  let frontier = [...state.found];
  for (let depth = 0; depth < MAX_DEPTH && frontier.length && !exhausted(state); depth += 1) {
    const next: Found[] = [];
    for (const screen of frontier) {
      if (exhausted(state)) break;
      next.push(...(await expand(state, screen)));
    }
    frontier = next;
  }
  const all = [...state.found, ...forcedScreens(members, state.found, limits.maxScreens - state.found.length)];
  return all.map(({ label, steps, forced }) => ({ label, steps, forced }));
}

export { replayExpression };
export type { ScreenStep };
