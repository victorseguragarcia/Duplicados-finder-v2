export interface FileItem {
    path: string;
    name: string;
    size: number;
    formattedSize: string;
    hash: string;
}

export interface DuplicateGroup {
    id: string; // hash
    files: FileItem[];
}

export type ScanStatus = 'idle' | 'scanning' | 'grouping' | 'hashing' | 'complete' | 'error';
