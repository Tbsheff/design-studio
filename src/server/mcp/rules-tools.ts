import { z } from 'zod';
import { DESIGN_RULES_TEXT_MAX, type DesignRule, type DesignRulesState, type DesignRulesTestResult } from '../../shared/design-rules.js';
import type { Version } from '../../shared/contracts.js';
import { frameRef } from '../canvas/tools.js';
import { loadTarget, refuseWhileRunning, studioCall } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, projectId, versionActivity, type Done } from './edit-kit.js';

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } } as const;
const rulesText = z.string().max(DESIGN_RULES_TEXT_MAX).describe('Rules, one per line. "cards: rounded-xl p-6" and "controls: h-9|h-8 rounded-md" are class rules (| gives choices, a `css selector` in backticks is a target too); "no raw hex" and "no raw values" are token-only rules; "font: Inter" is a font rule; "use Button from @/components/ui/button, not <button>" is a component rule; any other line is a free-text rule for the agent and the critic. Lines that start with # are comments.');

const getSchema = z.object({ projectId, directionId }).strict();
const setSchema = z.object({ projectId, directionId, text: rulesText }).strict();
const testSchema = z
  .object({
    projectId,
    directionId,
    text: rulesText.optional().describe('Rules to test without saving them. Leave out to test the saved rules.'),
    frame: frameRef.optional().describe('Frame id or @label from canvas_list. Leave out for the live frame or the first frame.'),
    path: pagePath,
    viewport: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  })
  .strict();

function outline(rule: DesignRule) {
  return { id: rule.id, kind: rule.kind, text: rule.text, checked: rule.kind !== 'text' };
}

const getRules = defineTool(
  'get_design_rules',
  getSchema,
  {
    title: 'Read the design rules',
    description: 'Read the design rules of a project, the same list as the Rules editor in the Design system panel. Each rule has a kind: class, token, font and component rules are checked by review_frame; text rules go only to the studio agent and the critic. origin says where the rules come from (design-md: the rules block in DESIGN.md; studio: saved in the studio for an attached app; app-docs: a rules block in the app\'s own DESIGN.md or AGENTS.md, read only; none). imported has rules derived from the app\'s DESIGN.md and AGENTS.md that the user can accept with set_design_rules. Read only.',
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    const state = await studioCall<DesignRulesState>(deps, 'GET', `${base(project, direction.id)}/rules`);
    return { result: ok({ origin: state.origin, file: state.file, text: state.text, rules: state.rules.map(outline), imported: state.imported, importFrom: state.importFrom }) };
  },
);

const setRules = defineTool(
  'set_design_rules',
  setSchema,
  {
    title: 'Save the design rules',
    description: 'Replace the design rules of a project, with the same code path as Save in the Rules editor. In a studio project the rules go into a rules block in DESIGN.md as one version the user can undo. In an attached app they are saved in the studio data folder, never in the app repo. The next studio run and review_frame use them.',
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const saved = await studioCall<{ state: DesignRulesState; versionId: string | null; version: Version | null }>(deps, 'PUT', `${base(project, direction.id)}/rules`, { text: input.text });
    const output = ok({ origin: saved.state.origin, rules: saved.state.rules.map(outline), versionId: saved.versionId });
    return saved.version ? { result: output, activity: versionActivity(project, direction, 'Updated the design rules', saved.version) } : { result: output };
  },
);

const testRules = defineTool(
  'test_design_rules',
  testSchema,
  {
    title: 'Test design rules on a frame',
    description: 'Check design rules on one canvas frame without saving them, with the same code path as Test in the Rules editor. Returns each rule with the number of elements that break it and up to 5 samples. Text rules are not checked. Read only.',
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    const size = input.viewport ? VIEWPORTS[input.viewport] : {};
    const body = { ...(input.text !== undefined ? { text: input.text } : {}), ...(input.frame ? { frame: input.frame } : {}), ...(input.path ? { path: input.path } : {}), ...size };
    const result = await studioCall<DesignRulesTestResult>(deps, 'POST', `${base(project, direction.id)}/rules/test`, body);
    const hits = new Map(result.hits.map((hit) => [hit.ruleId, hit]));
    const rules = result.rules.map((rule) => ({ ...outline(rule), breaks: rule.kind === 'text' ? null : (hits.get(rule.id)?.count ?? 0), samples: hits.get(rule.id)?.samples ?? [] }));
    return { result: ok({ frame: result.frame, rules, notes: result.notes }) };
  },
);

export const RULES_TOOLS = [getRules, setRules, testRules];
