import type { Direction, Project, Version } from '../../shared/contracts.js';
import { cleanExportPath, EXPORT_FRAME_MAX_SIDE, EXPORT_MAX_FRAMES, EXPORT_SCALES, type ExportFrame, type ExportScale } from '../../shared/export.js';
import { BadRequestError, NotFoundError, assertSafeId } from '../store/errors.js';
import type { PreviewService, ProjectStore, VersionStore } from '../types.js';

export interface ExportDeps {
  projects: ProjectStore;
  versions: VersionStore;
  preview: PreviewService;
}

export interface ExportSource {
  project: Project;
  direction: Direction;
  version: Version;
  root: string;
  open(): Promise<{ url: string; release: () => Promise<void> }>;
}

export async function resolveSource(deps: ExportDeps, projectId: string, versionId: string): Promise<ExportSource> {
  const project = await deps.projects.get(assertSafeId(projectId, 'projectId'));
  const version = await deps.versions.get(project, assertSafeId(versionId, 'versionId'));
  const direction = project.directions.find((d) => d.id === version.directionId) ?? project.directions[0];
  if (!direction) throw new NotFoundError('project has no direction');
  const live = direction.headVersionId === version.id && !(await deps.versions.status(project, direction)).dirty;
  if (live) {
    return {
      project,
      direction,
      version,
      root: direction.workTree,
      open: async () => ({ url: await deps.preview.directionUrl(project, direction), release: async () => undefined }),
    };
  }
  const root = await deps.versions.snapshot(project, version.id);
  return {
    project,
    direction,
    version,
    root,
    open: async () => {
      if (deps.preview.snapshotShot) return deps.preview.snapshotShot(project, version.id, root);
      return { url: await deps.preview.snapshotUrl(project, version.id, root), release: async () => undefined };
    },
  };
}

export function withPagePath(url: string, pagePath: string | undefined): string {
  if (!pagePath) return url;
  const base = new URL(url);
  if (!base.pathname.endsWith('/')) base.pathname = base.pathname.replace(/[^/]*$/, '');
  const next = new URL(pagePath, base);
  next.search = base.search;
  return next.toString();
}

function side(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > EXPORT_FRAME_MAX_SIDE) throw new BadRequestError(`${label} must be 1 to ${EXPORT_FRAME_MAX_SIDE}`);
  return value;
}

export function parseFrame(raw: unknown): ExportFrame {
  if (typeof raw !== 'object' || raw === null) throw new BadRequestError('frame must be an object');
  const record = raw as Record<string, unknown>;
  const name = typeof record.name === 'string' && record.name.trim() !== '' ? record.name.trim().slice(0, 60) : 'Frame';
  const frame: ExportFrame = { name, width: side(record.width, 'width'), height: side(record.height, 'height') };
  if (record.path !== undefined && record.path !== null) {
    if (typeof record.path !== 'string') throw new BadRequestError('path must be a string');
    const cleaned = cleanExportPath(record.path);
    if (cleaned === null) throw new BadRequestError('path is not a page in this project');
    if (cleaned) frame.path = cleaned;
  }
  return frame;
}

export function parseFrames(raw: unknown): ExportFrame[] {
  if (!Array.isArray(raw) || raw.length === 0) return [{ name: 'Desktop', width: 1440, height: 900 }];
  if (raw.length > EXPORT_MAX_FRAMES) throw new BadRequestError(`at most ${EXPORT_MAX_FRAMES} frames`);
  return raw.map(parseFrame);
}

export function parseScale(raw: unknown): ExportScale {
  if (raw === undefined) return 1;
  if (!EXPORT_SCALES.includes(raw as ExportScale)) throw new BadRequestError('scale must be 1, 2 or 3');
  return raw as ExportScale;
}
