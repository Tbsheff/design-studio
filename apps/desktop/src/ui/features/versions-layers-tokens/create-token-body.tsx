import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokenApplyRow } from "./token-apply-row.js";
import { TokenNameField } from "./token-name-field.js";
import { TokenValueRow } from "./token-value-row.js";
import type { CreateTokenForm } from "./use-create-token.js";

interface CreateTokenBodyProps {
  readonly darkPaint: string;
  readonly form: CreateTokenForm;
  readonly isColor: boolean;
  readonly valuePaint: string | null;
}

const CreateTokenBody = ({
  darkPaint,
  form,
  isColor,
  valuePaint,
}: CreateTokenBodyProps): ReactNode => {
  const { problems, touched } = form;
  const { onName: handleName, setApply: handleApply } = form;
  const { setDark: handleDark, setValue: handleValue } = form;
  let valueLabel: string = COPY.tokenValue;
  let valueProblem: string | null = null;
  let darkProblem: string | null = null;

  if (isColor) {
    valueLabel = COPY.tokenLightValue;
  }

  if (touched) {
    ({ darkProblem, valueProblem } = problems);
  }

  return (
    <div className="modal-body tk-form">
      <label className="field tk-row">
        <span>{COPY.tokenGroup}</span>
        <input
          name="token-group"
          value={form.group}
          readOnly
          aria-readonly="true"
          className="mono"
        />
      </label>
      <TokenNameField
        group={form.group}
        isTouched={touched}
        name={form.name}
        problem={problems.nameProblem}
        onName={handleName}
      />
      <TokenValueRow
        isOptional={false}
        label={valueLabel}
        paint={valuePaint}
        problem={valueProblem}
        value={form.value}
        onChange={handleValue}
      />
      {isColor && (
        <TokenValueRow
          isOptional
          label={COPY.tokenDarkValue}
          paint={darkPaint}
          problem={darkProblem}
          value={form.dark}
          onChange={handleDark}
        />
      )}
      <TokenApplyRow isApplied={form.apply} onApply={handleApply} />
      {form.failure?.field === "form" && (
        <div className="alert error small" role="alert">
          {form.failure.message}
        </div>
      )}
    </div>
  );
};

export { CreateTokenBody };
