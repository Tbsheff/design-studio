import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import type { Browser, Page } from "playwright-core";

import {
  exportBaseline,
  exportReport,
  getBaseline,
  toCounts,
  toRises,
  toTopLines,
} from "./clip/report.ts";
import { createSeed } from "./clip/seed.ts";
import type { SeededProject } from "./clip/seed.ts";
import { APP_ROOT, startStudio, stopServer } from "./clip/server.ts";
import {
  insertUnreachable,
  inspectMenus,
  inspectState,
  inspectTips,
} from "./clip/session.ts";
import { setEditorReady, toEditorStates } from "./clip/states.ts";
import { runEach, toFirstLine } from "./clip/steps.ts";
import type { ClipRun, Finding } from "./clip/types.ts";
import { fail, runCli } from "./stamp/args.js";

interface ClipMode {
  readonly height: number;
  readonly theme: "dark" | "light";
  readonly width: number;
}

interface ModeSetup {
  readonly browser: Browser;
  readonly cropDir: string;
  readonly findings: Map<string, Finding>;
  readonly origin: string;
  readonly seed: SeededProject;
}

interface ClipResult {
  readonly findings: Finding[];
  readonly stateCount: number;
}

const OUT = path.join(APP_ROOT, "artifacts", "clip-check");
const CROP_DIR = path.join(OUT, "crops");
const BASELINE = fileURLToPath(new URL("clip-baseline.json", import.meta.url));
const UI_KEY = "design-studio.ui.v1";
const LOAD_TIMEOUT_MS = 60_000;
const BASE_STATES = 2;
const WIDE = { height: 900, width: 1440 };
const NARROW = { height: 800, width: 1000 };

const MODES: readonly ClipMode[] = [
  { ...WIDE, theme: "dark" },
  { ...WIDE, theme: "light" },
  { ...NARROW, theme: "dark" },
  { ...NARROW, theme: "light" },
];

const toModes = (): readonly ClipMode[] => {
  if (argv.includes("--quick")) {
    return MODES.slice(0, 1);
  }

  return MODES;
};

const FIX_REPORT =
  "fix the findings in apps/desktop/artifacts/clip-check/report.md, or run pnpm exec tsx scripts/check-clip.ts --write-baseline when the change is expected";

const startBrowser = async (): Promise<Browser> => {
  try {
    return await chromium.launch({
      args: [
        "--disable-site-isolation-trials",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
      channel: "chrome",
      headless: true,
    });
  } catch (error) {
    return fail(
      `Google Chrome did not start for playwright-core: ${toFirstLine(String(error))}`,
      "install Google Chrome in /Applications (the scripts use the playwright-core chrome channel); the check does not download a browser"
    );
  }
};

const startHome = async (
  page: Page,
  origin: string,
  theme: string
): Promise<void> => {
  await page.goto(`${origin}/?theme=${theme}`);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    UI_KEY,
    JSON.stringify({ activeProjectId: null }),
  ] as const);
  await page.reload();
  await page
    .locator(".project-card")
    .first()
    .waitFor({ timeout: LOAD_TIMEOUT_MS });
};

const startEditor = async (page: Page, projectId: string): Promise<void> => {
  await page
    .locator(`.project-card[data-project-id="${projectId}"] .project-open`)
    .click({ timeout: LOAD_TIMEOUT_MS });
  await page
    .frameLocator("iframe.frame.front")
    .locator("h1")
    .first()
    .waitFor({ timeout: LOAD_TIMEOUT_MS });
};

const inspectBase = async (run: ClipRun, state: string): Promise<void> => {
  await inspectState(run, state);
  await inspectTips(run, state);
  await inspectMenus(run, state);
};

const runEditor = async (run: ClipRun): Promise<number> => {
  const states = toEditorStates();

  await runEach(states, async (state) => {
    let isOpen = false;

    try {
      isOpen = await state.open(run.page);
    } catch (error) {
      console.log(`${state.name}: ${toFirstLine(String(error))}`);
    }

    if (isOpen) {
      await inspectState(run, state.name);
      await inspectTips(run, state.name);
    } else {
      await insertUnreachable(run, state.name);
    }

    await state.close(run.page);

    if (await setEditorReady(run.page)) {
      console.log(`reloaded the editor after ${state.name}`);
    }
  });

  return states.length + BASE_STATES;
};

const runMode = async (setup: ModeSetup, mode: ClipMode): Promise<number> => {
  const context = await setup.browser.newContext({
    deviceScaleFactor: 1,
    viewport: { height: mode.height, width: mode.width },
  });

  const tab = await context.newPage();

  const run: ClipRun = {
    cropDir: setup.cropDir,
    findings: setup.findings,
    menus: new Set(),
    mode: `${mode.width}x${mode.height} ${mode.theme}`,
    origin: setup.origin,
    page: tab,
    tips: new Set(),
  };

  try {
    console.log(`checking ${run.mode}`);
    await startHome(tab, setup.origin, mode.theme);
    await inspectBase(run, "home");
    await startEditor(tab, setup.seed.projectId);
    await inspectBase(run, "editor");

    return await runEditor(run);
  } finally {
    await context.close();
  }
};

const runModes = async (
  origin: string,
  cropDir: string
): Promise<ClipResult> => {
  const [seed, browser] = await Promise.all([
    createSeed(origin),
    startBrowser(),
  ]);

  const findings = new Map<string, Finding>();
  const counts: number[] = [];

  try {
    await runEach(toModes(), async (mode) => {
      counts.push(
        await runMode({ browser, cropDir, findings, origin, seed }, mode)
      );
    });
  } finally {
    await browser.close();
  }

  return {
    findings: [...findings.values()],
    stateCount: Math.max(0, ...counts),
  };
};

const runStudio = async (cropDir: string): Promise<ClipResult> => {
  const server = await startStudio(argv.includes("--skip-build"));

  try {
    return await runModes(server.origin, cropDir);
  } finally {
    await stopServer(server);
  }
};

const runGate = async (findings: readonly Finding[]): Promise<void> => {
  if (argv.includes("--write-baseline")) {
    await exportBaseline(BASELINE, findings);
    console.log(`baseline written: ${BASELINE}`);

    return;
  }

  const baseline = await getBaseline(BASELINE);

  if (baseline === null) {
    fail(
      "scripts/clip-baseline.json is missing",
      "pnpm exec tsx scripts/check-clip.ts --write-baseline"
    );
  } else {
    const rises = toRises(findings, baseline);

    if (rises.length > 0) {
      fail(
        `clip findings rose above the baseline: ${rises.join(", ")}`,
        FIX_REPORT
      );
    }
  }
};

const createOutput = async (): Promise<string> => {
  await rm(OUT, { force: true, recursive: true });
  await mkdir(CROP_DIR, { recursive: true });

  return CROP_DIR;
};

const runCheck = async (): Promise<void> => {
  const cropDir = await createOutput();
  const result = await runStudio(cropDir);
  const report = await exportReport(result.findings, OUT, result.stateCount);

  console.log(`report: ${report}`);
  console.log(JSON.stringify(toCounts(result.findings)));
  console.log(toTopLines(result.findings).join("\n"));
  await runGate(result.findings);
};

await runCli(runCheck);
