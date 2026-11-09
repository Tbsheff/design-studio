import { Layer } from "effect";

import { DesignRuleWriter } from "../../design-rules/index.js";
import { DesignRuleLineRunner } from "../../project-ops/index.js";

const DesignRuleLive = Layer.mergeAll(
  DesignRuleLineRunner.layer,
  DesignRuleWriter.layer
);

export { DesignRuleLive };
