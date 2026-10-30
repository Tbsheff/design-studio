import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { diffVersionFiles } from '../store/version-diff.js';
import { runGit } from '../store/versions.js';
import { DIFF_VERSIONS_TEXT } from '../mcp/version-diff-tools.js';
import { versionThumbName } from '../thumbnails.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

const sha = z.string().regex(/^[0-9a-f]{40}$/, 'must be a version id');

export const diffVersionsShape = {
  from: sha.describe('The older version id.'),
  to: sha.optional().describe('The newer version id. Leave out for the head version of this direction.'),
};

export const DIFF_VERSIONS_DESCRIPTION = `${DIFF_VERSIONS_TEXT.replace(/ With thumbnails[^.]*\./, '').replace(/ Read only\.$/, '')} thumbs gives the paths of version screenshots the studio already saved (null when there is none yet). Read only.`;

interface DiffDeps {
  runsDir: string;
  headVersionId: string | null;
}

function text(message: string, isError = false): ToolText {
  return { content: [{ type: 'text', text: message }], ...(isError ? { isError: true } : {}) };
}

export async function runDiffVersions(deps: DiffDeps, args: { from: string; to?: string | undefined }): Promise<ToolText> {
  const parsed = z.object(diffVersionsShape).strict().safeParse(args);
  if (!parsed.success) return text(`diff_versions: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')}`, true);
  const to = parsed.data.to ?? deps.headVersionId;
  if (!to) return text('diff_versions: this direction has no saved version yet.', true);
  const projectDir = path.dirname(deps.runsDir);
  const thumb = (id: string): string | null => {
    const file = path.join(projectDir, 'thumbs', versionThumbName(id));
    return existsSync(file) ? file : null;
  };
  try {
    const changes = await diffVersionFiles(async (gitArgs) => (await runGit({ gitDir: path.join(projectDir, 'git') }, gitArgs)).stdout, parsed.data.from, to);
    return text(JSON.stringify({ ...changes, thumbs: { from: thumb(parsed.data.from), to: thumb(to) } }, null, 2));
  } catch (error) {
    return text(`diff_versions failed: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}
