# BEV for Windows

The BEV dashboard in its own window, with a Start menu entry, a desktop shortcut and a taskbar icon.

## Install

Download **[BEV-Setup.exe](https://github.com/cbevss/bev-desktop/releases/latest/download/BEV-Setup.exe)** (or press **Install the app** on [bevbotdiscord.com](https://bevbotdiscord.com)) and run it. It downloads BEV and opens it. No admin rights needed.

Windows may say **"Windows protected your PC"** because the app isn't signed with a paid certificate yet. Press **More info**, then **Run anyway**.

To uninstall: Settings → Apps → Installed apps → BEV → Uninstall.

## How it works

The app shows [bevbotdiscord.com](https://bevbotdiscord.com) in its own window, so **website updates show up in the app straight away**. Nothing needs releasing for those.

- BEV's pages and signing in with Discord open inside the app. Every other link (Join Discord, Add to server, email) opens in your normal browser or mail app.
- If you're offline, the app shows a "Can't reach BEV" page and tries again when you're back online.
- The app checks this repository for new versions of itself and installs them when you close it.

## Releasing a new version of the app

Only needed when the app itself changes (this code, the icon, the name), never for website changes.

1. Change `"version"` in `package.json` (for example `1.0.0` → `1.0.1`) and commit.
2. Push a tag with the same version: `git tag v1.0.1 && git push origin v1.0.1`.
3. GitHub Actions builds the installer on Windows and publishes the release. Installed apps update themselves.

## Files

- `main.js`: the app window, menus, links and updates
- `routes.js`: which links open in the app and which open in the browser (`npm test` checks it)
- `offline.html`: the page shown when BEV can't be reached
- `build/`: the app icon
- `.github/workflows/release.yml`: builds and publishes the Windows installer
