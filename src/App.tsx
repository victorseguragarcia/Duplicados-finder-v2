import { useState, useEffect } from 'react';
import { RefreshCcw, FolderOpen, Trash2, AlertCircle, CheckCircle, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { DuplicateGroup, ScanStatus } from './types';
import { ScanProgress } from './components/ScanProgress';
import { DuplicateGroupItem } from './components/DuplicateGroup';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
    const [status, setStatus] = useState<ScanStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [results, setResults] = useState<DuplicateGroup[]>([]);
    const [selectedDir, setSelectedDir] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [scanRecursive, setScanRecursive] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const handleProgress = (data: any) => {
            setStatus(data.status);
            setProgress(data.progress || 0);
            setMessage(data.message);
        };

        const handleComplete = (data: DuplicateGroup[]) => {
            setStatus('complete');
            setResults(data);
            setProgress(100);
            setMessage(`Encontrados ${data.length} grupos de duplicados.`);
        };

        const handleError = (msg: string) => {
            setStatus('error');
            setMessage(msg);
        };

        if (window.electronAPI) {
            window.electronAPI.onScanProgress(handleProgress);
            window.electronAPI.onScanComplete(handleComplete);
            window.electronAPI.onScanError(handleError);
        }

        return () => {
            if (window.electronAPI) window.electronAPI.removeScanListeners();
        };
    }, []);

    const handleSelectDir = async () => {
        console.log('Renderer: handleSelectDir clicked');
        if (!window.electronAPI) {
            console.error('Renderer: electronAPI is missing!');
            alert('Error: Electron API is missing');
            return;
        }
        const path = await window.electronAPI.selectDirectory();
        console.log('Renderer: Selected path:', path);
        if (path) {
            setSelectedDir(path);
            setResults([]);
            setSelectedFiles(new Set());
            setStatus('idle');
        }
    };

    const startScan = () => {
        if (selectedDir && window.electronAPI) {
            window.electronAPI.scanDirectory(selectedDir, { recursive: scanRecursive });
        }
    };

    const toggleFile = (path: string) => {
        const newSet = new Set(selectedFiles);
        if (newSet.has(path)) {
            newSet.delete(path);
        } else {
            newSet.add(path);
        }
        setSelectedFiles(newSet);
    };

    const selectAllButOne = (groupId: string) => {
        const group = results.find(g => g.id === groupId);
        if (!group) return;

        // Keep the one with shortest path logic
        const sorted = [...group.files].sort((a, b) => a.path.length - b.path.length);
        const [keep, ...toDelete] = sorted;

        const newSet = new Set(selectedFiles);
        if (newSet.has(keep.path)) newSet.delete(keep.path);
        toDelete.forEach(f => newSet.add(f.path));
        setSelectedFiles(newSet);
    };

    const deleteSelected = async () => {
        if (selectedFiles.size === 0 || !window.electronAPI) return;

        if (!confirm(`Are you sure you want to permanently delete ${selectedFiles.size} files?`)) return;

        const paths = Array.from(selectedFiles);
        const resultsDelete = await window.electronAPI.deleteFiles(paths);

        const deletedPaths = new Set(resultsDelete.filter((r: any) => r.success).map((r: any) => r.path));

        setResults(prev => prev.map(group => ({
            ...group,
            files: group.files.filter(f => !deletedPaths.has(f.path))
        })).filter(group => group.files.length > 1));

        setSelectedFiles(new Set());

        const failures = resultsDelete.filter((r: any) => !r.success);
        if (failures.length > 0) {
            setToast({ message: `Deleted ${deletedPaths.size} files. Failed to delete ${failures.length} files.`, type: 'error' });
        } else {
            setToast({ message: `Successfully deleted ${deletedPaths.size} files.`, type: 'success' });
        }

        setTimeout(() => setToast(null), 3000);
    };

    const totalSizeSelected = Array.from(selectedFiles).reduce((acc, path) => {
        for (const group of results) {
            const file = group.files.find(f => f.path === path);
            if (file) return acc + file.size;
        }
        return acc;
    }, 0);

    const duplicateCount = results.reduce((acc, g) => acc + g.files.length, 0);
    const wastedSpace = results.reduce((acc, g) => {
        const size = g.files[0]?.size || 0;
        return acc + (g.files.length - 1) * size;
    }, 0);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 pt-[15px]">
            <header className="bg-zinc-900/50 backdrop-blur border-b border-zinc-800 p-4 sticky top-0 z-10 drag-region">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <RefreshCcw size={18} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                            Buscador de Duplicados
                        </h1>
                    </div>

                    {selectedDir && (
                        <div className="flex bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50 items-center gap-1 flex-1 max-w-xl mx-4 relative group focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                            <Search size={14} className="text-zinc-500 ml-2 group-focus-within:text-blue-400" />
                            <input
                                type="text"
                                value={selectedDir}
                                onChange={(e) => {
                                    setSelectedDir(e.target.value);
                                    setResults([]);
                                    setStatus('idle');
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        startScan();
                                    }
                                }}
                                className="bg-transparent border-none text-sm text-zinc-300 w-full focus:ring-0 px-2 placeholder:text-zinc-600 outline-none"
                                placeholder="Ruta de la carpeta..."
                            />
                            <button
                                onClick={() => window.electronAPI.openFolder(selectedDir)}
                                className="p-1.5 hover:bg-zinc-700 rounded transition-colors text-zinc-300"
                                title="Abrir en Explorador"
                            >
                                <FolderOpen size={16} />
                            </button>
                            <button
                                onClick={handleSelectDir}
                                className="p-1.5 hover:bg-zinc-700 rounded transition-colors text-zinc-300"
                                title="Seleccionar carpeta"
                            >
                                <Search size={16} />
                            </button>
                            <button
                                onClick={startScan}
                                className="p-1.5 hover:bg-zinc-700 rounded transition-colors text-zinc-300"
                                title="Volver a escanear"
                            >
                                <RefreshCcw size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
                {!selectedDir ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-black/50">
                            <FolderOpen size={40} className="text-zinc-600" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Selecciona una carpeta</h2>
                        <p className="text-zinc-500 max-w-sm mb-8">
                            Encuentra y elimina archivos duplicados para recuperar espacio.
                        </p>
                        <button
                            onClick={handleSelectDir}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <FolderOpen size={20} />
                            Seleccionar Carpeta
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-2xl font-semibold">Panel de Control</h2>
                                <p className="text-zinc-500 text-sm mt-1">
                                    {status === 'complete'
                                        ? `Encontrados ${duplicateCount} duplicados ocupando ${formatSize(wastedSpace)}`
                                        : 'Gestiona tu escaneo'}
                                </p>
                            </div>

                            {status === 'idle' && (
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={scanRecursive}
                                            onChange={(e) => setScanRecursive(e.target.checked)}
                                            className="form-checkbox bg-zinc-800 border-zinc-700 rounded text-blue-600 focus:ring-blue-500/50"
                                        />
                                        <span className="text-sm">Escanear subcarpetas</span>
                                    </label>
                                    <button
                                        onClick={startScan}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg transition-all flex items-center gap-2"
                                    >
                                        <RefreshCcw size={18} />
                                        Escanear
                                    </button>
                                </div>
                            )}
                        </div>

                        {(status === 'scanning' || status === 'grouping' || status === 'hashing') && (
                            <div className="mb-8">
                                <ScanProgress status={status} progress={progress} message={message} />
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="space-y-4">
                                {results.map(group => (
                                    <DuplicateGroupItem
                                        key={group.id}
                                        group={group}
                                        selectedFiles={selectedFiles}
                                        onToggleFile={toggleFile}
                                        onSelectAllButOne={selectAllButOne}
                                    />
                                ))}
                            </div>
                        )}

                        {status === 'complete' && results.length === 0 && (
                            <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-zinc-800">
                                <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                                <h3 className="text-xl font-medium text-white">¡No hay duplicados!</h3>
                                <p className="text-zinc-500 mt-2">Tus archivos están limpios y organizados.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {selectedFiles.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, x: '-50%' }}
                        animate={{ y: 0, opacity: 1, x: '-50%' }}
                        exit={{ y: 100, opacity: 0, x: '-50%' }}
                        className="fixed bottom-8 left-1/2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 shadow-2xl rounded-2xl p-4 flex items-center gap-6 z-50"
                    >
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Seleccionados</span>
                            <span className="text-white font-bold text-lg">{selectedFiles.size} archivos</span>
                        </div>
                        <div className="h-8 w-px bg-zinc-700/50"></div>
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Recuperar</span>
                            <span className="text-white font-bold text-lg">{formatSize(totalSizeSelected)}</span>
                        </div>
                        <button
                            onClick={() => setSelectedFiles(new Set())}
                            className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
                        >
                            <X size={18} />
                            Cancelar
                        </button>
                        <button
                            onClick={deleteSelected}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-semibold shadow-lg shadow-red-900/20 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={18} />
                            Borrar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ y: -50, opacity: 0, right: 16 }}
                        animate={{ y: 0, opacity: 1, right: 16 }}
                        exit={{ y: -50, opacity: 0, right: 16 }}
                        className={clsx(
                            "fixed top-4 p-4 rounded-xl shadow-2xl flex items-center gap-3 z-50",
                            toast.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
                        )}
                    >
                        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
