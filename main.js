'use strict';
// BEV for Windows: a window that shows bevbotdiscord.com. The app shows the live website, so anything uploaded to
// the website appears here straight away. The app itself (this file, the window and the icon) updates from the
// GitHub releases of cbevss/bev-desktop.

const { app, BrowserWindow, Menu, shell, session, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { decide } = require('./routes');

const SITE = 'https://bevbotdiscord.com';
const START = SITE + '/dashboard';
const APP_ID = 'com.bevbotdiscord.desktop';

let win = null;

// Only one BEV window: opening the app again brings the open one to the front.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

app.setAppUserModelId(APP_ID);

// Sites see a normal Chrome browser (plus "BEVDesktop", so the website can tell it's the app).
app.userAgentFallback = app.userAgentFallback
  .replace(/\sElectron\/\S+/, '')
  .replace(/\sbev-desktop\/\S+/i, '')
  .replace(/\sBEV\/\S+/, '') + ' BEVDesktop/' + app.getVersion();

// ---------- the window's size and place, kept between runs ----------
const stateFile = () => path.join(app.getPath('userData'), 'window.json');

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (s && s.width >= 380 && s.height >= 500) return s;
  } catch (e) { /* first run */ }
  return { width: 1280, height: 860 };
}

function saveState() {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch (e) { /* not important */ }
}

// ---------- links ----------
function openOutside(url) {
  if (decide(url) === 'browser') shell.openExternal(url);
}

function go(url) {
  if (win && decide(url) === 'app') win.loadURL(url);
}

function showOffline(failedUrl) {
  win.loadFile(path.join(__dirname, 'offline.html'), { query: { url: decide(failedUrl) === 'app' ? failedUrl : START } });
}

function createWindow() {
  const state = loadState();
  win = new BrowserWindow({
    x: state.x, y: state.y, width: state.width, height: state.height,
    minWidth: 380, minHeight: 500,
    title: 'BEV',
    backgroundColor: '#04060C',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  if (state.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('close', saveState);
  win.on('closed', () => { win = null; });

  const wc = win.webContents;
  // Links that open a new tab: BEV's own pages open here, everything else in the browser.
  wc.setWindowOpenHandler(({ url }) => {
    if (decide(url) === 'app') go(url); else openOutside(url);
    return { action: 'deny' };
  });
  // Links clicked in the page, and redirects: anything that isn't BEV or signing in opens in the browser.
  const guard = (event, url) => {
    if (decide(url) !== 'app') {
      event.preventDefault();
      openOutside(url);
    }
  };
  wc.on('will-navigate', guard);
  wc.on('will-redirect', guard);
  wc.on('did-fail-load', (event, code, description, url, isMainFrame) => {
    // -3 is a cancelled load (like a link that opened in the browser instead), not a real failure.
    if (isMainFrame && code !== -3 && url && !url.startsWith('file:')) showOffline(url);
  });
  // The mouse's back and forward buttons.
  win.on('app-command', (event, command) => {
    if (command === 'browser-backward' && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
    if (command === 'browser-forward' && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  });
  wc.on('context-menu', (event, params) => contextMenu(params).popup({ window: win }));
  // Ctrl+R reloads too, like in a browser.
  wc.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && !input.alt && !input.shift && input.key.toLowerCase() === 'r') {
      event.preventDefault();
      wc.reload();
    }
  });

  win.loadURL(START);
}

// ---------- right-click menu: copy, paste, spelling and links ----------
function contextMenu(params) {
  const wc = win.webContents;
  const items = [];
  if (params.misspelledWord) {
    for (const word of params.dictionarySuggestions.slice(0, 5)) items.push({ label: word, click: () => wc.replaceMisspelling(word) });
    items.push({ label: 'Add to dictionary', click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord) });
    items.push({ type: 'separator' });
  }
  if (params.linkURL) {
    items.push({ label: 'Open link in browser', click: () => { if (decide(params.linkURL) !== 'block') shell.openExternal(params.linkURL); } });
    items.push({ label: 'Copy link', click: () => require('electron').clipboard.writeText(params.linkURL) });
    items.push({ type: 'separator' });
  }
  if (params.isEditable) {
    items.push({ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' });
  } else if (params.selectionText) {
    items.push({ role: 'copy' });
  } else {
    items.push(
      { label: 'Back', enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() },
      { label: 'Forward', enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() },
      { label: 'Reload', click: () => wc.reload() });
  }
  return Menu.buildFromTemplate(items);
}

// ---------- the menu bar (hidden; press Alt to show it) ----------
function buildMenu() {
  const nav = (fn) => () => { if (win) fn(win.webContents); };
  return Menu.buildFromTemplate([
    { label: 'BEV', submenu: [
      { label: 'Dashboard', accelerator: 'CmdOrCtrl+D', click: () => go(SITE + '/dashboard') },
      { label: 'Home', accelerator: 'Alt+Home', click: () => go(SITE + '/') },
      { label: 'Status', click: () => go(SITE + '/status.html') },
      { label: 'Support', click: () => go(SITE + '/support.html') },
      { type: 'separator' },
      { label: 'Open this page in my browser', click: () => { if (win) shell.openExternal(win.webContents.getURL().startsWith('http') ? win.webContents.getURL() : SITE); } },
      { label: 'Check for app updates', click: () => checkForUpdates(true) },
      { type: 'separator' },
      { role: 'quit', label: 'Quit BEV' },
    ] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [
      { label: 'Back', accelerator: 'Alt+Left', click: nav((wc) => wc.navigationHistory.canGoBack() && wc.navigationHistory.goBack()) },
      { label: 'Forward', accelerator: 'Alt+Right', click: nav((wc) => wc.navigationHistory.canGoForward() && wc.navigationHistory.goForward()) },
      { label: 'Reload', accelerator: 'F5', click: nav((wc) => wc.reload()) },
      { type: 'separator' },
      { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ] },
    { label: 'Help', submenu: [
      { label: 'Email support', click: () => shell.openExternal('mailto:bevbotsupport@gmail.com') },
      { label: 'Join the BEV Discord', click: () => shell.openExternal('https://discord.gg/cbevs') },
      { type: 'separator' },
      { label: 'About BEV', click: () => dialog.showMessageBox(win, { type: 'info', title: 'About BEV', message: 'BEV for Windows',
        detail: `App version ${app.getVersion()}\nThe app shows bevbotdiscord.com, so it always has the latest website.`, icon: path.join(__dirname, 'build', 'icon.png') }) },
    ] },
  ]);
}

// ---------- app updates (the website itself never needs one) ----------
let updater = null;
function checkForUpdates(byHand) {
  if (!app.isPackaged) {
    if (byHand) dialog.showMessageBox(win, { message: 'Updates only work in the installed app.' });
    return;
  }
  try {
    updater = updater || require('electron-updater').autoUpdater;
  } catch (e) {
    return;
  }
  if (byHand) {
    updater.checkForUpdates().then((result) => {
      const newer = result && result.updateInfo && result.updateInfo.version !== app.getVersion();
      dialog.showMessageBox(win, { message: newer ? `Downloading BEV ${result.updateInfo.version}. It installs when you close the app.` : 'You have the newest version of the app.' });
    }).catch(() => dialog.showMessageBox(win, { message: 'Couldn’t check for updates. Try again later.' }));
  } else {
    updater.checkForUpdatesAndNotify().catch(() => { /* offline: try again later */ });
  }
}

app.whenReady().then(() => {
  // The website doesn't need the camera, microphone or location, so the app never asks for them.
  const allowed = new Set(['clipboard-sanitized-write', 'fullscreen', 'notifications']);
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => callback(allowed.has(permission)));
  Menu.setApplicationMenu(buildMenu());
  createWindow();
  setTimeout(() => checkForUpdates(false), 8000);
  setInterval(() => checkForUpdates(false), 6 * 60 * 60 * 1000);
});

app.on('window-all-closed', () => app.quit());

// Nothing may open a window or webview the app didn't make.
app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault());
});
