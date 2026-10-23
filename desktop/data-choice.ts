import { dialog } from 'electron';
import { liveHolder, type LockInfo } from '../src/server/store/data-lock.js';

export interface DataChoiceInput {
  preferred: string;
  separate: string;
  explicit: boolean;
}

export type DataChoice = { dir: string } | { quit: string };

function holderText(dir: string, holder: LockInfo): string {
  return `${dir} is in use by another studio server (pid ${holder.pid}, http://127.0.0.1:${holder.port}). Two servers on one data folder can corrupt projects, so Design Studio will not share it.`;
}

export async function chooseDataDir(input: DataChoiceInput): Promise<DataChoice> {
  const holder = liveHolder(input.preferred, -1);
  if (!holder) return { dir: input.preferred };
  const detail = holderText(input.preferred, holder);
  if (input.explicit) return { quit: `${detail}\n\nStop the other server, or set STUDIO_DATA_DIR to another folder.` };
  const separateHolder = liveHolder(input.separate, -1);
  if (separateHolder) return { quit: `${detail}\n\n${holderText(input.separate, separateHolder)}` };
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    message: 'Studio data folder is in use',
    detail: `${detail}\n\nUse a separate data folder for this app?\n${input.separate}`,
    buttons: ['Use Separate Folder', 'Quit'],
    defaultId: 0,
    cancelId: 1,
  });
  return response === 0 ? { dir: input.separate } : { quit: '' };
}
