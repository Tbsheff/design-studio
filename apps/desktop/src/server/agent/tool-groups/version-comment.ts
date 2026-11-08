import {
  listCommentsInput,
  resolveCommentInput,
  runListComments,
  runResolveComment,
} from "../comment-tools.js";
import {
  compareReferenceSdkFields,
  runCompareToReference,
} from "../reference-tool.js";
import { TOOL_SHORT } from "../tool-help.js";
import { targetDeps, toDecodedRun } from "../tools.js";
import type { StudioToolDeps, ToolFactory } from "../tools.js";
import {
  diffVersionsSdkFields,
  runDiffVersions,
} from "../version-diff-tool.js";

const toVersionCommentTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  tool(
    "diff_versions",
    TOOL_SHORT.diff_versions,
    diffVersionsSdkFields,
    (args) =>
      runDiffVersions(
        {
          headVersionId: deps.ctx.direction.headVersionId,
          runsDir: deps.runsDir,
        },
        args
      ),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "list_comments",
    TOOL_SHORT.list_comments,
    listCommentsInput.sdkFields,
    toDecodedRun(listCommentsInput.input, (args) =>
      runListComments(deps, args)
    ),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "resolve_comment",
    TOOL_SHORT.resolve_comment,
    resolveCommentInput.sdkFields,
    toDecodedRun(resolveCommentInput.input, (args) =>
      runResolveComment(deps, args)
    )
  ),
  tool(
    "compare_to_reference",
    TOOL_SHORT.compare_to_reference,
    compareReferenceSdkFields,
    (args) =>
      runCompareToReference({ ...deps, targets: targetDeps(deps) }, args),
    { annotations: { readOnlyHint: true } }
  ),
];

export { toVersionCommentTools };
