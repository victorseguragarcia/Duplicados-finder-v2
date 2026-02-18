import { DuplicateGroup } from '../types';
import { File, Folder } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DuplicateGroupProps {
    group: DuplicateGroup;
    selectedFiles: Set<string>;
    onToggleFile: (path: string) => void;
    onSelectAllButOne: (groupId: string) => void;
}

export function DuplicateGroupItem({ group, selectedFiles, onToggleFile, onSelectAllButOne }: DuplicateGroupProps) {
    return (
        <div className="mb-6 bg-zinc-900/50 border border-zinc-700/50 rounded-lg overflow-hidden">
            <div className="bg-zinc-800/80 px-4 py-3 border-b border-zinc-700/50 flex justify-between items-center">
                <div>
                    <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Hash: {group.id.substring(0, 12)}...</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-white font-medium">{group.files[0].formattedSize}</span>
                        <span className="text-zinc-500 text-sm">• {group.files.length} copias</span>
                    </div>
                </div>
                <button
                    onClick={() => onSelectAllButOne(group.id)}
                    className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-colors"
                >
                    Selección Auto
                </button>
            </div>

            <div className="divide-y divide-zinc-800">
                {group.files.map((file) => {
                    const isSelected = selectedFiles.has(file.path);
                    return (
                        <div
                            key={file.path}
                            className={twMerge(
                                "p-3 flex items-start gap-3 hover:bg-zinc-800/30 transition-colors cursor-pointer",
                                isSelected && "bg-red-500/5 hover:bg-red-500/10"
                            )}
                            onClick={() => onToggleFile(file.path)}
                        >
                            <div className="mt-1">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => { }} // Handled by div click
                                    className="rounded border-zinc-600 bg-zinc-800 text-red-500 focus:ring-red-500/50"
                                    tabIndex={-1}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <File size={16} className="text-zinc-400 flex-shrink-0" />
                                    <p className={clsx("text-sm font-medium truncate", isSelected ? "text-red-300" : "text-zinc-200")}>
                                        {file.name}
                                    </p>
                                </div>
                                <button
                                    className="flex items-center gap-1.5 text-xs text-zinc-500 truncate hover:text-blue-400 hover:underline text-left w-full"
                                    title="Click para abrir carpeta"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Open file location if electronAPI exists
                                        if (window.electronAPI) window.electronAPI.openFile(file.path);
                                    }}
                                >
                                    <Folder size={12} />
                                    {file.path}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
