import type { Project, RunLevel, SelectionContext } from '../shared/contracts';
import { TRY_VARIANTS_COMMAND, elementVariantsBlocker } from '../shared/element-variants';
import { useCommands } from './commands/registry';
import type { VariationsState } from './useVariations';

export function useTryVariants(project: Project | null, selection: SelectionContext[], variations: VariationsState) {
  const blocker = project ? elementVariantsBlocker(project, selection) : 'Wait for the design to load';
  useCommands(() => [
    {
      id: TRY_VARIANTS_COMMAND,
      title: 'Try variants of the selected element',
      group: 'Selection',
      icon: 'compare',
      slash: 'variants',
      keywords: 'try versions options alternatives element',
      run: () => {
        if (selection[0]) variations.askElement(selection[0]);
      },
      ...(blocker ? { disabled: blocker } : {}),
    },
  ]);
  return async (prompt: string, count: number, level: RunLevel) => {
    const element = selection[0];
    if (blocker || !element) throw new Error(blocker ?? 'Select one element first');
    await variations.proposeElement(element, prompt, count, level);
  };
}
