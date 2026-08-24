# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vue 3, Vite, and TypeScript single-page dashboard. `src/main.ts` boots the app, while `src/App.vue` mounts `src/views/DashboardView.vue`, which coordinates page data and layout. Reusable UI is grouped by screen region under `src/components/{common,left,center,right}`. Keep HTTP clients in `src/api`, Pinia modules in `src/store`, shared interfaces in `src/types`, mock payloads in `src/mock`, and global responsive rules in `src/styles/global.css`. Images belong in `src/assets`; directly served PDFs and GeoJSON belong in `public`. Do not edit generated `dist/`, `auto-imports.d.ts`, or `components.d.ts` by hand.

## Build, Test, and Development Commands

- `npm install` installs dependencies; first provide the `zjqx-gridfield-*.tgz` archive referenced by `package.json`.
- `npm run dev` starts Vite on port 5173 and exposes the configured API proxies.
- `npm run type-check` runs strict Vue/TypeScript validation without emitting files.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves that bundle for a production-like smoke test.

## Coding Style & Naming Conventions

Use two-space indentation and match the surrounding no-semicolon TypeScript style. Prefer Vue SFCs with `<script setup lang="ts">`, explicit interfaces, and the `@/` alias for cross-directory imports. Name components in PascalCase (`MapControlGroup.vue`), functions and variables in camelCase, Pinia composables as `useXStore`, and CSS classes in kebab-case. Preserve the responsive `grid`, `flex`, `rem`, `vw`, `vh`, and `clamp()` approach; avoid whole-page transform scaling. No formatter or linter is configured, so keep diffs consistent with nearby code.

## Testing Guidelines

There is currently no automated test runner or coverage gate. Before submitting changes, run `npm run type-check` and `npm run build`, then exercise the affected flow with `npm run dev`. For UI work, check the three-column dashboard, map controls, API-backed states, and any PDF preview at relevant viewport sizes (minimum supported size is 1024x640). If adding tests, use `*.spec.ts` beside the feature or under `src/**/__tests__/` and add a documented npm script.

## Commit & Pull Request Guidelines

Recent history uses short Chinese summaries without Conventional Commit prefixes, such as `能见度修正` and `数据接入和动画调整`. Keep each commit focused and describe the user-visible change directly. Pull requests should include a concise summary, linked issue when available, validation commands, and screenshots or video for visual changes. Call out changes to API contracts, map data, proxy targets, or environment variables. Never commit `node_modules`, `dist`, credentials, or secrets; remember that all `VITE_*` values are exposed to browser code.
