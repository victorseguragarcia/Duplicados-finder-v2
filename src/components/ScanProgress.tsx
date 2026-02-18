import { motion } from 'framer-motion';
import { ScanStatus } from '../types';

interface ScanProgressProps {
    status: ScanStatus;
    progress: number;
    message: string;
}

export function ScanProgress({ status, progress, message }: ScanProgressProps) {
    if (status === 'idle' || status === 'complete') return null;

    return (
        <div className="w-full max-w-xl mx-auto p-6 bg-zinc-800 rounded-xl shadow-lg border border-zinc-700">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-white capitalize">
                    {status === 'scanning' ? 'Escaneando...' : status === 'grouping' ? 'Agrupando...' : status === 'hashing' ? 'Verificando...' : status}
                </h3>
                <span className="text-sm text-zinc-400">{Math.round(progress)}%</span>
            </div>

            <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            <p className="mt-3 text-sm text-zinc-400 text-center truncate">{message}</p>
        </div>
    );
}
