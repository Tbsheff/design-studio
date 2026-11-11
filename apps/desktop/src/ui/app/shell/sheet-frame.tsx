import { SheetSlot } from "@design-studio/ui";
import { useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import type { PanelTab } from "../../platform/panel-tab";
import { SheetHead } from "./sheet-head";

interface SheetFrameProps {
  readonly children: ReactNode;
  readonly closeLabel: string;
  readonly closeTip: string;
  readonly onClose: () => void;
  readonly tab: PanelTab;
  readonly title: string;
}

const SheetFrame = ({
  children,
  closeLabel,
  closeTip,
  onClose,
  tab,
  title,
}: SheetFrameProps): ReactElement => {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const sheet = useMemo(() => ({ slot }), [slot]);

  return (
    <section
      className={`pane-sheet pane-sheet-${tab}`}
      aria-labelledby={`${tab}-heading`}
    >
      <SheetSlot.Provider value={sheet}>
        <SheetHead
          closeLabel={closeLabel}
          closeTip={closeTip}
          id={`${tab}-heading`}
          title={title}
          onClose={onClose}
          onSlot={setSlot}
        />
        <div className="pane-sheet-body">{children}</div>
      </SheetSlot.Provider>
    </section>
  );
};

export { SheetFrame };
