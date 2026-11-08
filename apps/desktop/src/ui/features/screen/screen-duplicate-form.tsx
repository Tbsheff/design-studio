import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { ScreenDialogFoot } from "./screen-dialog-foot.js";
import { ScreenDialogHead } from "./screen-dialog-head.js";
import { ScreenErrorLine } from "./screen-error-line.js";
import { hasPath, toCopyPath } from "./screen-model.js";
import { ScreenPathBlock } from "./screen-path-block.js";
import { ScreenSourceLine } from "./screen-source-line.js";
import { useDuplicateScreen } from "./use-duplicate-screen.js";
import { useScreenPlan } from "./use-screen-plan.js";
import { useScreenSubmit } from "./use-screen-submit.js";

import styles from "./screen.module.css";

interface ScreenDuplicateFormProps {
  readonly directionId: string | null;
  readonly from: string;
  readonly onClose: () => void;
  readonly projectId: string;
}

const ScreenDuplicateForm = ({
  directionId,
  from,
  onClose,
  projectId,
}: ScreenDuplicateFormProps): ReactElement => {
  const initial = useMemo(() => toCopyPath(from), [from]);
  const [path, setPath] = useState(initial);
  const plan = useScreenPlan(projectId, path);
  const duplicate = useDuplicateScreen();
  const { run } = duplicate;

  const handlePath = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setPath(event.target.value),
    []
  );

  const send = useCallback(
    () => run({ directionId, from, path, projectId }),
    [directionId, from, path, projectId, run]
  );

  const submit = useScreenSubmit(send, onClose);
  const isTaken = plan.data !== null && !plan.data.isPathFree;
  const isReady = hasPath(path) && plan.data !== null && !isTaken;
  const isBusy = submit.isPending || duplicate.pending;

  return (
    <form className={styles.form} noValidate onSubmit={submit.handleSubmit}>
      <ScreenDialogHead onClose={onClose} title={copy.copyTitle} />
      <ScreenSourceLine from={from} />
      <ScreenPathBlock
        error={plan.error}
        isLoading={plan.loading}
        label={copy.copyToLabel}
        onChange={handlePath}
        plan={plan.data}
        showFile
        value={path}
      />
      <ScreenErrorLine error={duplicate.error} />
      <ScreenDialogFoot
        isDisabled={!isReady || isBusy}
        label={copy.copySubmit}
        onClose={onClose}
      />
    </form>
  );
};

export { ScreenDuplicateForm };
