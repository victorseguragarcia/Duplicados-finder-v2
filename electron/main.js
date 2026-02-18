import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { findDuplicates, deleteFiles } from './scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        frame: false, // Frameless window
        resizable: true, // Allow resizing
        titleBarStyle: 'hidden', // Hide title bar but keep window controls (traffic lights on macOS, maybe standard buttons on Windows if supported by config, though usually needs custom implementation with frame:false on Windows)
        titleBarOverlay: {
            color: '#18181b', // Match zinc-950
            symbolColor: '#ffffff',
            height: 30
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false // Explicitly disable sandbox
        },
    });

    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools(); // Optional: Open DevTools
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    // IPC Handlers
    ipcMain.handle('ping', () => 'pong');

    ipcMain.handle('select-directory', async () => {
        console.log('Main: select-directory called');
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });
        console.log('Main: select-directory result:', result.canceled ? 'canceled' : result.filePaths[0]);
        return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.on('scan-directory', async (event, { dirPath, recursive }) => {
        console.log('Main: scan-directory called for', dirPath, 'recursive:', recursive);
        try {
            const results = await findDuplicates(dirPath, { recursive }, event);
            event.sender.send('scan-complete', results);
        } catch (error) {
            console.error('Scan failed:', error);
            event.sender.send('scan-error', error.message);
        }
    });

    ipcMain.handle('delete-files', async (event, filePaths) => {
        console.log('Main: delete-files called for', filePaths.length, 'files');
        return await deleteFiles(filePaths);
    });

    ipcMain.handle('open-file', async (event, filePath) => {
        console.log('Main: open-file called for', filePath);
        shell.showItemInFolder(filePath);
    });

    ipcMain.handle('open-folder', async (event, dirPath) => {
        console.log('Main: open-folder called for', dirPath);
        const error = await shell.openPath(dirPath);
        if (error) {
            console.error('Failed to open folder:', error);
            return error;
        }
        return null;
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
