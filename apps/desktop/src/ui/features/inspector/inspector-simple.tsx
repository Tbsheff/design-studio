import type { TailwindOutcome } from "@design-studio/contracts";
import { startTransition, useCallback, useEffect, useMemo } from "react";
import type { ReactElement } from "react";

import { CopyCodeMenu } from "../share-publish-ship-export/copy-code-menu.js";
import { CreateTokenHost } from "./create-token-host.js";
import type { StyleValues } from "./css-value-model.js";
import type { ElementClasses } from "./element-classes-model.js";
import { SAVE_SETTLE_MS } from "./save-model.js";
import { SimpleContexts } from "./simple-contexts.js";
import { SimpleEditorBody } from "./simple-editor-body.js";
import { toSavedAt } from "./simple-model.js";
import type { SimpleEditorProps, SimpleEditorState } from "./simple-model.js";
import type { ScopeInput } from "./token-scope-model.js";
import { useAuthoredCss } from "./use-authored-css.js";
import { useDirectEdit } from "./use-direct-edit.js";
import { useEditVariant } from "./use-edit-variant.js";
import { useElementClasses } from "./use-element-classes.js";
import { useInspectorTokens } from "./use-inspector-tokens.js";
import { useSettled } from "./use-settled.js";

const toClassInfo = (
  classes: ElementClasses,
  hasComponent: boolean
): TailwindOutcome | null => {
  if (classes.element?.component && !hasComponent) {
    return null;
  }

  return classes.tailwind;
};

const toClassLine = (
  info: TailwindOutcome | null,
  note: string | null
): TailwindOutcome | null => {
  if (info && note) {
    return { ...info, note };
  }

  return info;
};

const useSimpleEditor = (props: SimpleEditorProps): SimpleEditorState => {
  const variant = useEditVariant();

  const scope: ScopeInput = {
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    projectId: props.projectId,
    selection: props.target,
    tokens: props.tokens,
  };

  const tokens = useInspectorTokens(scope);

  const edit = useDirectEdit({
    control: props.control,
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    onStale: props.onStale,
    port: props.port,
    projectId: props.projectId,
    rewrite: tokens.ui && tokens.snap.rewrite,
    selection: props.target,
    variant,
  });

  const authored = useAuthoredCss(props.port, props.target.selector);
  const savedAt = useSettled(toSavedAt(edit.status), SAVE_SETTLE_MS);
  const refreshAuthored = authored.request;

  useEffect(() => {
    if (savedAt) {
      startTransition(async () => {
        await refreshAuthored();
      });
    }
  }, [savedAt, refreshAuthored]);

  const keepRaw = useCallback(
    (raw: Partial<StyleValues>) => {
      tokens.snap.keepRaw(raw);
      edit.preview(raw);
      edit.commit();
    },
    [tokens.snap, edit]
  );

  const { directionId, projectId } = props;
  const { source } = props.target;

  const classes = useElementClasses({
    directionId,
    projectId,
    savedAt,
    source,
    variant,
  });

  const classLine = toClassLine(
    toClassInfo(classes, Boolean(props.target.component)),
    edit.tailwind?.note ?? null
  );

  const variantProps = classes.variants?.props;

  const variantScope = useMemo(
    () => ({ prefix: variant, props: new Set(variantProps) }),
    [variant, variantProps]
  );

  return {
    authored,
    classLine,
    classes,
    edit,
    keepRaw,
    scope,
    tokens,
    variantScope,
  };
};

const SimpleEditor = (props: SimpleEditorProps): ReactElement => {
  const state = useSimpleEditor(props);
  const { projectId, directionId, target } = props;
  const { edit, tokens, scope } = state;
  const handleCommitted = scope.onCommitted;
  const handleClose = tokens.closeCreate;

  const exportMenu = useMemo(
    () => (
      <CopyCodeMenu
        projectId={projectId}
        directionId={directionId}
        selector={target.selector}
        variant="row"
      />
    ),
    [projectId, directionId, target.selector]
  );

  return (
    <SimpleContexts
      element={state.classes.element}
      variantScope={state.variantScope}
      tokenUi={tokens.ui}
    >
      <SimpleEditorBody props={props} state={state} exportMenu={exportMenu} />
      <CreateTokenHost
        directionId={scope.directionId}
        onCommitted={handleCommitted}
        projectId={scope.projectId}
        selection={scope.selection}
        tokens={scope.tokens}
        edit={edit}
        request={tokens.creating}
        onClose={handleClose}
      />
    </SimpleContexts>
  );
};

export { SimpleEditor };
