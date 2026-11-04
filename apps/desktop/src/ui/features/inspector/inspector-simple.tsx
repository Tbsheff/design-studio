import type {
  DirectStyleProperty,
  SelectionContext,
} from "@design-studio/contracts";
import type { SharedSource } from "@design-studio/contracts/app";
import { Icon } from "@design-studio/ui";
import { Suspense, memo, useEffect, useMemo, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";

import {
  ContentPanel,
  FillSlot,
  MotionSlot,
  StateStylesSlot,
  TextStyleSlot,
} from "../../inspector-slots.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { CopyCodeMenu } from "../share-publish-ship-export/copy-code-menu.js";
import { AutoLayoutSection } from "./auto-layout-section.js";
import { BoxModel } from "./box-model.js";
import type { DeclaredMargins } from "./box-model.js";
import { SIDES } from "./css-values.js";
import { VariantScopeContext, useEditVariant } from "./edit-variant.js";
import { InspectorBreadcrumb } from "./inspector-breadcrumb.js";
import {
  ClassLine,
  domClasses,
  useElementClasses,
} from "./inspector-classes.js";
import { RadiusField } from "./inspector-corners.js";
import { EffectsSection } from "./inspector-effects.js";
import {
  AlignField,
  ColorField,
  InspectorSection,
  SelectField,
} from "./inspector-fields.js";
import { SizeRows } from "./inspector-layout.js";
import {
  MultiCreateTokenHost,
  MultiNote,
  SelectMatchingSection,
} from "./inspector-multi.js";
import {
  CopyCssButton,
  InspectorOtherStyles,
} from "./inspector-other-styles.js";
import { ContentRow, CssTextRow, TextStyleToggles } from "./inspector-rows.js";
import {
  AddButton,
  InspectorAppContext,
  SharedSourceNote,
  dataTextPrompt,
  useInspectorApp,
} from "./inspector-shared.js";
import { SourceLink } from "./inspector-source.js";
import {
  CreateTokenHost,
  FontField,
  MatchSection,
  SnapToggle,
  TokenLint,
  TokenNotes,
  useInspectorTokens,
} from "./inspector-tokens.js";
import { InspectorVariantBar } from "./inspector-variant-bar.js";
import { NumberField } from "./number-field.js";
import { MinMaxRows } from "./size-limits.js";
import { useAuthoredCss } from "./use-authored-css.js";
import { sameEditValues, useDirectEdit } from "./use-direct-edit.js";
import type {
  DirectEdit,
  DirectEditCommit,
  DirectEditControl,
  SaveStatus,
} from "./use-direct-edit.js";
import { useDirectEdits } from "./use-direct-edits.js";
import { TokenUiContext } from "./use-token-snap.js";
import type { TokenUi } from "./use-token-snap.js";

export interface EditorProps {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  onCommitted: (commit: DirectEditCommit) => void;
  onStale: (message: string) => void;
  tokens: DesignTokens | null;
}

const WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
const BORDER_STYLES = ["none", "solid", "dashed", "dotted", "double"];
const CASES = ["none", "uppercase", "lowercase", "capitalize"];
const OVERFLOWS = ["visible", "hidden", "clip", "scroll", "auto"];

const NEW_BORDER = {
  "border-color": "#d0d0d0",
  "border-style": "solid",
  "border-width": "1px",
};

type Extra = "shadow" | "text-shadow" | "transform" | "filter";

const EXTRAS: { id: Extra; label: string }[] = [
  { id: "shadow", label: "Shadow" },
  { id: "text-shadow", label: "Text shadow" },
  { id: "transform", label: "Transform" },
  { id: "filter", label: "Filter" },
];

const BOX_PROPS = (["margin", "padding"] as const).flatMap((box) =>
  SIDES.map((side) => `${box}-${side}` as DirectStyleProperty)
);

const BoxModelMemo = memo(
  BoxModel,
  (a, b) =>
    sameEditValues(a.edit, b.edit, BOX_PROPS) &&
    a.edit.dirty.join(",") === b.edit.dirty.join(",") &&
    SIDES.every((side) => a.declared?.[side] === b.declared?.[side])
);

const declaredMargins = (
  selection: SelectionContext | null
): DeclaredMargins | undefined => {
  if (!selection) {
    return undefined;
  }

  return Object.fromEntries(
    SIDES.map((side) => [
      side,
      selection.styles[`declared-margin-${side}`] ?? "",
    ])
  ) as DeclaredMargins;
};

const isSet = (value: string): boolean =>
  value !== "" && value !== "none" && value !== "normal";

const extrasInUse = (edit: DirectEdit): Set<Extra> => {
  const used = new Set<Extra>();

  if (isSet(edit.values["box-shadow"]) || edit.mixed.has("box-shadow")) {
    used.add("shadow");
  }

  if (isSet(edit.values["text-shadow"])) {
    used.add("text-shadow");
  }

  if (isSet(edit.values.transform)) {
    used.add("transform");
  }

  if (isSet(edit.values.filter)) {
    used.add("filter");
  }

  return used;
};

const hasBorder = (edit: DirectEdit): boolean => {
  const style = edit.values["border-style"];
  const width = Number.parseFloat(edit.values["border-width"]);

  return (
    (style !== "" && style !== "none" && width > 0) ||
    edit.mixed.has("border-width")
  );
};

const write = (
  edit: DirectEdit,
  patch: Parameters<DirectEdit["preview"]>[0]
): void => {
  edit.preview(patch);
  edit.commit();
};

const StatusText = ({ status }: { status: SaveStatus }) => {
  if (status.kind === "saving") {
    return <span className="ins-status saving">Writing…</span>;
  }

  if (status.kind === "saved") {
    return (
      <span
        className="ins-status saved"
        data-tip="Written to the file. Save version keeps it in the history"
      >
        Written
      </span>
    );
  }

  return null;
};

export const ErrorLine = ({
  status,
  text,
}: {
  status: SaveStatus;
  text?: string;
}) => {
  const app = useInspectorApp();

  if (status.kind !== "error") {
    return null;
  }

  const data =
    status.code === "text_from_data" ? app.element?.textFromData : null;

  return (
    <div className="ins-error" role="alert">
      <Icon name="alert" size={14} />
      <span>{status.message}</span>
      {data && app.ask && (
        <button
          type="button"
          className="btn small ghost ins-error-action"
          onClick={() => app.ask?.(dataTextPrompt(text ?? "", data))}
        >
          Ask the agent to change it
        </button>
      )}
    </div>
  );
};

export interface SharedEditing {
  shared: SharedSource;
  editingUse: boolean;
  onToggle: () => void;
}

const TextSection = ({
  edit,
  ui,
  selection,
  textStyle,
}: {
  edit: DirectEdit;
  ui: TokenUi | null;
  selection: SelectionContext | null;
  textStyle?: ReactNode;
}) => (
  <InspectorSection title="Text">
    <div className="ins-grid">
      {selection && <ContentRow selection={selection} edit={edit} />}
      {textStyle && <div className="wide">{textStyle}</div>}
      <div className="wide">
        <FontField ui={ui} edit={edit} />
      </div>
      <NumberField
        short="Size"
        spec={{ edit, label: "Font size", min: 0, prop: "font-size" }}
      />
      <ColorField prop="color" label="Text color" short="Color" edit={edit} />
      <SelectField
        prop="font-weight"
        label="Font weight"
        short="Weight"
        edit={edit}
        options={WEIGHTS}
      />
      <TextStyleToggles edit={edit} />
      <div className="ins-field ins-align-row">
        <span className="ins-scrub static">Align</span>
        <AlignField edit={edit} />
      </div>
      <NumberField
        short="Leading"
        spec={{
          edit,
          label: "Line height",
          min: 0,
          prop: "line-height",
          step: 0.1,
          unit: "",
        }}
      />
      <NumberField
        short="Tracking"
        spec={{
          edit,
          label: "Letter spacing",
          prop: "letter-spacing",
          step: 0.1,
        }}
      />
      <SelectField
        prop="text-transform"
        label="Text case"
        short="Case"
        edit={edit}
        options={CASES}
      />
    </div>
  </InspectorSection>
);

const BackgroundField = ({ edit }: { edit: DirectEdit }) => (
  <ColorField
    prop="background-color"
    label="Background color"
    short="Background"
    edit={edit}
  />
);

const AppearanceSection = ({
  edit,
  extras,
  fill,
  onReveal,
}: {
  edit: DirectEdit;
  extras: Set<Extra>;
  fill?: ReactNode;
  onReveal: (extra: Extra) => void;
}) => {
  const hidden = EXTRAS.filter((extra) => !extras.has(extra.id));

  return (
    <InspectorSection title="Appearance">
      <div className="ins-grid">
        <div className="wide">{fill || <BackgroundField edit={edit} />}</div>
        <RadiusField edit={edit} short="Radius" />
        <SelectField
          prop="overflow"
          label="Overflow"
          short="Overflow"
          edit={edit}
          options={OVERFLOWS}
        />
        <NumberField
          short="Opacity"
          spec={{
            edit,
            label: "Opacity",
            max: 1,
            min: 0,
            prop: "opacity",
            step: 0.05,
            unit: "",
          }}
        />
      </div>
      {extras.has("text-shadow") && (
        <CssTextRow
          prop="text-shadow"
          label="Text shadow"
          short="Text shadow"
          edit={edit}
          placeholder="0 1px 2px #0003"
        />
      )}
      {extras.has("transform") && (
        <CssTextRow
          prop="transform"
          label="Transform"
          short="Transform"
          edit={edit}
          placeholder="rotate(4deg)"
        />
      )}
      {extras.has("filter") && (
        <CssTextRow
          prop="filter"
          label="Filter"
          short="Filter"
          edit={edit}
          placeholder="blur(4px)"
        />
      )}
      {hidden.length > 0 && (
        <div
          className="ins-add-row"
          role="group"
          aria-label="Add to appearance"
        >
          {hidden.map((extra) => (
            <AddButton
              key={extra.id}
              label={extra.label}
              onClick={() => onReveal(extra.id)}
            />
          ))}
        </div>
      )}
    </InspectorSection>
  );
};

const BorderSection = ({ edit }: { edit: DirectEdit }) => {
  const on = hasBorder(edit);

  const aside = on ? (
    <button
      type="button"
      className="icon-btn small"
      aria-label="Remove border"
      data-tip="Remove border"
      data-tip-align="end"
      onClick={() =>
        write(edit, { "border-style": "none", "border-width": "0px" })
      }
    >
      <Icon name="close" size={12} />
    </button>
  ) : undefined;

  return (
    <InspectorSection title="Border" aside={aside}>
      {!on && (
        <div className="ins-add-row">
          <AddButton label="Border" onClick={() => write(edit, NEW_BORDER)} />
        </div>
      )}
      {on && (
        <div className="ins-grid">
          <NumberField
            short="Width"
            spec={{ edit, label: "Border width", min: 0, prop: "border-width" }}
          />
          <SelectField
            prop="border-style"
            label="Border style"
            short="Style"
            edit={edit}
            options={BORDER_STYLES}
          />
          <div className="wide">
            <ColorField
              prop="border-color"
              label="Border color"
              short="Color"
              edit={edit}
            />
          </div>
        </div>
      )}
    </InspectorSection>
  );
};

const LayoutSection = ({
  edit,
  selection,
}: {
  edit: DirectEdit;
  selection: SelectionContext | null;
}) => {
  const size = selection ? (
    <SizeRows edit={edit} selection={selection} />
  ) : (
    <>
      <div className="ins-grid">
        <NumberField
          short="W"
          spec={{ edit, label: "Width", min: 0, prop: "width" }}
        />
        <NumberField
          short="H"
          spec={{ edit, label: "Height", min: 0, prop: "height" }}
        />
      </div>
      <MinMaxRows edit={edit} />
    </>
  );

  return (
    <AutoLayoutSection edit={edit} title="Layout" lead={size}>
      <BoxModelMemo edit={edit} declared={declaredMargins(selection)} />
    </AutoLayoutSection>
  );
};

const SimpleSections = ({
  edit,
  ui,
  selection,
  textStyle,
  fill,
}: {
  edit: DirectEdit;
  ui: TokenUi | null;
  selection: SelectionContext | null;
  textStyle?: ReactNode;
  fill?: ReactNode;
}) => {
  const [revealed, setRevealed] = useState<Set<Extra>>(() => new Set());
  const extras = new Set([...extrasInUse(edit), ...revealed]);

  const reveal = (extra: Extra) => {
    setRevealed((prev) => new Set(prev).add(extra));

    if (extra === "shadow") {
      write(edit, { "box-shadow": "0px 2px 8px 0px rgba(0, 0, 0, 0.16)" });
    }
  };

  return (
    <>
      <LayoutSection edit={edit} selection={selection} />
      <TextSection
        edit={edit}
        ui={ui}
        selection={selection}
        textStyle={textStyle}
      />
      <AppearanceSection
        edit={edit}
        extras={extras}
        fill={fill}
        onReveal={reveal}
      />
      {extras.has("shadow") && (
        <EffectsSection edit={edit} revealed={revealed.has("shadow")} />
      )}
      <BorderSection edit={edit} />
    </>
  );
};

const MetaRow = ({
  tag,
  source,
  status,
  ui,
  onReset,
  resetDisabled,
  children,
}: {
  tag?: string;
  source: ReactNode;
  status: SaveStatus;
  ui: TokenUi | null;
  onReset: () => void;
  resetDisabled?: boolean;
  children?: ReactNode;
}) => (
  <div className="ins-meta">
    {tag && <span className="ins-tag">{tag}</span>}
    {source}
    <span className="ins-header-end" role="status" aria-live="polite">
      <StatusText status={status} />
    </span>
    <SnapToggle ui={ui} />
    {children}
    <button
      type="button"
      className="btn ghost small"
      onClick={onReset}
      disabled={resetDisabled}
    >
      Reset
    </button>
  </div>
);

const SAVE_SETTLE_MS = 400;

const useSettled = <T,>(value: T, ms: number): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);

    return () => window.clearTimeout(timer);
  }, [value, ms]);

  return settled;
};

type SimpleEditorProps = EditorProps & {
  target: SelectionContext;
  sharedEditing?: SharedEditing | null;
  component?: ReactNode;
};

const useSimpleEditor = (props: SimpleEditorProps) => {
  const variant = useEditVariant();

  const scope = {
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    projectId: props.projectId,
    selection: props.target,
    tokens: props.tokens,
  };

  const tk = useInspectorTokens(scope);

  const edit = useDirectEdit({
    control: props.control,
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    onStale: props.onStale,
    port: props.port,
    projectId: props.projectId,
    rewrite: tk.ui ? tk.snap.rewrite : undefined,
    selection: props.target,
    variant,
  });

  const authored = useAuthoredCss(props.port, props.target.selector);

  const savedAt = useSettled(
    edit.status.kind === "saved" ? edit.status.at : 0,
    SAVE_SETTLE_MS
  );

  const refreshAuthored = authored.request;
  useEffect(() => {
    if (savedAt) {
      void refreshAuthored();
    }
  }, [savedAt, refreshAuthored]);

  const keepRaw = (raw: Partial<typeof edit.values>) => {
    tk.snap.keepRaw(raw);
    edit.preview(raw);
    edit.commit();
  };

  const classes = useElementClasses(
    props.projectId,
    props.directionId,
    props.target.source,
    savedAt,
    variant
  );

  const classInfo =
    classes.element?.component && !props.target.component
      ? null
      : classes.tailwind;

  const classLine =
    classInfo && edit.tailwind?.note
      ? { ...classInfo, note: edit.tailwind.note }
      : classInfo;

  const variantProps = classes.variants?.props;

  const variantScope = useMemo(
    () => ({ prefix: variant, props: new Set(variantProps ?? []) }),
    [variant, variantProps]
  );

  return {
    authored,
    classLine,
    classes,
    edit,
    keepRaw,
    scope,
    tk,
    variantScope,
  };
};

const SharedNote = ({
  sharedEditing,
  forwards,
}: {
  sharedEditing: SharedEditing | null | undefined;
  forwards: boolean;
}) => {
  if (!sharedEditing) {
    return null;
  }

  return (
    <SharedSourceNote
      shared={sharedEditing.shared}
      editingUse={sharedEditing.editingUse}
      canUse={sharedEditing.editingUse || forwards}
      onToggle={sharedEditing.onToggle}
    />
  );
};

export const SimpleEditor = (props: SimpleEditorProps) => {
  const {
    scope,
    tk,
    edit,
    authored,
    keepRaw,
    classes,
    classLine,
    variantScope,
  } = useSimpleEditor(props);

  const app = useInspectorApp();

  const resolved = useMemo(
    () => domClasses(props.target.outerHTML),
    [props.target.outerHTML]
  );

  return (
    <InspectorAppContext.Provider value={{ ...app, element: classes.element }}>
      <VariantScopeContext.Provider value={variantScope}>
        <TokenUiContext.Provider value={tk.ui}>
          <div className="inspector ins-simple" aria-label="Design inspector">
            <div className="ins-head">
              <InspectorBreadcrumb selection={props.target} port={props.port} />
              <MetaRow
                source={
                  <SourceLink
                    projectId={props.projectId}
                    directionId={props.directionId}
                    source={props.target.source}
                  />
                }
                status={edit.status}
                ui={tk.ui}
                onReset={edit.reset}
              >
                <CopyCssButton authored={authored} />
              </MetaRow>
            </div>
            <div className="ins-scroll">
              <ErrorLine status={edit.status} text={props.target.text} />
              <SharedNote
                sharedEditing={props.sharedEditing}
                forwards={classes.element?.forwardsClassName === true}
              />
              {props.component}
              <ClassLine info={classLine} resolved={resolved} />
              <InspectorVariantBar
                selector={props.target.selector}
                port={props.port}
                support={classes.variants}
                quietNote={classLine?.note ?? null}
              />
              {props.directionId && props.target.source && (
                <StateStylesSlot
                  projectId={props.projectId}
                  directionId={props.directionId}
                  target={props.target}
                  port={props.port}
                  status={edit.status}
                />
              )}
              {props.directionId && props.target.source && (
                <Suspense fallback={null}>
                  <ContentPanel
                    projectId={props.projectId}
                    directionId={props.directionId}
                    target={props.target}
                  />
                </Suspense>
              )}
              <TokenLint ui={tk.ui} edit={edit} css={authored.css} />
              <SimpleSections
                edit={edit}
                ui={tk.ui}
                selection={props.target}
                textStyle={
                  props.directionId && (
                    <TextStyleSlot
                      projectId={props.projectId}
                      directionId={props.directionId}
                      targets={[props.target]}
                    />
                  )
                }
                fill={
                  props.directionId && (
                    <FillSlot
                      projectId={props.projectId}
                      directionId={props.directionId}
                      target={props.target}
                      port={props.port}
                      edit={edit}
                      fallback={<BackgroundField edit={edit} />}
                    />
                  )
                }
              />
              {props.directionId && (
                <MotionSlot
                  projectId={props.projectId}
                  directionId={props.directionId}
                  target={props.target}
                  port={props.port}
                />
              )}
              <MatchSection
                projectId={props.projectId}
                directionId={props.directionId}
                selection={[props.target]}
                port={props.port}
                tokens={props.tokens}
                edit={edit}
              />
              <SelectMatchingSection
                selection={[props.target]}
                port={props.port}
              />
              <InspectorOtherStyles css={authored.css} />
              <div className="ins-export">
                <CopyCodeMenu
                  projectId={props.projectId}
                  directionId={props.directionId}
                  selector={props.target.selector}
                  variant="row"
                />
              </div>
            </div>
            <TokenNotes
              ui={tk.ui}
              note={tk.snap.note}
              onKeepRaw={keepRaw}
              onDismiss={tk.snap.dismiss}
            />
          </div>
          <CreateTokenHost
            {...scope}
            edit={edit}
            request={tk.creating}
            onClose={tk.closeCreate}
          />
        </TokenUiContext.Provider>
      </VariantScopeContext.Provider>
    </InspectorAppContext.Provider>
  );
};

export const SimpleMultiEditor = (
  props: EditorProps & { component?: ReactNode }
) => {
  const first = props.selection[0] as SelectionContext;

  const scope = {
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    projectId: props.projectId,
    selection: first,
    tokens: props.tokens,
  };

  const tk = useInspectorTokens(scope);

  const edit = useDirectEdits({
    control: props.control,
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    onStale: props.onStale,
    port: props.port,
    projectId: props.projectId,
    rewrite: tk.ui ? tk.snap.rewrite : undefined,
    selections: props.selection,
  });

  const keepRaw = (raw: Partial<typeof edit.values>) => {
    tk.snap.keepRaw(raw);
    edit.preview(raw);
    edit.commit();
  };

  return (
    <TokenUiContext.Provider value={tk.ui}>
      <div className="inspector ins-simple" aria-label="Design inspector">
        <MetaRow
          tag={`${props.selection.length} elements`}
          source={<span className="ins-source" />}
          status={edit.status}
          ui={tk.ui}
          onReset={edit.reset}
          resetDisabled={edit.blocked !== null}
        />
        <div className="ins-scroll">
          <MultiNote reason={edit.blocked} />
          <ErrorLine status={edit.status} />
          {props.component}
          <fieldset className="ins-fieldset" disabled={edit.blocked !== null}>
            <SimpleSections
              edit={edit}
              ui={tk.ui}
              selection={null}
              textStyle={
                props.directionId && (
                  <TextStyleSlot
                    projectId={props.projectId}
                    directionId={props.directionId}
                    targets={props.selection}
                  />
                )
              }
            />
          </fieldset>
          <MatchSection
            projectId={props.projectId}
            directionId={props.directionId}
            selection={props.selection}
            port={props.port}
            tokens={props.tokens}
            edit={edit}
          />
          <SelectMatchingSection
            selection={props.selection}
            port={props.port}
          />
        </div>
        <TokenNotes
          ui={tk.ui}
          note={tk.snap.note}
          onKeepRaw={keepRaw}
          onDismiss={tk.snap.dismiss}
        />
      </div>
      <MultiCreateTokenHost
        projectId={props.projectId}
        directionId={props.directionId}
        tokens={props.tokens}
        edit={edit}
        request={tk.creating}
        onClose={tk.closeCreate}
      />
    </TokenUiContext.Provider>
  );
};
