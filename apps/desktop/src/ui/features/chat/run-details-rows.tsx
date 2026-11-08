import type { ReactElement } from "react";

const RunDetailsRows = ({
  rows,
}: {
  rows: [string, string][];
}): ReactElement => (
  <dl className="kv">
    {rows.map(([name, value]) => (
      <div key={name}>
        <dt>{name}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

export { RunDetailsRows };
