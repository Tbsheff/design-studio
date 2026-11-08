import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ScreenDialogFoot } from "./screen-dialog-foot.js";
import { ScreenDialogHead } from "./screen-dialog-head.js";
import { ScreenErrorLine } from "./screen-error-line.js";
import { ScreenGroupChips } from "./screen-group-chips.js";
import { ScreenLayoutTiles } from "./screen-layout-tiles.js";
import { hasPath, toGroupOf, toPickedGroup } from "./screen-model.js";
import type { PlanGroup } from "./screen-model.js";
import { ScreenPathBlock } from "./screen-path-block.js";
import { ScreenTitleField } from "./screen-title-field.js";
import { useCreateScreen } from "./use-create-screen.js";
import { useDebouncedPath } from "./use-debounced-path.js";
import { useScreenDraft } from "./use-screen-draft.js";
import { useScreenPlan } from "./use-screen-plan.js";
import { useScreenSubmit } from "./use-screen-submit.js";

import styles from "./screen.module.css";

interface ScreenCreateFormProps {
  readonly directionId: string | null;
  readonly initialPath: string;
  readonly onClose: () => void;
  readonly projectId: string;
}

const NO_GROUPS: readonly PlanGroup[] = [];

const ScreenCreateForm = ({
  directionId,
  initialPath,
  onClose,
  projectId,
}: ScreenCreateFormProps): ReactElement => {
  const draft = useScreenDraft(initialPath);
  const lookup = useDebouncedPath(draft.path);
  const plan = useScreenPlan(projectId, lookup);
  const create = useCreateScreen();
  const { group, layout, path, title } = draft;
  const { run } = create;

  const send = useCallback(
    () => run({ directionId, group, layout, path, projectId, title }),
    [directionId, group, layout, path, projectId, run, title]
  );

  const submit = useScreenSubmit(send, onClose);
  const defaultName = toPickedGroup(plan.data);
  const pickedName = group ?? defaultName;
  const isTaken = plan.data !== null && !plan.data.isPathFree;

  const isReady =
    hasPath(path) && lookup === path && plan.data !== null && !isTaken;

  const isBusy = submit.isPending || create.pending;

  return (
    <form className={styles.form} noValidate onSubmit={submit.handleSubmit}>
      <ScreenDialogHead onClose={onClose} title={copy.title} />
      <ScreenPathBlock
        error={plan.error}
        isLoading={plan.loading || lookup !== path}
        label={copy.pathLabel}
        onChange={draft.handlePath}
        plan={plan.data}
        showFile={pickedName === defaultName}
        value={path}
      />
      <ScreenGroupChips
        groups={plan.data?.groups.items ?? NO_GROUPS}
        onPick={draft.handleGroup}
        picked={toGroupOf(plan.data, pickedName)}
      />
      <ScreenLayoutTiles onPick={draft.handleLayout} picked={layout} />
      <ScreenTitleField onChange={draft.handleTitle} value={title} />
      <ScreenErrorLine error={create.error} />
      <ScreenDialogFoot
        isDisabled={!isReady || isBusy}
        label={copy.create}
        onClose={onClose}
      />
    </form>
  );
};

export { ScreenCreateForm };
