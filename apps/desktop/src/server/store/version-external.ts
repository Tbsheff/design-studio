import type { Project, WorkTreeStatus } from "@design-studio/contracts";

const APP_STUDIO_EXCLUDES = [".studio/"];

const EXTERNAL_EXCLUDES = [
  "*.onnx",
  "*.mlmodelc/",
  "*.mlpackage/",
  "*.sqlite",
  "*.db",
  "*.m4a",
  "*.mp3",
  "*.wav",
  "*.mp4",
  "*.mov",
  "*.zip",
  "*.tar",
  "*.tgz",
  "*.gz",
  ".env",
  ".env.*",
  "!.env.example",
  "*.pem",
  "*.key",
];

const STUDIO_DIR_LINE = /^\/?\.studio(?:\/\*{0,2})?$/u;

const FIXTURE_DIR_LINE = /^\/?%5F%5Fstudio-fixture\/?$/u;

const isExternalTree = (project: Project): boolean =>
  Boolean(project.app) ||
  (project.imported !== null && project.imported.created !== true);

const toCleanStatus = (): WorkTreeStatus => ({ changed: [], dirty: false });

const toStudioExcludes = (project: Project): readonly string[] => {
  if (project.app) {
    return [...EXTERNAL_EXCLUDES, ...APP_STUDIO_EXCLUDES];
  }

  return EXTERNAL_EXCLUDES;
};

const toRepoExcludeLines = (
  project: Project,
  lines: readonly string[]
): string[] => {
  const kept = lines.filter((line) => !FIXTURE_DIR_LINE.test(line));

  if (project.app) {
    return kept;
  }

  return kept.filter((line) => !STUDIO_DIR_LINE.test(line));
};

export { isExternalTree, toCleanStatus, toRepoExcludeLines, toStudioExcludes };
