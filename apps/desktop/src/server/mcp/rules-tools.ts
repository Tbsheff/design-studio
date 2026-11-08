import { runRulesTestDirectEdit } from "@design-studio/actions/direct-edit/run-rules-test";
import {
  DESIGN_RULES_TEXT_MAX,
  type DesignRule,
  type DesignRulesTestResult,
} from "@design-studio/contracts/design-rules";

import { z } from "../platform/zod-bridge/index.js";
import { callAction } from "./action-call.js";
import { loadTarget } from "./edit-guards.js";
import {
  defineTool,
  directionId,
  frameRef,
  ok,
  pagePath,
  projectId,
  type Done,
} from "./edit-kit.js";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;
const rulesText = z
  .string()
  .max(DESIGN_RULES_TEXT_MAX)
  .describe(
    'Rules, one per line. "cards: rounded-xl p-6" and "controls: h-9|h-8 rounded-md" are class rules (| gives choices, a `css selector` in backticks is a target too); "no raw hex" and "no raw values" are token-only rules; "font: Inter" is a font rule; "use Button from @/components/ui/button, not <button>" is a component rule; any other line is a free-text rule for the agent and the critic. Lines that start with # are comments.'
  );

const testSchema = z
  .object({
    projectId,
    directionId,
    text: rulesText
      .optional()
      .describe(
        "Rules to test without saving them. Leave out to test the saved rules."
      ),
    frame: frameRef
      .optional()
      .describe(
        "Frame id or @label from canvas_list. Leave out for the live frame or the first frame."
      ),
    path: pagePath,
    viewport: z.enum(["desktop", "tablet", "mobile"]).optional(),
  })
  .strict();

function outline(rule: DesignRule) {
  return {
    id: rule.id,
    kind: rule.kind,
    text: rule.text,
    checked: rule.kind !== "text",
  };
}

const testRules = defineTool(
  "test_design_rules",
  testSchema,
  {
    title: "Test design rules on a frame",
    description:
      "Check design rules on one canvas frame without saving them, with the same code path as Test in the Rules editor. Returns each rule with the number of elements that break it and up to 5 samples. Text rules are not checked. Read only.",
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(
      deps,
      input.projectId,
      input.directionId
    );
    const size = input.viewport ? VIEWPORTS[input.viewport] : {};
    const body = {
      ...(input.text === undefined ? {} : { text: input.text }),
      ...(input.frame ? { frame: input.frame } : {}),
      ...(input.path ? { path: input.path } : {}),
      ...size,
    };
    const result = await callAction<DesignRulesTestResult>(
      deps,
      runRulesTestDirectEdit,
      { ...body, directionId: direction.id, projectId: project.id }
    );
    const hits = new Map(result.hits.map((hit) => [hit.ruleId, hit]));
    const rules = result.rules.map((rule) => ({
      ...outline(rule),
      breaks: rule.kind === "text" ? null : (hits.get(rule.id)?.count ?? 0),
      samples: hits.get(rule.id)?.samples ?? [],
    }));
    return { result: ok({ frame: result.frame, rules, notes: result.notes }) };
  }
);

export const RULES_TOOLS = [testRules];
