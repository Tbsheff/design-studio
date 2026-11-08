import type { DirectStyleProperty } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useState } from "react";
import type { ReactNode } from "react";

import { TokenControl } from "../versions-layers-tokens/token-control.js";
import { SIDES } from "./css-values.js";
import type { Side } from "./css-values.js";
import { NumberInput } from "./number-field.js";
import type { DirectEdit } from "./use-direct-edit.js";

type Box = "padding" | "margin";

const SIDE_LABEL: Record<Side, string> = {
  bottom: "bottom",
  left: "left",
  right: "right",
  top: "top",
};

const propsOf = (box: Box): DirectStyleProperty[] =>
  SIDES.map((side) => `${box}-${side}` as DirectStyleProperty);

const LinkToggle = ({
  box,
  isLinked: linked,
  onToggle,
}: {
  readonly box: Box;
  readonly isLinked: boolean;
  readonly onToggle: () => void;
}) => {
  const name = box === "padding" ? "Padding" : "Margin";

  return (
    <button
      type="button"
      className="icon-btn ins-link"
      aria-label={`Link ${box} sides`}
      aria-pressed={linked}
      data-tip={
        linked ? `${name}: all sides change together` : `${name}: set each side`
      }
      onClick={onToggle}
    >
      <Icon name={linked ? "link" : "unlink"} size={14} />
    </button>
  );
};

type DeclaredMargins = Partial<Record<Side, string>>;

const autoShown = (
  declared: DeclaredMargins | undefined,
  side: Side,
  edit: DirectEdit,
  prop: DirectStyleProperty
): string | undefined =>
  declared?.[side]?.trim() === "auto" && !edit.dirty.includes(prop)
    ? "auto"
    : undefined;

const SideInput = ({
  box,
  side,
  edit,
  isLinked: linked,
  declared,
}: {
  readonly box: Box;
  readonly side: Side;
  readonly edit: DirectEdit;
  readonly isLinked: boolean;
  readonly declared?: DeclaredMargins;
}) => {
  const prop = `${box}-${side}` as DirectStyleProperty;
  const name = box === "padding" ? "Padding" : "Margin";
  const label = `${name} ${SIDE_LABEL[side]}`;
  const targets = linked ? propsOf(box) : undefined;

  const display =
    box === "margin" ? autoShown(declared, side, edit, prop) : undefined;

  return (
    <span
      className={`side-cell ${side}`}
      data-tip={display ? `auto (${edit.values[prop]} now)` : undefined}
    >
      <NumberInput
        className="side"
        spec={{
          display,
          edit,
          label,
          min: box === "padding" ? 0 : undefined,
          prop,
          targets,
        }}
      />
      <TokenControl
        prop={prop}
        label={label}
        edit={edit}
        targets={targets}
        variant="mini"
      />
    </span>
  );
};

const BoxRing = (props: {
  readonly box: Box;
  readonly edit: DirectEdit;
  readonly isLinked: boolean;
  readonly onToggle: () => void;
  readonly declared?: DeclaredMargins;
  readonly children: ReactNode;
}) => {
  const { box, edit, isLinked: linked, declared } = props;

  return (
    <div className={`box-ring ${box}`}>
      <div className="box-ring-head">
        <span className="box-ring-label">
          {box === "padding" ? "Padding" : "Margin"}
        </span>
        <LinkToggle box={box} isLinked={linked} onToggle={props.onToggle} />
      </div>
      <SideInput
        box={box}
        side="top"
        edit={edit}
        isLinked={linked}
        declared={declared}
      />
      <SideInput
        box={box}
        side="left"
        edit={edit}
        isLinked={linked}
        declared={declared}
      />
      <div className="box-ring-core">{props.children}</div>
      <SideInput
        box={box}
        side="right"
        edit={edit}
        isLinked={linked}
        declared={declared}
      />
      <SideInput
        box={box}
        side="bottom"
        edit={edit}
        isLinked={linked}
        declared={declared}
      />
    </div>
  );
};

const BoxModel = ({
  edit,
  declared,
}: {
  readonly edit: DirectEdit;
  readonly declared?: DeclaredMargins;
}) => {
  const [linkPadding, setLinkPadding] = useState(false);
  const [linkMargin, setLinkMargin] = useState(false);

  return (
    <div className="box-model">
      <BoxRing
        box="margin"
        edit={edit}
        isLinked={linkMargin}
        declared={declared}
        onToggle={() => setLinkMargin((x) => !x)}
      >
        <BoxRing
          box="padding"
          edit={edit}
          isLinked={linkPadding}
          onToggle={() => setLinkPadding((x) => !x)}
        >
          <span className="box-content" aria-hidden="true" />
        </BoxRing>
      </BoxRing>
    </div>
  );
};

export { BoxModel };

export type { DeclaredMargins };
