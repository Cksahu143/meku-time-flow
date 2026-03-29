

# EDAS Full System Overhaul — Plan

## Overview
A comprehensive hardening pass covering branding, Electron fixes, TypeScript errors, security, error handling, and code quality. **No visual/CSS changes.** This is a logic-only overhaul.

## Priority 1 — Fix Build Error (Blocking)

**File: `supabase/functions/create-school-user/index.ts`** (line 183)
- Change `catch (error)` to `catch (error: unknown)` and use `error instanceof Error ? error.message : "Internal server error"` pattern
- Apply same fix to all edge functions with `catch (error)` blocks (`verify-sso-token`, `generate-sso-token`, `ai-study-tools`, `transcribe-audio`)

## Priority 2 — Branding & Identity

| Item | File | Change |
|------|------|--------|
| Copyright year | `electron-builder.yml` line 3 | `2025` → `2026` |
| Copyright year | `src/pages/Landing.tsx` line 716 | `© 2025` → `© {new Date().getFullYear()}` |
| HTML title | `index.html` | `<title>EDAS — Educational Dashboard & Assignment System</title>` |
| Meta description | `index.html` | Update description, add `application-name` and fix `author` to "Charukrishna Sahu" |
| OG/Twitter tags | `index.html` | Update titles/descriptions to EDAS branding |
| Favicon | `index.html` | Point to `/favicon.png` (already exists) |
| Body background | `index.html` | Add `style="background:#0a0a0a"` to `<body>` to prevent white flash |
| AppMenuBar version | `src/components/AppMenuBar.tsx` line 189 | Read version dynamically or keep synced with package.json |

**Note on icons:** Cannot generate real icon images in plan mode. Will create a script to generate the icon programmatically or use a placeholder. The existing `build/icon.png` and `public/favicon.png` are already in place.

## Priority 3 — Electron Main Process (`electron/main.cjs`)

1. Replace `{ label: 'About EDAS', role: 'about' }` with custom dialog showing version, creator, copyright 2026
2. Add `autoHideMenuBar: false` for Windows
3. Add `webSecurity` conditional: `false` in dev (`!app.isPackaged`), `true` in production
4. Add error handling on `loadFile()` with `.catch()` showing dialog
5. Add `did-fail-load` handler with Retry button
6. Add `crashed` and `unresponsive` handlers
7. Add `app.setAppUserModelId('com.edas.app')` before window creation
8. Update icon path to use `app.getAppPath()` instead of `__dirname`
9. Add DMG background config to `electron-builder.yml` (window size, background reference)

## Priority 4 — Routing & Navigation

- BrowserRouter is already fully replaced with HashRouter ✓
- Fix `window.location.href = '/auth'` in `PrivacySettings.tsx` — replace with `navigate('/auth')` or `window.location.hash = '#/auth'`
- Confirm 404 route exists ✓ (NotFound component at `*`)

## Priority 5 — TypeScript & Edge Function Fixes

- Fix all `catch (error)` blocks in edge functions to use `error: unknown` with proper type narrowing
- Fix empty `catch {}` blocks in client code (about 70 instances across 8 files) — add `console.error` where appropriate, or add comments explaining intentional silence for non-critical operations (e.g., `recognition.start()` in speech API)

## Priority 6 — Error Handling & Resilience

1. **`src/main.tsx`**: Add global `unhandledrejection` listener with toast
2. **ErrorBoundary**: Already exists at component level ✓ — wrap major route sections with it in `App.tsx`
3. **Empty catch blocks**: Triage all 70 instances:
   - **Intentionally silent** (audio context, speech recognition): Add `// Intentionally silent` comment
   - **Should report** (URL parsing, API calls): Add `console.error`

## Priority 7 — Async & Data Safety

- `PrivacySettings.tsx`: Fix `catch (error: any)` to use `unknown`
- Add cancellation patterns to key `useEffect` async calls where missing
- Ensure all Supabase queries destructure and check `error`

## Priority 8 — Security Quick Wins

- `dangerouslySetInnerHTML` in `chart.tsx`: This is shadcn/ui internals generating CSS from config — safe, no user input. No change needed.
- Confirm `contextIsolation: true` and `nodeIntegration: false` ✓
- Confirm no hardcoded secrets in client code (Supabase URL/key come from env vars via auto-generated client)

## Priority 9 — Performance (Non-Visual)

- Add `build.rollupOptions.output.manualChunks` to `vite.config.ts` for vendor splitting
- No other performance changes that could affect visuals

## Out of Scope (Would Change Visuals or Require Massive Refactoring)

- Converting all `select('*')` to specific columns (141 instances, 23 files — functional change, not a bug)
- Converting all forms to react-hook-form (many already use Zod validation)
- Adding virtualization to lists
- Adding React.lazy to all heavy imports
- Full useEffect audit of entire codebase (would require reading 100+ files)
- Enabling `strict: true` in tsconfig (would surface hundreds of errors)

## Files Modified (Estimated ~15 files)

1. `supabase/functions/create-school-user/index.ts` — fix `unknown` type error
2. `supabase/functions/verify-sso-token/index.ts` — same pattern
3. `supabase/functions/generate-sso-token/index.ts` — same pattern  
4. `electron-builder.yml` — copyright, DMG config
5. `electron/main.cjs` — About dialog, error handlers, security, icon path
6. `index.html` — title, meta, body background
7. `src/pages/Landing.tsx` — dynamic copyright year
8. `src/components/AppMenuBar.tsx` — version sync
9. `src/main.tsx` — global rejection handler
10. `src/App.tsx` — ErrorBoundary wrapping
11. `src/components/settings/PrivacySettings.tsx` — fix navigation, fix `any` type
12. `vite.config.ts` — chunk splitting
13. `package.json` — version bump to 1.2.0

