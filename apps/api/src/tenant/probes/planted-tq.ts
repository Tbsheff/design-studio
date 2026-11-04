import { TenantViolation } from "../errors/tenant-violation.js";
import { tq } from "../sql.js";

interface PlantedProbe {
  readonly name: string;
  readonly reason: string;
  readonly run: () => void;
}

interface ProbeResult {
  readonly isRefused: boolean;
  readonly message: string;
  readonly name: string;
}

const PLANTED: readonly PlantedProbe[] = [
  {
    name: "or-at-top-level",
    reason: "an OR at the top level",
    run: () => tq<{ readonly id: string }>`
      SELECT p.org_id, p.id, p.name
      FROM project p
      WHERE p.org_id = :org OR p.id = ?`,
  },
  {
    name: "insert-select-json-each",
    reason: "json_each is not allowed",
    run: () => tq`
      INSERT INTO project (org_id, id, name, kind, created_at, updated_at)
      SELECT value->>'org_id', value->>'id', value->>'name', 'design', 0, 0
      FROM json_each(?)`,
  },
  {
    name: "cte",
    reason: "with is not allowed",
    run: () => tq`
      WITH mine AS (SELECT p.id FROM project p WHERE p.org_id = :org)
      SELECT m.id FROM mine m`,
  },
];

const runProbe = (probe: PlantedProbe): ProbeResult => {
  try {
    probe.run();

    return { isRefused: false, message: "tq accepted it", name: probe.name };
  } catch (error) {
    const isViolation = error instanceof TenantViolation;
    const message = String(error);

    const isRefused = isViolation && message.includes(probe.reason);

    return { isRefused, message, name: probe.name };
  }
};

const runPlantedProbes = (): readonly ProbeResult[] =>
  PLANTED.map((probe) => runProbe(probe));

export { PLANTED, runPlantedProbes };

export type { PlantedProbe, ProbeResult };
