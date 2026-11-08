import type { ShipResult } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShipFact } from "./ship-fact.js";
import { ShipLinkFact } from "./ship-link-fact.js";
import { formatFact } from "./ship-model.js";

interface ShipResultFactsProps {
  readonly result: ShipResult;
}

const SHA_LENGTH = 12;

const ShipResultFacts = ({ result }: ShipResultFactsProps): ReactElement => (
  <dl className="ship-facts">
    <ShipFact label={copy.branch} value={result.branch} isMono tip={null} />
    <ShipFact
      label={copy.commit}
      value={result.sha.slice(0, SHA_LENGTH)}
      isMono
      tip={null}
    />
    <ShipFact
      label={copy.files2}
      value={result.files.length}
      isMono={false}
      tip={null}
    />
    {result.format && (
      <ShipFact
        label={copy.format}
        value={formatFact(result.format)}
        isMono={false}
        tip={result.format.note}
      />
    )}
    {result.pushed && (
      <ShipFact
        label={copy.pushedTo}
        value={result.remote ?? ""}
        isMono
        tip={null}
      />
    )}
    {result.prUrl && (
      <ShipLinkFact label={copy.pullRequest} href={result.prUrl} />
    )}
  </dl>
);

export { ShipResultFacts };
