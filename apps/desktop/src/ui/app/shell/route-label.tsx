import type { ReactElement } from "react";

interface RouteLabelProps {
  readonly file: string;
  readonly route: string;
}

const RouteLabel = ({ file, route }: RouteLabelProps): ReactElement => (
  <span>
    <span className="mono">{route}</span>
    <span className="file"> {file}</span>
  </span>
);

export { RouteLabel };
