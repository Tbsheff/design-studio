import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PageRow } from "./port-page-row.js";
import type { PortForm } from "./use-port-form.js";

const PageList = ({ form }: { form: PortForm }): ReactElement | null => {
  const { all, picked, toggle } = form.pages;

  if (all.length < 2) {
    return null;
  }

  const on = new Set(picked.map((page) => page.path));

  return (
    <fieldset className="export-field port-pages" aria-busy={form.plan.loading}>
      <legend className="export-label">
        {`${COPY.textPagesInThisFlow}${picked.length} ${COPY.textOf}${all.length}`}
      </legend>
      {all.map((page) => (
        <PageRow
          key={page.path}
          page={page}
          isChecked={on.has(page.path)}
          onToggle={toggle}
        />
      ))}
    </fieldset>
  );
};

export { PageList };
