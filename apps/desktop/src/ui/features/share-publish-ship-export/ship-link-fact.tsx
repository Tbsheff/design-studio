import type { ReactElement } from "react";

interface ShipLinkFactProps {
  readonly label: string;
  readonly href: string;
}

const ShipLinkFact = ({ href, label }: ShipLinkFactProps): ReactElement => (
  <>
    <dt>{label}</dt>
    <dd>
      <a href={href} target="_blank" rel="noreferrer noopener">
        {href}
      </a>
    </dd>
  </>
);

export { ShipLinkFact };
