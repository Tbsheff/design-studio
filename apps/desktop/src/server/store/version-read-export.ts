import type { VersionReadRuntime } from "./version-read-core.js";

interface VersionPreviewView {
  readonly url: string;
}

interface VersionExportView {
  readonly base64: string;
  readonly fileName: string;
}

const FILE_NAME_FALLBACK = "design";

const SHORT_ID_LENGTH = 8;

const DASH = "-";

const toTrimmedStem = (value: string): string => {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === DASH) {
    start += 1;
  }

  while (end > start && value[end - 1] === DASH) {
    end -= 1;
  }

  return value.slice(start, end);
};

const toSafeFileStem = (name: string): string => {
  const stem = toTrimmedStem(name.replaceAll(/[^A-Za-z0-9._-]+/gu, DASH));

  if (stem === "") {
    return FILE_NAME_FALLBACK;
  }

  return stem;
};

const inspectPreview = async (
  runtime: VersionReadRuntime,
  projectId: string,
  versionId: string
): Promise<VersionPreviewView> => {
  const project = await runtime.projects.get(projectId);
  const snapshotDir = await runtime.versions.snapshot(project, versionId);

  return {
    url: await runtime.preview.snapshotUrl(project, versionId, snapshotDir),
  };
};

const exportVersionZip = async (
  runtime: VersionReadRuntime,
  projectId: string,
  versionId: string
): Promise<VersionExportView> => {
  const project = await runtime.projects.get(projectId);
  const version = await runtime.versions.get(project, versionId);
  const bytes = await runtime.versions.exportZip(project, version.id);

  return {
    base64: Buffer.from(bytes).toString("base64"),
    fileName: `${toSafeFileStem(project.name)}-${version.id.slice(0, SHORT_ID_LENGTH)}.zip`,
  };
};

export { exportVersionZip, inspectPreview };

export type { VersionExportView, VersionPreviewView };
