
import { parentPort } from 'worker_threads';
import fs from 'fs';
import crypto from 'crypto';

parentPort.on('message', (filePath) => {
    try {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('error', (err) => {
            parentPort.postMessage({ filePath, error: err.message });
        });

        stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            parentPort.postMessage({ filePath, hash: hash.digest('hex') });
        });

    } catch (error) {
        parentPort.postMessage({ filePath, error: error.message });
    }
});
