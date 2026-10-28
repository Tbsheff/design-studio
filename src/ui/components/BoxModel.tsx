import { useState, type ReactNode } from 'react';
import type { DirectStyleProperty } from '../../shared/contracts';
import { SIDES, type Side } from '../cssValues';
import type { DirectEdit } from '../useDirectEdit';
import { Icon } from './Icon';
import { NumberInput } from './NumberField';
import { TokenControl } from './TokenControl';

type Box = 'padding' | 'margin';

const SIDE_LABEL: Record<Side, string> = { top: 'top', right: 'right', bottom: 'bottom', left: 'left' };

function propsOf(box: Box): DirectStyleProperty[] {
  return SIDES.map((side) => `${box}-${side}` as DirectStyleProperty);
}

function LinkToggle({ box, linked, onToggle }: { box: Box; linked: boolean; onToggle: () => void }) {
  const name = box === 'padding' ? 'Padding' : 'Margin';
  return (
    <button
      type="button"
      className="icon-btn ins-link"
      aria-label={`Link ${box} sides`}
      aria-pressed={linked}
      data-tip={linked ? `${name}: all sides change together` : `${name}: set each side`}
      onClick={onToggle}
    >
      <Icon name={linked ? 'link' : 'unlink'} size={14} />
    </button>
  );
}

function SideInput({ box, side, edit, linked }: { box: Box; side: Side; edit: DirectEdit; linked: boolean }) {
  const prop = `${box}-${side}` as DirectStyleProperty;
  const name = box === 'padding' ? 'Padding' : 'Margin';
  const label = `${name} ${SIDE_LABEL[side]}`;
  const targets = linked ? propsOf(box) : undefined;
  return (
    <span className={`side-cell ${side}`}>
      <NumberInput className="side" spec={{ prop, label, edit, min: box === 'padding' ? 0 : undefined, targets }} />
      <TokenControl prop={prop} label={label} edit={edit} targets={targets} variant="mini" />
    </span>
  );
}

function BoxRing(props: { box: Box; edit: DirectEdit; linked: boolean; onToggle: () => void; children: ReactNode }) {
  const { box, edit, linked } = props;
  return (
    <div className={`box-ring ${box}`}>
      <div className="box-ring-head">
        <span className="box-ring-label">{box === 'padding' ? 'Padding' : 'Margin'}</span>
        <LinkToggle box={box} linked={linked} onToggle={props.onToggle} />
      </div>
      <SideInput box={box} side="top" edit={edit} linked={linked} />
      <SideInput box={box} side="left" edit={edit} linked={linked} />
      <div className="box-ring-core">{props.children}</div>
      <SideInput box={box} side="right" edit={edit} linked={linked} />
      <SideInput box={box} side="bottom" edit={edit} linked={linked} />
    </div>
  );
}

export function BoxModel({ edit }: { edit: DirectEdit }) {
  const [linkPadding, setLinkPadding] = useState(false);
  const [linkMargin, setLinkMargin] = useState(false);
  return (
    <div className="box-model">
      <BoxRing box="margin" edit={edit} linked={linkMargin} onToggle={() => setLinkMargin((x) => !x)}>
        <BoxRing box="padding" edit={edit} linked={linkPadding} onToggle={() => setLinkPadding((x) => !x)}>
          <span className="box-content" aria-hidden="true" />
        </BoxRing>
      </BoxRing>
    </div>
  );
}
