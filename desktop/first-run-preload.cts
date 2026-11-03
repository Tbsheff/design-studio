import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld(
  'studioSetup',
  Object.freeze({
    done: () => ipcRenderer.invoke('setup:continue'),
    fix: (action: string) => ipcRenderer.invoke('setup:fix', action),
    info: () => ipcRenderer.invoke('setup:info'),
    run: () => ipcRenderer.invoke('setup:run'),
  }),
);
