import { AllActions } from "../../../shared/actions/index.js";

interface AgentToolBinding {
  readonly lean: boolean;
  readonly name: string;
  readonly set: string;
  readonly short: string;
}

interface AgentOffBinding {
  readonly off: string;
}

interface CatalogOp {
  readonly access: "destructive" | "edit" | "read";
  readonly agent: AgentOffBinding | AgentToolBinding;
  readonly description: string;
  readonly needs: string;
}

type OpGroup = Readonly<Record<string, CatalogOp>>;

type Catalog = { readonly [Context in keyof typeof AllActions]: OpGroup };

type AgentSet = "app" | "core" | "design-system" | "kit" | "tweak";

interface AgentOpSets {
  readonly bySet: ReadonlyMap<AgentSet, string[]>;
  readonly editIds: string[];
  readonly help: Map<string, string>;
  readonly lean: Set<string>;
  readonly toolIds: string[];
  readonly writeIds: string[];
}

const AGENT_TOOL_PREFIX = "mcp__studio__";
const EDIT_PERMISSION = "project.update";

const AGENT_SETS: readonly AgentSet[] = [
  "app",
  "core",
  "design-system",
  "kit",
  "tweak",
];

const isAgentSet = (value: string): value is AgentSet =>
  AGENT_SETS.some((set) => set === value);

const setNames = (sets: AgentOpSets, binding: AgentToolBinding): string[] => {
  const names = isAgentSet(binding.set) && sets.bySet.get(binding.set);

  if (!names) {
    throw new Error(
      `Agent tool ${binding.name} has unknown set ${binding.set}. Use one of ${AGENT_SETS.join(", ")}.`
    );
  }

  return names;
};

const addOp = (
  sets: AgentOpSets,
  op: CatalogOp,
  binding: AgentToolBinding
): void => {
  const id = `${AGENT_TOOL_PREFIX}${binding.name}`;
  setNames(sets, binding).push(binding.name);
  sets.toolIds.push(id);
  sets.help.set(binding.name, op.description);

  if (binding.lean) {
    sets.lean.add(binding.name);
  }

  if (op.access === "read") {
    return;
  }

  sets.writeIds.push(id);

  if (op.needs === EDIT_PERMISSION) {
    sets.editIds.push(id);
  }
};

const deriveAgentOps = (catalog: Catalog): AgentOpSets => {
  const sets: AgentOpSets = {
    bySet: new Map(AGENT_SETS.map((set) => [set, []])),
    editIds: [],
    help: new Map(),
    lean: new Set(),
    toolIds: [],
    writeIds: [],
  };

  const ops = Object.values(catalog).flatMap((group: OpGroup) =>
    Object.values(group)
  );

  for (const op of ops) {
    if ("name" in op.agent) {
      addOp(sets, op, op.agent);
    }
  }

  return sets;
};

const AGENT_OPS: AgentOpSets = deriveAgentOps(AllActions);

export { AGENT_OPS, deriveAgentOps };

export type { AgentOpSets, AgentSet, Catalog };
