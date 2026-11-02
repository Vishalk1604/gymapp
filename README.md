# GymApp

A weekly gym planner for your phone, built as an installable web app (PWA) for Android and iPhone.

- See all 7 days of the week, each with its own workout title (e.g. "Back & Biceps").
- Group exercises into categories (e.g. "Back", "Biceps").
- Give each exercise as many sets as you like, each with its own weight and reps.
- Use the **− / +** buttons to change weight and reps. Hold a button to repeat it, or tap the number to type it.
- Choose a **2.5 kg / 5 kg** weight step separately for each exercise.
- If you delete something by mistake, tap **Undo**.
- It works offline once installed. Your data stays on your phone. Use Export/Import in Settings to back it up.

There's no build step: it is plain HTML, CSS and JavaScript.

## Run it on your computer

```bash
node scripts/serve.mjs
```

Open http://localhost:8080. To try it on your phone over Wi-Fi, run `node scripts/serve.mjs --lan` and open the address it prints. Offline mode only turns on with HTTPS, so you need the hosted version for that.

## Put it online for free (GitHub Pages)

1. Create a new repository on GitHub (for example `gymapp`) and push this folder to it.
2. In the repository, go to **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, then branch **main** and folder **/ (root)**. Save.
3. After a minute the app is live at `https://<your-username>.github.io/gymapp/`.

All paths are relative, so the app works in a sub-folder like `/gymapp/`.

## Install on your phone

- **iPhone (Safari):** open the link, tap **Share**, then **Add to Home Screen**.
- **Android (Chrome):** open the link, tap **⋮**, then **Install app** (or **Add to Home screen**).

Open GymApp from the home screen. It runs full-screen and works without internet.

## Backups

Your plan is stored on the phone, inside the installed app. To keep it safe or move it to a new phone, open **Settings (gear) → Export backup**. That gives you a `.json` file; open **Import backup** on the new phone to load it.

## Updating the app

After changing files, push to GitHub. Installed phones load the new version in the background and use it the next time the app opens. If you add, rename or remove files, also update the `SHELL` list in `sw.js` and bump `CACHE` (for example `gymapp-v2`).

## Files

| Path | What it is |
|---|---|
| `index.html` | App shell and settings sheet |
| `styles.css` | All styling |
| `js/store.js` | Data model, saving, undo, backup import/export |
| `js/app.js` | Screens, buttons, gestures |
| `sw.js` | Offline cache |
| `manifest.webmanifest` | Install info (name, icons, colors) |
| `icons/` | App icons. Regenerate them with `node scripts/make-icons.mjs` |
| `scripts/serve.mjs` | Local test server |
