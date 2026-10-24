import type { CreateTokenResult } from '../../shared/contracts';
import { cssVarFor } from '../../shared/token-match';
import { api } from '../api';
import type { StyleValues } from '../cssValues';
import type { DesignTokens } from '../useDesignSystemState';
import type { DirectEdit } from '../useDirectEdit';
import type { CreateRequest } from '../useTokenSnap';
import { CreateTokenDialog, type CreateTokenSubmit } from './CreateTokenDialog';
import { Icon } from './Icon';
import { InspectorSection } from './InspectorFields';
import { NumberField } from './NumberField';

export function MultiNote({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <div className="ins-multi-note" role="note">
      <Icon name="alert" size={14} />
      <span>{reason}</span>
    </div>
  );
}

export function MultiSizeSection({ edit }: { edit: DirectEdit }) {
  return (
    <InspectorSection title="Size">
      <div className="ins-grid">
        <NumberField short="W" spec={{ prop: 'width', label: 'Width', edit, min: 0 }} />
        <NumberField short="H" spec={{ prop: 'height', label: 'Height', edit, min: 0 }} />
      </div>
    </InspectorSection>
  );
}

interface HostProps {
  projectId: string;
  directionId: string | null;
  tokens: DesignTokens | null;
  edit: DirectEdit;
  request: CreateRequest | null;
  onClose: () => void;
}

export function MultiCreateTokenHost({ projectId, directionId, tokens, edit, request, onClose }: HostProps) {
  if (!tokens || !request) return null;
  const submit = async (input: CreateTokenSubmit): Promise<CreateTokenResult> => {
    if (!directionId) throw new Error('No direction selected');
    await edit.drain();
    const result = await api.createToken(projectId, directionId, {
      group: input.group,
      name: input.name,
      value: input.value,
      ...(input.darkValue ? { darkValue: input.darkValue } : {}),
    });
    tokens.replace(result.state);
    if (input.apply) {
      const cssVar = cssVarFor(input.group, input.name);
      const style: Partial<StyleValues> = Object.fromEntries(request.targets.map((p) => [p, `var(${cssVar})`]));
      edit.preview(style);
      edit.commit();
    }
    return result;
  };
  return <CreateTokenDialog request={request} entries={tokens.entries} onSubmit={submit} onClose={onClose} />;
}
