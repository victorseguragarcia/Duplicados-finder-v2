import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => ipcRenderer.invoke('ping'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    scanDirectory: (path, options = {}) => ipcRenderer.send('scan-directory', { dirPath: path, ...options }),
    deleteFiles: (paths) => ipcRenderer.invoke('delete-files', paths),
    openFile: (path) => ipcRenderer.invoke('open-file', path),
    openFolder: (path) => ipcRenderer.invoke('open-folder', path),
    onScanProgress: (callback) => ipcRenderer.on('scan-progress', (_event, value) => callback(value)),
    onScanComplete: (callback) => ipcRenderer.on('scan-complete', (_event, value) => callback(value)),
    onScanError: (callback) => ipcRenderer.on('scan-error', (_event, value) => callback(value)),
    removeScanListeners: () => {
        ipcRenderer.removeAllListeners('scan-progress');
        ipcRenderer.removeAllListeners('scan-complete');
        ipcRenderer.removeAllListeners('scan-error');
    }
});
