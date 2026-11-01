import { AllOps } from "../../../shared/contract/index.js";

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

type Catalog = { readonly [Context in keyof typeof AllOps]: OpGroup };

interface AgentOpSets {
  readonly editIds: string[];
  readonly help: Map<string, string>;
  readonly short: Map<string, string>;
  readonly toolIds: string[];
  readonly writeIds: string[];
}

const AGENT_TOOL_PREFIX = "mcp__studio__";
const EDIT_PERMISSION = "project.update";

const addOp = (
  sets: AgentOpSets,
  op: CatalogOp,
  binding: AgentToolBinding
): void => {
  const id = `${AGENT_TOOL_PREFIX}${binding.name}`;
  sets.toolIds.push(id);
  sets.help.set(binding.name, op.description);
  sets.short.set(binding.name, binding.short);

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
    editIds: [],
    help: new Map(),
    short: new Map(),
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

const AGENT_OPS: AgentOpSets = deriveAgentOps(AllOps);

export { AGENT_OPS, deriveAgentOps };

export type { AgentOpSets, Catalog };
