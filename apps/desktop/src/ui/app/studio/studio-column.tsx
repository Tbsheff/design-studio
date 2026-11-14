import { Suspense } from "react";
import type { ReactElement } from "react";

import { tipWithKey } from "../../platform/key-tip.js";
import { toColumnKeyId, toColumnTitle } from "../shell/panel-rail-model";
import { SheetFrame } from "../shell/sheet-frame";
import { COLUMN_COPY } from "./copy";
import { toColumnBody } from "./studio-column-body";
import type { StudioCtxProps } from "./studio-context";

const StudioColumn = ({ ctx }: StudioCtxProps): ReactElement => {
  const { editorColumn } = ctx.ui;
  const { closeColumn: handleClose } = ctx.panes;
  const { tab } = editorColumn;
  const title = toColumnTitle(tab);
  const closeLabel = `${COLUMN_COPY.close} ${title}`;

  return (
    <aside
      className="studio-column"
      aria-label={COLUMN_COPY.column}
      hidden={!editorColumn.isOpen}
    >
      {editorColumn.isOpen && (
        <SheetFrame
          closeLabel={closeLabel}
          closeTip={tipWithKey(closeLabel, toColumnKeyId(tab))}
          onClose={handleClose}
          tab={tab}
          title={title}
        >
          <Suspense fallback={null}>{toColumnBody(ctx, tab)}</Suspense>
        </SheetFrame>
      )}
    </aside>
  );
};

export { StudioColumn };
