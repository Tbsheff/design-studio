import { DESIGN_RULES_MAX } from "@design-studio/contracts/design-rules";
import type { DesignRule } from "@design-studio/contracts/design-rules";
import type { Effect } from "effect";

import { runDirectionWrite } from "../direct-edit/index.js";
import type { DirectionIds } from "../direct-edit/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { BadRequestError } from "../platform/errors/index.js";
import { isTestable, parseRules } from "./parse.js";
import { loadDesignRules, saveDesignRules } from "./store.js";

interface CreateDesignRuleCommand extends DirectionIds {
  readonly line: string;
  readonly model: string;
}

interface DesignRuleCreated {
  readonly isChecked: boolean;
  readonly kind: DesignRule["kind"];
  readonly line: string;
  readonly model: string;
  readonly ruleCount: number;
  readonly ruleId: string;
}

const NO_RULE_MESSAGE = "Say what to always or never do";

const FULL_MESSAGE = `This project has ${DESIGN_RULES_MAX} rules. Delete one in the Review rules editor first.`;

const runDesignRuleCreate = (
  command: CreateDesignRuleCommand
): Effect.Effect<DesignRuleCreated, KnownFailure> =>
  runDirectionWrite<DesignRuleCreated, never>(
    command,
    async ({ direction, project, runtime }): Promise<DesignRuleCreated> => {
      const place = {
        direction,
        project,
        studioDir: runtime.projectDir(project.id),
      };

      const state = await loadDesignRules(place);
      const [rule] = parseRules(command.line);

      if (!rule) {
        throw new BadRequestError(NO_RULE_MESSAGE);
      }

      const created: DesignRuleCreated = {
        isChecked: isTestable(rule),
        kind: rule.kind,
        line: rule.text,
        model: command.model,
        ruleCount: state.rules.length,
        ruleId: rule.id,
      };

      if (state.rules.some((known) => known.id === rule.id)) {
        return created;
      }

      if (state.rules.length >= DESIGN_RULES_MAX) {
        throw new BadRequestError(FULL_MESSAGE);
      }

      const text = `${state.text.trimEnd()}\n${rule.text}`.trimStart();
      const saved = await saveDesignRules(place, text);

      if (saved.inRepo) {
        await runtime.commitDesignMd(project, direction);
      }

      return { ...created, ruleCount: parseRules(text).length };
    },
    () => null
  );

export { runDesignRuleCreate };

export type { CreateDesignRuleCommand, DesignRuleCreated };
