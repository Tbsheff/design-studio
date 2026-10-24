import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from '@playwright/test';
import type { TelemetrySample } from '../../src/shared/contracts.js';
import { writeSkillsFixture } from '../../e2e/support/skills-fixture.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAMPLES = Number(process.env.PERF_DESKTOP_SAMPLES ?? 10);
const EXECUTABLE = process.env.STUDIO_DESKTOP_EXECUTABLE ?? '';
const LABEL = process.env.PERF_LABEL ?? (EXECUTABLE ? 'packaged' : 'dev');
const OUT = path.join(ROOT, 'e2e', 'results', `desktop-start-${LABEL}.json`);

interface Sample {
  homeUsableMs: number;
  windowMs: number;
  appStart: TelemetrySample | null;
  marks: Record<string, number>;
}

function env(work: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) out[key] = value;
  delete out.ELECTRON_RUN_AS_NODE;
  const claudeHome = path.join(work, 'claude-home');
  writeSkillsFixture(claudeHome);
  return {
    ...out,
    STUDIO_AGENT: 'mock',
    STUDIO_DATA_DIR: path.join(work, 'data'),
    STUDIO_PROJECTS_DIR: path.join(work, 'Design Studio'),
    STUDIO_CLAUDE_HOME: claudeHome,
    STUDIO_DESKTOP_USER_DATA: path.join(work, 'user-data'),
    STUDIO_DESKTOP_SETUP: 'skip',
  };
}

async function sample(): Promise<Sample> {
  const work = mkdtempSync(path.join(os.tmpdir(), 'studio desktop start '));
  const marks: Record<string, number> = {};
  const t0 = Date.now();
  const app = EXECUTABLE
    ? await electron.launch({ executablePath: EXECUTABLE, args: [], env: env(work), timeout: 120_000 })
    : await electron.launch({ args: ['.'], cwd: ROOT, env: env(work), timeout: 120_000 });
  try {
    app.process().stdout?.on('data', (chunk: Buffer) => {
      for (const match of chunk.toString().matchAll(/\[desktop\] boot (\w+) (\d+)ms/g)) marks[match[1] as string] = Number(match[2]);
    });
    const page = await app.firstWindow({ timeout: 120_000 });
    const windowMs = Date.now() - t0;
    await page.waitForFunction(() => Boolean(document.querySelector('.home [aria-label="Describe the design"]')), undefined, { timeout: 120_000 });
    const homeUsableMs = Date.now() - t0;
    const token = await page.locator('meta[name="studio-token"]').getAttribute('content');
    let appStart: TelemetrySample | null = null;
    for (let i = 0; i < 20 && !appStart; i += 1) {
      const list = await page.evaluate(
        async (t) => (await fetch('/api/telemetry?scope=app', { headers: { 'x-studio-token': t ?? '' } })).json() as Promise<TelemetrySample[]>,
        token,
      );
      appStart = Array.isArray(list) ? (list.find((s) => s.kind === 'app.start') ?? null) : null;
      if (!appStart) await page.waitForTimeout(100);
    }
    return { homeUsableMs, windowMs, appStart, marks };
  } finally {
    await app.close().catch(() => undefined);
    rmSync(work, { recursive: true, force: true });
  }
}

function stats(values: number[]): { n: number; p50: number; p95: number; max: number; samples: number[] } {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? NaN;
  return { n: sorted.length, p50: at(0.5), p95: at(0.95), max: sorted.at(-1) ?? NaN, samples: values };
}

async function main(): Promise<void> {
  const samples: Sample[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const s = await sample();
    samples.push(s);
    console.log(`[desktop-start] ${LABEL} #${i + 1}: window ${s.windowMs} ms, Home usable ${s.homeUsableMs} ms (launch call), app.start ${s.appStart?.ms ?? 'n/a'} ms, marks ${JSON.stringify(s.marks)}`);
  }
  const markNames = [...new Set(samples.flatMap((s) => Object.keys(s.marks)))];
  const result = {
    label: LABEL,
    executable: EXECUTABLE || 'electron . (dev build)',
    measuredAt: new Date().toISOString(),
    load: os.loadavg(),
    method: 'Playwright _electron.launch to the Home composer in the first window (wall clock, includes Playwright launch overhead); app.start = Date.now() - main process start, sent by the UI after Home paints; marks = main process phases since process start',
    homeUsable: stats(samples.map((s) => s.homeUsableMs)),
    window: stats(samples.map((s) => s.windowMs)),
    appStart: stats(samples.flatMap((s) => (s.appStart ? [s.appStart.ms] : []))),
    marks: Object.fromEntries(markNames.map((name) => [name, stats(samples.flatMap((s) => (s.marks[name] === undefined ? [] : [s.marks[name] as number])))])),
  };
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`[desktop-start] ${LABEL}: Home usable p50 ${result.homeUsable.p50} p95 ${result.homeUsable.p95} ms; app.start p50 ${result.appStart.p50} p95 ${result.appStart.p95} ms; wrote ${OUT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
