import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Starter } from '../shared/contracts.js';
import { resourcePath } from './resources.js';
import { BadRequestError } from './store/errors.js';

export const STARTERS_DIR = resourcePath(path.join('templates', 'starters'), path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'templates', 'starters'));

export const STARTERS: readonly Starter[] = [
  { id: 'landing', name: 'Landing page', description: 'Hero, proof numbers, a step list and a call to action.', prompt: 'Coffee subscription landing page, warm editorial serif, numbered steps' },
  { id: 'dashboard', name: 'Dashboard', description: 'Sidebar, KPI row, chart and data table.', prompt: 'Dark freight ops dashboard with KPIs, line chart, shipments table' },
  { id: 'mobile-app', name: 'Mobile app', description: 'Phone screen with a streak ring, habit list and tab bar.', prompt: 'Habit tracker home screen in a phone frame, soft sage' },
  { id: 'deck', name: 'Slide deck', description: 'Five slides: title, problem, product, traction, ask.', prompt: 'Five-slide startup pitch deck, navy and coral, bold type' },
  { id: 'form', name: 'Form', description: 'Booking form with sections, validation and a summary.', prompt: 'Recording studio booking form with sections and a price summary' },
  { id: 'docs', name: 'Docs', description: 'Left nav, code blocks, callouts and a page outline.', prompt: 'Developer docs page for webhook signatures with code samples' },
];

export const SAMPLE_STARTER_ID = 'landing';
export const SAMPLE_NAME = 'Sample: Kiln Coffee';

export function findStarter(id: unknown): Starter {
  const starter = STARTERS.find((candidate) => candidate.id === id);
  if (!starter) throw new BadRequestError(`unknown starter: ${String(id)}`);
  return starter;
}

export async function copyStarter(starter: Starter, workTree: string, root = STARTERS_DIR): Promise<void> {
  await cp(path.join(root, starter.id), workTree, { recursive: true, force: false, errorOnExist: false });
}

export function sampleEdit(html: string): string {
  return html.replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/, '<h1$1>Small-lot coffee, <em>roasted to order</em>.</h1>');
}

export async function applySampleEdit(workTree: string): Promise<void> {
  const file = path.join(workTree, 'index.html');
  await writeFile(file, sampleEdit(await readFile(file, 'utf8')));
}
