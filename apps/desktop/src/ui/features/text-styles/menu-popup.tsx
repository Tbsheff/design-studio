import { useCallback } from "react";
import type { ReactElement } from "react";

import { CreateField } from "./create-field.js";
import { MenuList } from "./menu-list.js";
import type { CurrentStyle } from "./style-match.js";
import type { TextStylesState } from "./use-text-styles.js";

type View = "closed" | "create" | "list";

interface MenuPopupProps {
  readonly canCreate: boolean;
  readonly current: CurrentStyle;
  readonly detachable: boolean;
  readonly onClose: (refocus: boolean) => void;
  readonly onView: (view: View) => void;
  readonly state: TextStylesState;
  readonly view: View;
}

const MenuPopup = (props: MenuPopupProps): ReactElement | null => {
  const { current, onClose, onView, state, view } = props;

  const handlePick = useCallback(
    (name: string): void => {
      onClose(true);
      void state.apply(name);
    },
    [onClose, state]
  );

  const handleDetach = useCallback((): void => {
    onClose(true);
    void state.detach();
  }, [onClose, state]);

  const handleCreate = useCallback(
    async (name: string): Promise<boolean> => {
      const done = await state.create(name);

      if (done) {
        onClose(true);
      }

      return done;
    },
    [onClose, state]
  );

  const showCreate = useCallback((): void => {
    onView("create");
  }, [onView]);

  const showList = useCallback((): void => {
    onView("list");
  }, [onView]);

  if (view === "closed") {
    return null;
  }

  if (view === "create") {
    return (
      <CreateField
        busy={state.busy}
        onCancel={showList}
        onCreate={handleCreate}
      />
    );
  }

  return (
    <MenuList
      canCreate={props.canCreate}
      current={current.name}
      detachable={props.detachable}
      state={state}
      onCreate={showCreate}
      onDetach={handleDetach}
      onPick={handlePick}
    />
  );
};

export { MenuPopup };

export type { View };
