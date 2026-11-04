import { useState, useTransition } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import {
  TOKEN_GROUP_FOR_PROPERTY,
  TOKEN_NAME_PATTERN,
} from "../../../shared/actions/_core/contracts.js";
import type {
  CompiledTokenEntry,
  CreateTokenResult,
  TokenGroupName,
} from "../../../shared/actions/_core/contracts.js";
import { cssVarFor } from "../../../shared/token-match.js";
import { ApiError, errorText } from "../../api.js";
import { useModalDialog } from "../../kit/use-popover.js";
import { displayColor, isValidColor } from "../inspector/css-values.js";
import type { CreateRequest } from "../inspector/use-token-snap.js";
import { COPY } from "./copy.js";

export interface CreateTokenSubmit {
  group: TokenGroupName;
  name: string;
  value: string;
  darkValue?: string;
  apply: boolean;
}

interface DialogProps {
  request: CreateRequest;
  entries: CompiledTokenEntry[];
  onSubmit: (input: CreateTokenSubmit) => Promise<CreateTokenResult>;
  onClose: () => void;
}

const SERIES: Record<TokenGroupName, (n: number) => string> = {
  color: (n) => `brand-${n + 1}`,
  font: (n) => (n === 0 ? "alt" : `alt-${n + 1}`),
  radius: (n) => (n === 0 ? "xl" : `xl-${n + 1}`),
  shadow: (n) => (n === 0 ? "xl" : `xl-${n + 1}`),
  space: (n) => String(n + 1),
  text: (n) => `${n + 5}xl`,
};

function suggestName(
  group: TokenGroupName,
  entries: CompiledTokenEntry[]
): string {
  const taken = new Set(entries.map((entry) => entry.cssVar));

  for (let n = 0; n < 1000; n += 1) {
    const name = SERIES[group](n);

    if (!taken.has(cssVarFor(group, name))) {
      return name;
    }
  }

  return "";
}

function nameError(
  group: TokenGroupName,
  name: string,
  entries: CompiledTokenEntry[]
): string | null {
  if (!name) {
    return "Enter a name";
  }

  if (!TOKEN_NAME_PATTERN.test(name)) {
    return "Use lowercase letters, digits and single hyphens";
  }

  const cssVar = cssVarFor(group, name);

  if (entries.some((entry) => entry.cssVar === cssVar)) {
    return `${cssVar} already exists`;
  }

  return null;
}

function valueError(
  group: TokenGroupName,
  value: string,
  optional: boolean
): string | null {
  if (!value.trim()) {
    return optional ? null : "Enter a value";
  }

  if (group === "color" && !isValidColor(value)) {
    return "Enter a valid CSS color";
  }

  return null;
}

function problemsOf(f: {
  group: TokenGroupName;
  name: string;
  value: string;
  dark: string;
  entries: CompiledTokenEntry[];
  failure: { field: string; message: string } | null;
}) {
  const serverName = f.failure?.field === "name" ? f.failure.message : null;
  const nameProblem = nameError(f.group, f.name, f.entries) ?? serverName;
  const valueProblem = valueError(f.group, f.value, false);

  const darkProblem =
    f.group === "color" ? valueError(f.group, f.dark, true) : null;

  return {
    darkProblem,
    invalid: Boolean(nameProblem || valueProblem || darkProblem),
    nameProblem,
    valueProblem,
  };
}

function serverError(err: unknown): {
  field: "name" | "form";
  message: string;
} {
  if (
    err instanceof ApiError &&
    err.status === 409 &&
    err.code === "token_exists"
  ) {
    return { field: "name", message: err.message };
  }

  return {
    field: "form",
    message: `Could not create the token. ${errorText(err)} Try again.`,
  };
}

interface ValueRowProps {
  label: string;
  value: string;
  swatch: boolean;
  optional?: boolean;
  problem: string | null;
  onChange: (value: string) => void;
}

function ValueRow({
  label,
  value,
  swatch,
  optional,
  problem,
  onChange,
}: ValueRowProps) {
  const paint = swatch && value && isValidColor(value) ? value : "transparent";

  return (
    <label className="field tk-row">
      <span>
        {label}
        {optional && <span className="tk-optional">Optional</span>}
      </span>
      <span className={`tk-value ${swatch ? "has-swatch" : ""}`}>
        {swatch && (
          <span
            className="tk-swatch"
            style={{ background: paint }}
            aria-hidden="true"
          />
        )}
        <input
          className="mono"
          value={value}
          placeholder={optional ? "Same as light" : undefined}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={problem !== null}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {problem && <span className="tk-help error">{problem}</span>}
    </label>
  );
}

function NameHelp({
  group,
  name,
  problem,
}: {
  group: TokenGroupName;
  name: string;
  problem: string | null;
}) {
  return (
    <span id="tk-name-help" className={`tk-help ${problem ? "error" : ""}`}>
      {problem ?? (
        <>
          Writes <code>var({cssVarFor(group, name || "…")})</code>
        </>
      )}
    </span>
  );
}

export function CreateTokenDialog({
  request,
  entries,
  onSubmit,
  onClose,
}: DialogProps) {
  const group = TOKEN_GROUP_FOR_PROPERTY[request.prop] ?? "color";
  const color = group === "color";
  const [name, setName] = useState(() => suggestName(group, entries));

  const [value, setValue] = useState(() =>
    color ? displayColor(request.value) : request.value
  );

  const [dark, setDark] = useState("");
  const [apply, setApply] = useState(true);
  const [touched, setTouched] = useState(false);
  const [busy, startTransition] = useTransition();

  const [failure, setFailure] = useState<{
    field: "name" | "form";
    message: string;
  } | null>(null);

  const { nameProblem, valueProblem, darkProblem, invalid } = problemsOf({
    dark,
    entries,
    failure,
    group,
    name,
    value,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);

    if (invalid || busy) {
      return;
    }

    setFailure(null);

    startTransition(async () => {
      try {
        await onSubmit({
          apply,
          darkValue: dark.trim() || undefined,
          group,
          name,
          value: value.trim(),
        });
        onClose();
      } catch (error) {
        setFailure(serverError(error));
      }
    });
  };

  const dialog = useModalDialog(() => {
    if (busy) {
      return false;
    }

    onClose();
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
    }
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal tk-dialog"
      aria-label={COPY.labelCreateToken}
      onMouseDown={dialog.onMouseDown}
      onKeyDown={onKeyDown}
    >
      <form className="modal-form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="modal-head">
          <div className="titles">
            <h2>Create token</h2>
            <p>
              Adds the token to design-system/tokens.json and recompiles
              tokens.css.
            </p>
          </div>
        </div>
        <div className="modal-body tk-form">
          <label className="field tk-row">
            <span>Group</span>
            <input
              value={group}
              readOnly
              aria-readonly="true"
              className="mono"
            />
          </label>
          <label className="field tk-row">
            <span>Name</span>
            <input
              data-autofocus
              className="mono"
              value={name}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={touched && nameProblem !== null}
              aria-describedby="tk-name-help"
              onChange={(e) => {
                setName(e.target.value.trim());
                setFailure(null);
              }}
            />
            <NameHelp
              group={group}
              name={name}
              problem={touched ? nameProblem : null}
            />
          </label>
          <ValueRow
            label={color ? "Light value" : "Value"}
            value={value}
            swatch={color}
            problem={touched ? valueProblem : null}
            onChange={setValue}
          />
          {color && (
            <ValueRow
              label="Dark value"
              optional
              value={dark}
              swatch
              problem={touched ? darkProblem : null}
              onChange={setDark}
            />
          )}
          <label className="check tk-check-row">
            <input
              type="checkbox"
              checked={apply}
              onChange={(e) => setApply(e.target.checked)}
            />
            <span>Apply to this element</span>
          </label>
          {failure?.field === "form" && (
            <div className="alert error small" role="alert">
              {failure.message}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={busy || (touched && invalid)}
          >
            {busy ? "Creating…" : "Create token"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
