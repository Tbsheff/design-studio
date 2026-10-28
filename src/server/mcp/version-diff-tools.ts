import { z } from 'zod';
import type { VersionChanges } from '../../shared/contracts.js';
import { EditError, loadTarget, studioCall } from './edit-deps.js';
import { defineTool, directionId, ok, projectId, type ToolSpec } from './edit-kit.js';

const versionId = z.string().regex(/^[0-9a-f]{40}$/, 'must be a version id from list_versions');

const schema = z
  .object({
    projectId,
    from: versionId.describe('The older version id, from list_versions.'),
    to: versionId.optional().describe('The newer version id. Leave out for the head version of the direction.'),
    directionId,
    thumbnails: z.boolean().optional().describe('Render a screenshot of both versions and a changed-pixel mask, and return their file paths. Default true.'),
  })
  .strict();

export const DIFF_VERSIONS_TEXT =
  'Compare two saved versions, the same as Compare in the studio Versions panel. Returns each changed file (path, oldPath for a rename, status added, removed, modified or renamed, additions, deletions, binary) with its unified git diff (cut at 64 KB a file, 512 KB in all, and 100 files; truncated says so). With thumbnails (default) it also returns thumbs: absolute PNG paths of a 1280x800 screenshot of each version, a mask PNG of the changed pixels and changedPct. Read only.';

const diffVersions = defineTool(
  'diff_versions',
  schema,
  { title: 'Diff two versions', description: DIFF_VERSIONS_TEXT, readOnly: true, idempotent: true },
  async (deps, input) => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    const to = input.to ?? direction.headVersionId;
    if (!to) throw new EditError('This direction has no saved version yet.');
    const query = input.thumbnails === false ? '' : '?thumbs=1';
    const changes = await studioCall<VersionChanges>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/versions/${input.from}/changes/${to}${query}`);
    return { result: ok(changes) };
  },
);

export const VERSION_DIFF_TOOLS: ToolSpec[] = [diffVersions];
