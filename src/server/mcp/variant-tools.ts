import { z } from 'zod';
import type { Version } from '../../shared/contracts.js';
import { EditError, studioCall } from './edit-deps.js';
import { defineTool, ok, projectId, versionActivity, type ToolSpec } from './edit-kit.js';

const keepInput = z
  .object({
    projectId,
    groupId: z.string().min(1).max(64).describe('Variant group id from list_variants.'),
    directionId: z.string().min(1).max(64).describe('Direction id of the variant to keep, from list_variants.'),
  })
  .strict();

const keepVariant = defineTool(
  'keep_variant',
  keepInput,
  {
    title: 'Keep element variant',
    description:
      'Apply one element variant to the design it came from, as one new version, and discard the other variants of its group. Use list_variants first: only a variant in state "ready" can be kept. This tool cannot start variant runs; the user starts them in the studio.',
  },
  async (deps, input) => {
    const project = await deps.projects.get(input.projectId);
    const variant = project.directions.find((d) => d.id === input.directionId);
    if (!variant?.variation?.scope || variant.variation.groupId !== input.groupId) throw new EditError('No element variant with that groupId and directionId. Call list_variants.');
    const kept = await studioCall<{ versionId: string; directionId: string; label: string }>(deps, 'POST', `/api/projects/${encodeURIComponent(project.id)}/variations/${encodeURIComponent(input.groupId)}/keep`, { directionId: input.directionId });
    const latest = await deps.projects.get(project.id);
    const target = latest.directions.find((d) => d.id === kept.directionId);
    const version: Version | null = target ? await deps.versions.get(latest, kept.versionId).catch(() => null) : null;
    return {
      result: ok({ kept: kept.label, versionId: kept.versionId, directionId: kept.directionId }),
      ...(target ? { activity: versionActivity(latest, target, `Kept element variant ${kept.label}`, version) } : {}),
    };
  },
);

export const VARIANT_TOOLS: ToolSpec[] = [keepVariant];
