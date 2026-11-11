const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const smoke = process.argv.includes('--smoke-test');
if (smoke) app.setPath('userData', require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(), 'library-smoke-')));
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
  if (smoke) {
    const deadline = setTimeout(() => { console.error('Smoke test timed out'); app.exit(1); }, 45000);
    win.webContents.on('did-fail-load', (_, code, text) => { console.error(code, text); app.exit(1); });
    win.webContents.once('did-finish-load', async () => {
      try {
        const result = await win.webContents.executeJavaScript(`(async () => {
          for (let i = 0; i < 100 && !document.querySelector('#content .book'); i++) await new Promise(r => setTimeout(r, 100));
          if (!document.querySelector('#content .book')) throw Error('Library failed to render');
          const { saveBooks, openDB } = await import('./storage.js');
          const entry = { id: 'smoke-test', title: 'Перевірка', quotes: [{text: 'Цитата'}], cover: 'data:image/png;base64,YQ==' };
          await saveBooks([entry]);
          const saved = await openDB();
          if (saved[0]?.title !== entry.title || saved[0]?.cover !== entry.cover || saved[0]?.quotes[0]?.text !== 'Цитата') throw Error('IndexedDB persistence failed');
          return 'PASS: packaged app rendered; IndexedDB preserved book, cover and quote';
        })()`);
        console.log(result); clearTimeout(deadline); app.exit(0);
      } catch (error) { console.error(error); app.exit(1); }
    });
  }
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
