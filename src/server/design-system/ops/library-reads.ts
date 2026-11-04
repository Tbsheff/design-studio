import type {
  DesignSystemItem,
  DraftStatus,
} from "../../../shared/actions/pack/schema.js";
import type {
  DesignSystemCoverage,
  DesignSystemDraftInfo,
  DraftSourceStatus,
  DraftSourcesState,
  PackSummary,
  Project,
} from "../../../shared/contracts.js";
import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import { checkDesignSystem } from "../check.js";
import { readCoverage } from "../draft-project.js";
import type { PackRuntime } from "./library-core.js";

interface DraftTarget {
  readonly info: DesignSystemDraftInfo;
  readonly project: Project;
}

interface ItemPage {
  readonly items: readonly DesignSystemItem[];
  readonly next: string | null;
}

type StatusSource = DraftStatus["sources"];

type StatusCoverage = DraftStatus["coverage"];

type StatusItem = NonNullable<StatusSource>["items"][number];

const SWATCH_MAX = 6;

const NOT_A_DRAFT =
  "This project is not a design system draft. Use create_design_system, or list_design_systems for saved ones.";

const NOT_A_DESIGN_SYSTEM = "This project is not a design-system project";

const toItem = (
  pack: PackSummary,
  projects: readonly Project[]
): DesignSystemItem => {
  const backing = projects.find(
    (project) =>
      project.designSystemFor === pack.id && !project.designSystemDeleted
  );

  const item: DesignSystemItem = {
    draft: pack.draft === true,
    fonts: pack.fonts,
    id: pack.id,
    mode: pack.mode,
    name: pack.name,
    source: pack.source,
    swatches: pack.swatches.slice(0, SWATCH_MAX),
  };

  if (!backing) {
    return item;
  }

  return { ...item, projectId: backing.id };
};

const listItems = async (
  runtime: PackRuntime,
  isDraftShown: boolean
): Promise<DesignSystemItem[]> => {
  const [packs, projects] = await Promise.all([
    runtime.library.registry.list(),
    runtime.projects.list(),
  ]);

  const items: DesignSystemItem[] = [];

  for (const pack of packs) {
    if (isDraftShown || !pack.draft) {
      items.push(toItem(pack, projects));
    }
  }

  return items;
};

const readSources = async (
  runtime: PackRuntime,
  projectId: string
): Promise<DraftSourcesState | null> => {
  if (runtime.live === null) {
    return null;
  }

  return (await runtime.live.read(projectId)) ?? null;
};

const infoOf = async (
  runtime: PackRuntime,
  project: Project,
  packId: string
): Promise<DesignSystemDraftInfo> => {
  const { workTree } = runtime.projects.mainDirection(project);

  const [check, coverage, sources] = await Promise.all([
    checkDesignSystem(workTree),
    readCoverage(workTree),
    readSources(runtime, project.id),
  ]);

  return { check, coverage, packId, sources };
};

const readDraftInfo = async (
  runtime: PackRuntime,
  projectId: string
): Promise<DesignSystemDraftInfo> => {
  const project = await runtime.projects.get(projectId);

  if (!project.designSystemFor) {
    throw new NotFoundError(NOT_A_DESIGN_SYSTEM);
  }

  return infoOf(runtime, project, project.designSystemFor);
};

const readDraftTarget = async (
  runtime: PackRuntime,
  projectId: string
): Promise<DraftTarget> => {
  const project = await runtime.projects.get(projectId);

  if (!project.designSystemFor) {
    throw new BadRequestError(NOT_A_DRAFT);
  }

  return {
    info: await infoOf(runtime, project, project.designSystemFor),
    project,
  };
};

const mainIdOf = (project: Project): string => {
  const main =
    project.directions.find((direction) => direction.id === "main") ??
    project.directions[0];

  return main?.id ?? "main";
};

const toStatusItem = (source: DraftSourceStatus): StatusItem => {
  const item: StatusItem = {
    detail: source.detail,
    kind: source.kind,
    label: source.label,
    state: source.state,
  };

  if (!source.note) {
    return item;
  }

  return Object.assign(item, { note: source.note });
};

const toStatusSources = (sources: DraftSourcesState | null): StatusSource => {
  if (sources === null) {
    return null;
  }

  return {
    done: sources.done,
    improve: sources.improve,
    items: sources.sources.map((source) => toStatusItem(source)),
  };
};

const toStatusCoverage = (
  coverage: DesignSystemCoverage | null
): StatusCoverage => {
  if (coverage === null) {
    return null;
  }

  return {
    fallbacks: coverage.fallbacks,
    grade: coverage.grade,
    score: coverage.score,
  };
};

const toStatus = (runtime: PackRuntime, target: DraftTarget): DraftStatus => {
  const { info, project } = target;

  return {
    check: info.check,
    coverage: toStatusCoverage(info.coverage),
    packId: info.packId,
    running: runtime.runner.isRunning(project.id, mainIdOf(project)),
    sources: toStatusSources(info.sources ?? null),
  };
};

const readDraftStatus = async (
  runtime: PackRuntime,
  projectId: string
): Promise<DraftStatus> =>
  toStatus(runtime, await readDraftTarget(runtime, projectId));

const toStart = (cursor: string | null): number => {
  const start = Math.trunc(Number(cursor ?? "0"));

  if (Number.isNaN(start) || start < 0) {
    return 0;
  }

  return start;
};

interface Page<Item> {
  readonly items: readonly Item[];
  readonly next: string | null;
}

const toPage = <Item>(
  list: readonly Item[],
  cursor: string | null,
  limit: number
): Page<Item> => {
  const start = toStart(cursor);
  const end = start + limit;
  const items = list.slice(start, end);

  if (end >= list.length) {
    return { items, next: null };
  }

  return { items, next: String(end) };
};

const toItemPage = (
  list: readonly DesignSystemItem[],
  cursor: string | null,
  limit: number
): ItemPage => toPage(list, cursor, limit);

export { listItems, readDraftInfo, readDraftStatus, toItemPage, toPage };

export type { ItemPage, Page };
