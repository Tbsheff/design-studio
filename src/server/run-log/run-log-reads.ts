import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  Direction,
  Project,
  RunSentRecord,
  RunSummary,
  StudioEvent,
} from "../../shared/contracts.js";
import { NotFoundError, assertSafeId, isNodeError } from "../store/errors.js";
import { listRunSummaries, runListBody, runListQuery } from "./run-list.js";
import type { RunPage } from "./run-list.js";
import type { RunLogRuntime } from "./run-log-runtime.js";

interface RunListInput {
  readonly before?: number;
  readonly direction?: string;
  readonly light?: string;
  readonly limit?: number;
  readonly q?: string;
}

interface RunDetail {
  readonly events: StudioEvent[];
  readonly sent: RunSentRecord[];
  readonly summary: RunSummary | null;
}

const readOptional = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
};

const parseLines = (text: string): (StudioEvent | RunSentRecord)[] =>
  text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as StudioEvent | RunSentRecord);

const parseSummary = (text: string | null): RunSummary | null => {
  if (text === null) {
    return null;
  }

  return JSON.parse(text) as RunSummary;
};

const readRun = async (
  runtime: RunLogRuntime,
  rawId: string
): Promise<RunDetail> => {
  const runId = assertSafeId(rawId, "runId");
  const projectId = await runtime.findRunProject(runId);

  if (projectId === null) {
    throw new NotFoundError(`run ${runId} not found`);
  }

  const base = path.join(runtime.runsDir(projectId), runId);

  const [summaryText, eventsText] = await Promise.all([
    readOptional(`${base}.json`),
    readOptional(`${base}.jsonl`),
  ]);

  if (summaryText === null && eventsText === null) {
    throw new NotFoundError(`run ${runId} not found`);
  }

  const lines = parseLines(eventsText ?? "");

  const sent = lines.filter(
    (line): line is RunSentRecord => line.type === "run.sent"
  );

  const events = lines.filter(
    (line): line is StudioEvent => line.type !== "run.sent"
  );

  return { events, sent, summary: parseSummary(summaryText) };
};

const queryReader = (input: RunListInput) => {
  const values = new Map<string, string>();

  for (const [key, value] of Object.entries(input)) {
    values.set(key, String(value));
  }

  return (name: string): string | undefined => values.get(name);
};

const listRuns = async (
  runtime: RunLogRuntime,
  projectId: string,
  input: RunListInput
): Promise<RunPage> => {
  await runtime.projects.get(projectId);

  const query = runListQuery(queryReader(input));

  return runListBody(await listRunSummaries(runtime.runsDir(projectId)), query);
};

const readRunContext = async (
  runtime: RunLogRuntime,
  projectId: string,
  directionId: string
): Promise<object> => {
  const loaded: { direction: Direction; project: Project } =
    await runtime.loadDirection(projectId, directionId);

  return runtime.loadContext(loaded.project, loaded.direction.workTree);
};

export { listRuns, readRun, readRunContext };

export type { RunDetail, RunListInput };
