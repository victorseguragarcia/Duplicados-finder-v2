/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        selectDirectory: () => Promise<string | null>;
        scanDirectory: (path: string, options?: { recursive: boolean }) => void;
        deleteFiles: (paths: string[]) => Promise<any[]>;
        openFile: (path: string) => void;
        openFolder: (path: string) => void;
        onScanProgress: (callback: (data: any) => void) => void;
        onScanComplete: (callback: (data: any) => void) => void;
        onScanError: (callback: (msg: string) => void) => void;
        removeScanListeners: () => void;
    }
}
