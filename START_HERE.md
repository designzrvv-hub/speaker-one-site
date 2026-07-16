# Start here

This repository contains the editable Speaker One website and the instructions Codex must follow.

## Open the project

Open this folder itself in Codex or VS Code. The correct folder is the one that contains `package.json`, `src`, `public`, `AGENTS.md`, and `SPEAKER_ONE_CODEX_MASTER_PLAN.md`.

## Run locally on Windows

Double-click `start-site.bat`, or run:

```powershell
npm install
npm run dev
```

Then open the local URL printed by Vite, normally `http://localhost:5173`.

## First Codex message

Copy the contents of `FIRST_PROMPT.md` into a new Codex chat.

## Main editing locations

- Content, links, media paths: `src/config/siteConfig.js`
- Page composition: `src/App.jsx`
- Global styles and visual effects: `src/index.css`
- Lead submission adapter: `src/services/submitLead.js`
- Public images and legal page: `public/`

Codex must work in small stages and stop after each stage.
