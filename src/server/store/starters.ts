import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Starter } from "../../shared/contracts.js";
import { resourcePath } from "../resources.js";
import { BadRequestError } from "./errors.js";

const STARTERS_FALLBACK = path.resolve(
  import.meta.dirname,
  "..",
  "templates",
  "starters"
);

const STARTERS_DIR = resourcePath(
  path.join("templates", "starters"),
  STARTERS_FALLBACK
);

const STARTERS: readonly Starter[] = [
  {
    description: "Hero, proof numbers, a step list and a call to action.",
    id: "landing",
    name: "Landing page",
    prompt:
      "Coffee subscription landing page, warm editorial serif, numbered steps",
  },
  {
    description: "Sidebar, KPI row, chart and data table.",
    id: "dashboard",
    name: "Dashboard",
    prompt: "Dark freight ops dashboard with KPIs, line chart, shipments table",
  },
  {
    description: "Phone screen with a streak ring, habit list and tab bar.",
    id: "mobile-app",
    name: "Mobile app",
    prompt: "Habit tracker home screen in a phone frame, soft sage",
  },
  {
    description: "Five slides: title, problem, product, traction, ask.",
    id: "deck",
    name: "Slide deck",
    prompt: "Five-slide startup pitch deck, navy and coral, bold type",
  },
  {
    description: "Booking form with sections, validation and a summary.",
    id: "form",
    name: "Form",
    prompt: "Recording studio booking form with sections and a price summary",
  },
  {
    description: "Left nav, code blocks, callouts and a page outline.",
    id: "docs",
    name: "Docs",
    prompt: "Developer docs page for webhook signatures with code samples",
  },
];

const SAMPLE_STARTER_ID = "landing";
const SAMPLE_NAME = "Sample: Kiln Coffee";
const SAMPLE_HEADLINE = "Small-lot coffee, <em>roasted to order</em>.";
const HEADLINE_PATTERN = /(?<=<h1[^>]*>)[\s\S]*?(?=<\/h1>)/u;

const findStarter = (id: string): Starter => {
  const starter = STARTERS.find((candidate) => candidate.id === id);

  if (!starter) {
    throw new BadRequestError(`unknown starter: ${id}`);
  }

  return starter;
};

const copyStarter = async (
  starter: Starter,
  workTree: string,
  root = STARTERS_DIR
): Promise<void> => {
  await cp(path.join(root, starter.id), workTree, {
    errorOnExist: false,
    force: false,
    recursive: true,
  });
};

const sampleEdit = (html: string): string =>
  html.replace(HEADLINE_PATTERN, SAMPLE_HEADLINE);

const applySampleEdit = async (workTree: string): Promise<void> => {
  const file = path.join(workTree, "index.html");
  const html = await readFile(file, "utf-8");

  await writeFile(file, sampleEdit(html));
};

export {
  SAMPLE_NAME,
  SAMPLE_STARTER_ID,
  STARTERS,
  STARTERS_DIR,
  applySampleEdit,
  copyStarter,
  findStarter,
  sampleEdit,
};
