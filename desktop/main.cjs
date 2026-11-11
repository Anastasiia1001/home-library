const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
protocol.registerSchemesAsPrivileged([{ scheme: 'library', privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: true
} }]);
function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 960, minWidth: 420, minHeight: 600,
    title: 'Домашня бібліотека', backgroundColor: '#211008',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('library://app/')) event.preventDefault();
  });
  win.loadURL('library://app/index.html');
}
app.whenReady().then(() => {
  const root = path.resolve(__dirname, '..', 'dist');
  protocol.handle('library', request => {
    const url = new URL(request.url);
    let relative;
    try { relative = decodeURIComponent(url.pathname); } catch { return new Response('Bad request', { status: 400 }); }
    const file = path.resolve(root, '.' + relative);
    if (url.hostname !== 'app' || !file.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
  ]));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
