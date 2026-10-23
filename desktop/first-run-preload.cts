import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld(
  'studioSetup',
  Object.freeze({
    run: () => ipcRenderer.invoke('setup:run'),
    fix: (action: string) => ipcRenderer.invoke('setup:fix', action),
    info: () => ipcRenderer.invoke('setup:info'),
    done: () => ipcRenderer.invoke('setup:continue'),
  }),
);
