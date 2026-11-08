import type { ReactElement } from "react";
import { useCallback } from "react";

import type { ComposerSubmit } from "./comment-composer-model.js";
import { breadcrumbOf } from "./comment-placement.js";
import type { PinOffset } from "./comment-placement.js";
import type { SelectionContext } from "./deps.js";
import { focusLater } from "./focus-later.js";
import { LayerComposer } from "./layer-composer.js";
import type { LayerShared } from "./layer-composer.js";
import { submitComment } from "./submit-comment.js";

const PickComposer = ({
  offset,
  pick,
  setPick,
  shared,
}: {
  offset: PinOffset | undefined;
  pick: SelectionContext;
  setPick: (selection: SelectionContext | null) => void;
  shared: LayerShared;
}): ReactElement => {
  const { control, tools } = shared;

  const finish = useCallback((): void => {
    setPick(null);
    focusLater(".stage");
  }, [setPick]);

  const submit = useCallback(
    (input: ComposerSubmit): Promise<boolean> =>
      submitComment(
        { control, tools },
        { finish, offset, selections: [pick] },
        input
      ),
    [control, finish, offset, pick, tools]
  );

  return (
    <LayerComposer
      key={pick.selector}
      anchor={pick.rect}
      shouldFocus
      breadcrumb={breadcrumbOf(tools.pageName, [pick])}
      draftKey={`pick:${pick.selector}`}
      label="New comment"
      offset={offset}
      onCancel={finish}
      onSubmit={submit}
      shared={shared}
      testId="comment-compose"
      trap
    />
  );
};

export { PickComposer };
