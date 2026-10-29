import { z } from 'zod';
import type { HunkRevertResult } from '../../shared/hunk.js';
import { loadTarget, refuseWhileRunning, studioCall } from './edit-deps.js';
import { base, defineTool, directionId, ok, projectId, versionActivity, type ToolSpec } from './edit-kit.js';

const versionId = z.string().regex(/^[0-9a-f]{40}$/, 'must be a version id from list_versions');

const schema = z
  .object({
    projectId,
    directionId,
    versionId: versionId.describe('The version that made the change, from list_versions. The hunk is from the diff of from and this version.'),
    from: versionId.optional().describe('The older version of the diff. Leave out for the parent of versionId.'),
    file: z.string().trim().min(1).max(300).describe('Project-relative path of the file, as diff_versions returns it.'),
    hunk: z.number().int().min(1).max(10_000).describe('Which change in the file to undo: 1 is the first @@ hunk of the file in diff_versions.'),
  })
  .strict();

export const REVERT_HUNK_TEXT =
  'Undo one change (one @@ hunk) of a saved version, the same as Undo this change in Compare > Code in the studio. It reverses only that hunk in the current file of the direction head and saves the result as one new version, which undo (Cmd+Z) can take back. Other changes in the file stay. When the hunk text is no longer in the file (it was undone or edited later), it changes nothing and says why. Use diff_versions first to see the hunks.';

const revertHunk = defineTool('revert_hunk', schema, { title: 'Undo one change of a version', description: REVERT_HUNK_TEXT }, async (deps, input) => {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const result = await studioCall<HunkRevertResult>(deps, 'POST', `${base(project, direction.id)}/hunks/revert`, { to: input.versionId, from: input.from, file: input.file, hunk: input.hunk });
  return {
    result: ok({ undid: `change ${result.hunk} in ${result.file}`, versionId: result.version.id, title: result.version.title, from: result.from, to: result.to }),
    activity: versionActivity(project, direction, `Undid change ${result.hunk} in ${result.file}`, result.version),
  };
});

export const HUNK_TOOLS: ToolSpec[] = [revertHunk];
