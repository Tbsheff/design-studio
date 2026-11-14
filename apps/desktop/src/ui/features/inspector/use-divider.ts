import { routes as spacingRoutes } from "@design-studio/actions/spacing/routes";
import type { SelectionContext, SourceLoc } from "@design-studio/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FocusEvent, KeyboardEvent, MutableRefObject } from "react";

import { api, errorText } from "../../api.js";
import { call } from "../../platform/http.js";
import type { StyleValues } from "./css-value-model.js";
import {
  toAxisFor,
  toAxisSwap,
  toDivider,
  toDividerPaint,
  toDividerWidth,
} from "./divider-model.js";
import type { Divider, DividerAxis, DividerPaint } from "./divider-model.js";
import { createEditRequest, toEditTarget } from "./edit-request-model.js";
import type { ElementClasses } from "./element-classes-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface DividerChange {
  readonly axis: DividerAxis | null;
  readonly paint: DividerPaint | null;
  readonly width: number;
}

interface DividerView {
  readonly divider: Divider | null;
  readonly error: string | null;
  readonly isEditable: boolean;
  readonly isPending: boolean;
  readonly setColor: (paint: DividerPaint) => void;
  readonly setLines: (isOn: boolean) => void;
  readonly setWidth: (width: number) => void;
}

interface DividerScope {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
  readonly setError: (message: string | null) => void;
  readonly startWrite: (run: () => Promise<void>) => void;
}

const DividerContext = createContext<DividerView | null>(null);

const toTailwindClasses = (
  classes: ElementClasses | null
): readonly string[] | null => {
  if (classes?.tailwind?.mode === "classes") {
    return classes.tailwind.classes;
  }

  return null;
};

interface PaintFields {
  readonly color?: string;
  readonly token?: string;
}

const toPaintFields = (paint: DividerPaint | null): PaintFields => {
  if (paint?.token) {
    return { token: paint.token };
  }

  if (paint?.color) {
    return { color: paint.color };
  }

  return {};
};

interface DividerTarget {
  readonly selector: string;
  readonly source: SourceLoc;
  readonly tag: string;
}

const toTarget = (selection: SelectionContext | null): DividerTarget | null => {
  if (selection === null || selection.source === null) {
    return null;
  }

  return {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
  };
};

const useDividerWrite = (
  scope: DividerScope
): ((change: DividerChange) => void) => {
  const { edit, selection, setError, startWrite } = scope;
  const { directionId, projectId } = edit.scope;

  return useCallback(
    (change: DividerChange) => {
      const target = toTarget(selection);

      if (target === null || directionId === null) {
        return;
      }

      setError(null);
      startWrite(async () => {
        try {
          const divider = {
            ...toPaintFields(change.paint),
            axis: change.axis,
            width: toDividerWidth(change.width),
          };

          await call(spacingRoutes.setDividerSpacing, {
            directionId,
            divider,
            projectId,
            target,
          });
          edit.reselect();
        } catch (error) {
          setError(errorText(error));
        }
      });
    },
    [directionId, edit, projectId, selection, setError, startWrite]
  );
};

const toWidthOf = (divider: Divider | null): number => divider?.width ?? 1;

const useDivider = (
  edit: DirectEdit,
  classes: ElementClasses | null,
  selection: SelectionContext | null
): DividerView => {
  const tailwind = toTailwindClasses(classes);
  const divider = useMemo(() => toDivider(tailwind), [tailwind]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startWrite = useCallback(
    (run: () => Promise<void>) => startTransition(run),
    []
  );

  const write = useDividerWrite({ edit, selection, setError, startWrite });
  const axis = toAxisFor(edit.values["flex-direction"]);

  const setLines = useCallback(
    (isOn: boolean) => {
      if (isOn) {
        write({ axis, paint: null, width: toWidthOf(divider) });
      } else {
        write({ axis: null, paint: null, width: 1 });
      }
    },
    [axis, divider, write]
  );

  const setWidth = useCallback(
    (nextWidth: number) =>
      write({ axis: divider?.axis ?? axis, paint: null, width: nextWidth }),
    [axis, divider, write]
  );

  const setColor = useCallback(
    (nextPaint: DividerPaint) =>
      write({
        axis: divider?.axis ?? axis,
        paint: nextPaint,
        width: toWidthOf(divider),
      }),
    [axis, divider, write]
  );

  const isEditable = tailwind !== null && !(divider?.isReverse ?? false);

  return useMemo(
    () => ({
      divider,
      error,
      isEditable,
      isPending,
      setColor,
      setLines,
      setWidth,
    }),
    [divider, error, isEditable, isPending, setColor, setLines, setWidth]
  );
};

interface DividerColorInput {
  readonly applyColorOnBlur: (event: FocusEvent<HTMLInputElement>) => void;
  readonly applyColorOnKey: (event: KeyboardEvent<HTMLInputElement>) => void;
}

const useDividerColorInput = (
  divider: Divider,
  setColor: (paint: DividerPaint) => void
): DividerColorInput => {
  const settleColor = useCallback(
    (text: string) => {
      const paint = toDividerPaint(text);

      if (paint !== null && text.trim() !== divider.color) {
        setColor(paint);
      }
    },
    [divider.color, setColor]
  );

  const applyColorOnBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) =>
      settleColor(event.currentTarget.value),
    [settleColor]
  );

  const applyColorOnKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        settleColor(event.currentTarget.value);
      }
    },
    [settleColor]
  );

  return { applyColorOnBlur, applyColorOnKey };
};

const useDividerView = (): DividerView | null => useContext(DividerContext);

type SkipRef = MutableRefObject<boolean>;

const toSwapWrite = (
  edit: DirectEdit,
  selection: SelectionContext,
  patch: Partial<StyleValues>,
  divider: Divider | null
): (() => Promise<void>) | null => {
  const next = patch["flex-direction"] ?? null;
  const { directionId, projectId } = edit.scope;

  if (next === null || directionId === null || !selection.source) {
    return null;
  }

  const swap = toAxisSwap(divider, toAxisFor(next));

  if (swap === null) {
    return null;
  }

  const base = createEditRequest(selection, patch, null, "") ?? {
    selector: selection.selector,
    source: selection.source,
    ...toEditTarget(selection),
  };

  return async () => {
    await api.directEdit(projectId, directionId, { ...base, classes: swap });
    edit.absorb(patch);
    edit.reselect();
  };
};

const useDividerEdit = (
  edit: DirectEdit,
  selection: SelectionContext | null,
  view: DividerView
): DirectEdit => {
  const skip: SkipRef = useRef(false);
  const { divider } = view;
  const [, startTransition] = useTransition();

  return useMemo(() => {
    if (divider === null || selection === null) {
      return edit;
    }

    const preview = (patch: Partial<StyleValues>): void => {
      const run = toSwapWrite(edit, selection, patch, divider);

      if (run === null) {
        edit.preview(patch);

        return;
      }

      skip.current = true;
      edit.previewForced(patch);
      startTransition(run);
    };

    const commit = (): void => {
      if (skip.current) {
        skip.current = false;

        return;
      }

      edit.commit();
    };

    return { ...edit, commit, preview };
  }, [divider, edit, selection]);
};

export {
  DividerContext,
  useDivider,
  useDividerColorInput,
  useDividerEdit,
  useDividerView,
};

export type { DividerView };
