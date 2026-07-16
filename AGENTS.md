# Codex rules for Speaker One

## Mission
Improve the existing Speaker One website incrementally. Preserve its section structure, user flow, media, form, navigation anchors, and working behavior unless the user explicitly approves a change.

## Required workflow
1. Read the relevant source files before proposing a change.
2. Change only the requested area.
3. Avoid unrelated refactoring.
4. Run `npm run build` after code changes.
5. Report changed files, result, risks, and what was intentionally left untouched.
6. Stop and wait for approval before starting another stage.

## Never do without explicit approval
- Rewrite the site from scratch.
- Change React/Vite/Tailwind/GSAP to another stack.
- Remove, merge, reorder, or rename existing page sections or anchors.
- Remove Speech Lab, the lead form, photos, logo, legal links, or social links.
- Put Telegram bot tokens or other secrets in client-side code.
- Add a dependency when the same result is practical with the existing stack.
- Create Git commits or reset user changes.
- Treat LocalStorage as the final CMS.

## Quality bar
Every change must improve at least one of these without harming the others: clarity, premium perception, conversion, accessibility, performance, maintainability.
