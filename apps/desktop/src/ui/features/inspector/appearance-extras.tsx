import type { ReactElement } from "react";

import type { DirectEdit } from "./deps.js";
import { CssTextRow } from "./inspector-rows.js";
import { RevealButton } from "./reveal-button.js";
import { EXTRAS, EXTRA_ROWS } from "./simple-model.js";
import type { Extra } from "./simple-model.js";

interface AppearanceExtrasProps {
  readonly edit: DirectEdit;
  readonly extras: Set<Extra>;
  readonly onReveal: (extra: Extra) => void;
}

const AppearanceExtras = ({
  edit,
  extras,
  onReveal,
}: AppearanceExtrasProps): ReactElement => {
  const hidden = EXTRAS.filter((entry) => !extras.has(entry.id));
  const rows = EXTRA_ROWS.filter((row) => extras.has(row.extra));

  return (
    <>
      {rows.map((row) => (
        <CssTextRow
          key={row.extra}
          prop={row.prop}
          label={row.label}
          short={row.label}
          edit={edit}
          placeholder={row.placeholder}
        />
      ))}
      {hidden.length > 0 && (
        <div className="ins-add-row">
          {hidden.map((entry) => (
            <RevealButton
              key={entry.id}
              extra={entry.id}
              label={entry.label}
              onReveal={onReveal}
            />
          ))}
        </div>
      )}
    </>
  );
};

export { AppearanceExtras };
