import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function scanDirectory(dirPath, recursive = true) {
    let files = [];
    try {
        const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);

            // Skip hidden folders and node_modules
            if (item.name.startsWith('.') || item.name === 'node_modules') continue;

            if (item.isDirectory()) {
                if (recursive) {
                    files = files.concat(await scanDirectory(fullPath, recursive));
                }
            } else if (item.isFile()) {
                try {
                    const stats = await fs.promises.stat(fullPath);
                    files.push({
                        path: fullPath,
                        name: item.name,
                        size: stats.size,
                        formattedSize: formatBytes(stats.size)
                    });
                } catch (err) {
                    console.error(`Error stat file ${fullPath}:`, err);
                }
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
    }
    return files;
}

function processHashesWithWorkers(files, updateProgress, concurrency = 4) {
    return new Promise((resolve) => {
        const workerPath = path.join(__dirname, 'hashWorker.js');
        const workers = [];
        const results = {};
        let activeWorkers = 0;
        let fileIndex = 0;
        let processedCount = 0;
        const totalFiles = files.length;

        const startWorker = (worker) => {
            if (fileIndex >= totalFiles) return;
            const file = files[fileIndex++];
            worker.postMessage(file.path);
            activeWorkers++;
        };

        const onMessage = (worker, message) => {
            activeWorkers--;
            processedCount++;

            if (message.error) {
                console.error(`Error hashing ${message.filePath}: ${message.error}`);
            } else {
                if (!results[message.hash]) results[message.hash] = [];
                // Find original file object to keep metadata
                const originalFile = files.find(f => f.path === message.filePath);
                if (originalFile) {
                    results[message.hash].push({ ...originalFile, hash: message.hash });
                }
            }

            updateProgress(processedCount, totalFiles);

            if (fileIndex < totalFiles) {
                startWorker(worker);
            } else if (activeWorkers === 0) {
                // All done
                cleanup();
                resolve(results);
            }
        };

        const cleanup = () => {
            workers.forEach(w => w.terminate());
        };

        // Initialize workers
        // Use fewer workers if we have fewer files than concurrency
        const actualConcurrency = Math.min(concurrency, totalFiles);

        for (let i = 0; i < actualConcurrency; i++) {
            const worker = new Worker(workerPath);
            worker.on('message', (msg) => onMessage(worker, msg));
            worker.on('error', (err) => console.error('Worker error:', err));
            workers.push(worker);
            startWorker(worker);
        }
    });
}

export async function findDuplicates(dirPath, options = {}, event) {
    const recursive = options.recursive !== false; // Default true

    // 1. Scan Phase
    event.sender.send('scan-progress', { status: 'scanning', message: 'Scanning directory...', progress: 0 });
    const allFiles = await scanDirectory(dirPath, recursive);

    if (allFiles.length === 0) return [];

    event.sender.send('scan-progress', { status: 'grouping', message: `Found ${allFiles.length} files. Grouping by size...`, progress: 10 });

    // 2. Group by size
    const sizeGroups = {};
    for (const file of allFiles) {
        if (!sizeGroups[file.size]) sizeGroups[file.size] = [];
        sizeGroups[file.size].push(file);
    }

    // 3. Filter only groups with >1 file
    const potentialDuplicates = Object.values(sizeGroups).filter(group => group.length > 1);

    // Flatten potential duplicates for hashing
    const filesToHash = potentialDuplicates.flat();

    if (filesToHash.length === 0) {
        return [];
    }

    // 4. Hashing Phase with Workers
    // Set concurrency based on available cores, defaulting to 4
    const os = await import('os');
    const cpuCount = os.cpus().length;
    // Leave one core free for UI/Main process
    const concurrency = Math.max(1, cpuCount - 1);

    event.sender.send('scan-progress', {
        status: 'hashing',
        message: `Starting hash verification with ${concurrency} threads...`,
        progress: 10
    });

    const hashGroups = await processHashesWithWorkers(filesToHash, (processed, total) => {
        const relativeProgress = (processed / total) * 90;
        const currentProgress = 10 + Math.round(relativeProgress);

        // Send update every 5% or for every file if few files
        if (total < 100 || processed % Math.ceil(total / 20) === 0 || processed === total) {
            event.sender.send('scan-progress', {
                status: 'hashing',
                message: `Verifying duplicates... ${processed}/${total} files`,
                progress: currentProgress
            });
        }
    }, concurrency);

    // 5. Structure final results
    const duplicates = [];
    for (const hash in hashGroups) {
        if (hashGroups[hash].length > 1) {
            duplicates.push({
                id: hash,
                files: hashGroups[hash]
            });
        }
    }

    return duplicates;
}

export async function deleteFiles(filePaths) {
    const results = [];
    for (const filePath of filePaths) {
        try {
            await fs.promises.unlink(filePath);
            results.push({ path: filePath, success: true });
        } catch (error) {
            results.push({ path: filePath, success: false, error: error.message });
        }
    }
    return results;
}
