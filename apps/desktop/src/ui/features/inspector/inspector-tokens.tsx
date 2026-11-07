import type {
  DirectStyleProperty,
  SelectionContext,
} from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import type { KeyboardEvent, MutableRefObject, ReactNode } from "react";

import { colorHex, cssVarFor, varName } from "../../../shared/token-match.js";
import { api } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { CreateTokenDialog } from "../versions-layers-tokens/create-token-dialog.js";
import type { CreateTokenSubmit } from "../versions-layers-tokens/create-token-dialog.js";
import { TokenControl } from "../versions-layers-tokens/token-control.js";
import { lintValues } from "../versions-layers-tokens/token-lint.js";
import type { LintIssue } from "../versions-layers-tokens/token-lint.js";
import type { AuthoredCss } from "./authored-css.js";
import type { StyleValues } from "./css-values.js";
import { buildEditRequest } from "./use-direct-edit.js";
import type { DirectEdit, DirectEditCommit } from "./use-direct-edit.js";
import { useSnapSetting, useTokenSnap } from "./use-token-snap.js";
import type { CreateRequest, SnapNote, TokenUi } from "./use-token-snap.js";

interface ScopeInput {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext;
  readonly tokens: DesignTokens | null;
  readonly onCommitted: (commit: DirectEditCommit) => void;
}

export const useInspectorTokens = (input: ScopeInput) => {
  const [snapOn, setSnap] = useSnapSetting(input.projectId);
  const snap = useTokenSnap(input.tokens, snapOn);
  const [creating, setCreating] = useState<CreateRequest | null>(null);
  const { tokens } = input;

  const ui = useMemo<TokenUi | null>(
    () =>
      tokens
        ? {
            entries: tokens.entries,
            mode: tokens.mode,
            requestCreate: tokens.source ? null : setCreating,
            setSnap,
            shouldSnap: snapOn,
          }
        : null,
    [tokens, snapOn, setSnap]
  );

  return {
    closeCreate: useCallback(() => setCreating(null), []),
    creating,
    snap,
    ui,
  };
};

export const SnapToggle = ({ ui }: { readonly ui: TokenUi | null }) => {
  if (!ui) {
    return null;
  }

  return (
    <button
      type="button"
      className="icon-btn small tk-snap-toggle"
      aria-label="Snap to tokens"
      aria-pressed={ui.shouldSnap}
      data-tip={
        ui.shouldSnap
          ? "Snap to tokens is on: values near a token use var()"
          : "Snap to tokens is off: values stay as typed"
      }
      data-tip-align="end"
      onClick={() => ui.setSnap(!ui.shouldSnap)}
    >
      <Icon name="magnet" size={14} />
    </button>
  );
};

const NoteBar = ({
  children,
  onClose,
}: {
  readonly children: ReactNode;
  readonly onClose: () => void;
}) => (
  <div className="tk-note" role="status">
    <Icon name="magnet" size={13} />
    {children}
    <button
      type="button"
      className="icon-btn tk-note-close"
      aria-label="Dismiss"
      onClick={onClose}
    >
      <Icon name="close" size={12} />
    </button>
  </div>
);

export const TokenNotes = (props: {
  readonly ui: TokenUi | null;
  readonly note: SnapNote | null;
  readonly onKeepRaw: (raw: Partial<StyleValues>) => void;
  readonly onDismiss: () => void;
}) => {
  const { ui, note } = props;

  if (!ui) {
    return null;
  }

  if (note) {
    return (
      <NoteBar onClose={props.onDismiss}>
        <span className="tk-note-text">
          Snapped to <code>{note.cssVar}</code>
        </span>
        <span className="tk-note-sep" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          className="tk-note-action"
          onClick={() => props.onKeepRaw(note.raw)}
        >
          Use raw
        </button>
      </NoteBar>
    );
  }

  return null;
};

const PROP_LABEL: Partial<Record<DirectStyleProperty, string>> = {
  "background-color": "Fill",
  "border-color": "Border",
  "border-radius": "Radius",
  color: "Text color",
  "font-family": "Font",
  "font-size": "Font size",
  gap: "Gap",
};

const boxLabel = (name: string, props: DirectStyleProperty[]): string => {
  if (props.length === 4) {
    return name;
  }

  const sides = props.map((prop) => prop.slice(prop.indexOf("-") + 1));

  const list =
    sides.length > 1
      ? `${sides.slice(0, -1).join(", ")} and ${sides.at(-1)}`
      : (sides[0] ?? "");

  return `${name} ${list}`;
};

const propsLabel = (props: DirectStyleProperty[]): string => {
  const first = props[0] ?? "color";

  if (first.startsWith("padding-")) {
    return boxLabel("Padding", props);
  }

  if (first.startsWith("margin-")) {
    return boxLabel("Margin", props);
  }

  return PROP_LABEL[first] ?? first;
};

const LINT_SHOWN = 3;

const shownValue = (issue: LintIssue): string => {
  if (issue.kind === "color") {
    return colorHex(issue.value) ?? issue.value;
  }

  if (issue.kind === "font") {
    return (
      issue.value
        .split(",")[0]
        ?.trim()
        .replaceAll(/^['"]|['"]$/gu, "") ?? issue.value
    );
  }

  return issue.value;
};

const issueText = (issue: LintIssue): ReactNode => {
  const { exact } = issue.token;
  const token = <code>{issue.token.cssVar}</code>;

  if (issue.kind === "color" && !exact) {
    return (
      <>
        Off palette. Nearest is {token}, ΔE {issue.deltaE?.toFixed(1)}
      </>
    );
  }

  if (issue.kind === "font" && !exact) {
    return <>Not a font token. Use {token}</>;
  }

  if (exact) {
    return <>Same as {token}, but typed raw</>;
  }

  return (
    <>
      Near {token} ({issue.token.value})
    </>
  );
};

export const TokenLint = ({
  ui,
  edit,
  css,
}: {
  readonly ui: TokenUi | null;
  readonly edit: DirectEdit;
  readonly css: AuthoredCss | null;
}) => {
  const issues = useMemo(
    () =>
      ui ? lintValues(edit.values, ui.entries, ui.mode, css, edit.dirty) : [],
    [ui, edit.values, edit.dirty, css]
  );

  const [all, setAll] = useState(false);

  if (!ui || issues.length === 0) {
    return null;
  }

  const shown = all ? issues : issues.slice(0, LINT_SHOWN);

  const use = (issue: LintIssue) => {
    edit.preview(
      Object.fromEntries(
        issue.props.map((p) => [p, `var(${issue.token.cssVar})`])
      )
    );
    edit.commit();
  };

  return (
    <section className="tk-lint" aria-label="Token checks">
      <h3 className="tk-lint-head">
        <Icon name="alert" size={13} />
        {issues.length === 1
          ? "1 value is not a token"
          : `${issues.length} values are not tokens`}
      </h3>
      <ul className="tk-lint-list">
        {shown.map((issue) => {
          const label = propsLabel(issue.props);

          return (
            <li
              key={`${issue.props.join(",")}`}
              className="tk-lint-row"
              data-testid="token-lint"
            >
              <span className="tk-lint-text">
                <span className="tk-lint-prop">
                  {label}{" "}
                  <span className="tk-lint-value">{shownValue(issue)}</span>
                </span>
                <span className="tk-lint-hint">{issueText(issue)}</span>
              </span>
              <button
                type="button"
                className="btn small"
                aria-label={`Use ${issue.token.cssVar} for ${label.toLowerCase()}`}
                onClick={() => use(issue)}
              >
                Use token
              </button>
            </li>
          );
        })}
      </ul>
      {issues.length > LINT_SHOWN && (
        <button
          type="button"
          className="tk-lint-more"
          aria-expanded={all}
          onClick={() => setAll(!all)}
        >
          {all ? "Show fewer" : `Show ${issues.length - LINT_SHOWN} more`}
        </button>
      )}
    </section>
  );
};

export const CreateTokenHost = (
  props: ScopeInput & {
    readonly edit: DirectEdit;
    readonly request: CreateRequest | null;
    readonly onClose: () => void;
  }
) => {
  const { tokens, request, edit } = props;

  if (!tokens || !request) {
    return null;
  }

  const submit = async (input: CreateTokenSubmit) => {
    if (!props.directionId) {
      throw new Error("No direction selected");
    }

    await edit.drain();
    const cssVar = cssVarFor(input.group, input.name);

    const style: Partial<StyleValues> = Object.fromEntries(
      request.targets.map((p) => [p, `var(${cssVar})`])
    );

    const apply = input.apply ? buildEditRequest(props.selection, style) : null;

    const result = await api.createToken(props.projectId, props.directionId, {
      group: input.group,
      name: input.name,
      value: input.value,
      ...(input.darkValue ? { darkValue: input.darkValue } : {}),
      ...(apply ? { apply } : {}),
    });

    tokens.replace(result.state);

    if (apply) {
      edit.absorb(style);
      props.onCommitted({ selector: props.selection.selector, style });
    }

    return result;
  };

  return (
    <CreateTokenDialog
      request={request}
      entries={tokens.entries}
      onSubmit={submit}
      onClose={props.onClose}
    />
  );
};

export const FontField = ({
  ui,
  edit,
}: {
  readonly ui: TokenUi | null;
  readonly edit: DirectEdit;
}) => {
  const [text, setText] = useState<string | null>(null);
  const prop = "font-family";
  const value = edit.values[prop];

  const settle = () => {
    setText(null);
    edit.commit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      settle();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setText(null);
      edit.revert([prop]);
    }
  };

  return (
    <div className="ins-field font">
      <label htmlFor="ins-font-family" className="ins-scrub static">
        Font
      </label>
      <input
        id="ins-font-family"
        className="ins-input"
        aria-label="Font family"
        value={
          text ??
          (ui && varName(value)
            ? value
            : (value
                .split(",")[0]
                ?.replaceAll(/^["']|["']$/gu, "")
                .trim() ?? ""))
        }
        data-tip={value}
        spellCheck={false}
        autoComplete="off"
        placeholder={edit.mixed.has(prop) ? "Mixed" : "—"}
        onChange={(event) => {
          setText(event.target.value);

          if (event.target.value.trim()) {
            edit.preview({ [prop]: event.target.value.trim() });
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={settle}
      />
      <TokenControl prop={prop} label="Font family" edit={edit} />
    </div>
  );
};

const InspectorMatch = lazy(() => import("./inspector-match.js"));

export const MatchSection = (props: {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly tokens: DesignTokens | null;
  readonly edit: DirectEdit;
}) => {
  const { directionId, edit } = props;

  if (!directionId || props.selection.length === 0) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <InspectorMatch
        projectId={props.projectId}
        directionId={directionId}
        selection={props.selection}
        port={props.port}
        tokens={props.tokens}
        drain={edit.drain}
      />
    </Suspense>
  );
};
