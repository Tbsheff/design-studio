import type { ReactElement } from "react";

const CrumbCurrent = ({ label }: { readonly label: string }): ReactElement => (
  <li>
    <span className="ins-crumb current" aria-current="true" data-tip={label}>
      {label}
    </span>
  </li>
);

export { CrumbCurrent };
