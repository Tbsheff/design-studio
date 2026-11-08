import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface OtherStyleRowProps {
  readonly prop: string;
  readonly source: string;
  readonly value: string;
}

const OtherStyleRow = ({
  prop,
  source,
  value,
}: OtherStyleRowProps): ReactElement => (
  <li className="ins-other-row" data-tip={`${prop}: ${value}\nFrom ${source}`}>
    <span className="ins-other-decl">
      <span className="prop">{prop}</span>
      {copy.text3} <span className="value">{value}</span>
    </span>
    <span className="ins-other-source">{source}</span>
  </li>
);

export { OtherStyleRow };
