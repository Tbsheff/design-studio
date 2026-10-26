import { useState } from 'react';
import { errorText } from './api';
import { pickFolder } from './folderPicker';

type ChooseResult = { path: string; unsupported: false } | { path: null; unsupported: boolean };

export interface FolderChooser {
  choose: (title: string, defaultPath?: string) => Promise<ChooseResult>;
  unsupported: boolean;
  picking: boolean;
}

export function useFolderChooser(onError: (message: string) => void): FolderChooser {
  const [unsupported, setUnsupported] = useState(false);
  const [picking, setPicking] = useState(false);
  const choose = async (title: string, defaultPath?: string): Promise<ChooseResult> => {
    setPicking(true);
    try {
      const outcome = await pickFolder({ title, ...(defaultPath ? { defaultPath } : {}) });
      if (outcome.kind === 'unsupported') setUnsupported(true);
      return outcome.kind === 'picked' ? { path: outcome.path, unsupported: false } : { path: null, unsupported: outcome.kind === 'unsupported' };
    } catch (err) {
      onError(errorText(err));
      return { path: null, unsupported: false };
    } finally {
      setPicking(false);
    }
  };
  return { choose, unsupported, picking };
}
