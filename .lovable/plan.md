

# Plan: macOS-Style Menu Bar + About Page Creator Credit

## Overview
Add a native macOS-style menu bar at the very top of the app (desktop only), built entirely with existing Radix Menubar primitives. Also add a "Created by" section to the About page.

## 1. Create `src/components/AppMenuBar.tsx`

A new component using the existing `@/components/ui/menubar` primitives (already in the project -- no new deps).

**Menu structure:**

| Menu | Items |
|------|-------|
| **EDAS** (bold) | About EDAS (opens dialog), Check for Updates... (loading spinner -> result), separator, Quit |
| **File** | New, Open, Save, Save As..., Export, separator, Close |
| **Edit** | Undo, Redo, separator, Cut, Copy, Paste, Select All |
| **View** | Dashboard, Timetable, Calendar, Resources, Groups (wired to `onViewChange`) |
| **Help** | Documentation, Keyboard Shortcuts, separator, Report a Bug |

**Behavior details:**
- "About EDAS" opens an inline Dialog showing app name, version `v1.0.0`, and `(c) {new Date().getFullYear()} EDAS. All rights reserved.` plus "Created by Charukrishna Sahu"
- "Check for Updates" uses service worker registration check with a loading state, then shows "Up to date" or "Update available" with a Relaunch button (`window.location.reload()`)
- "Quit" calls `supabase.auth.signOut()` and navigates to `/`
- File menu items (New, Open, Save, etc.) are stubbed as disabled/toast placeholders
- Edit items use `document.execCommand` for Cut/Copy/Paste/SelectAll, Undo/Redo
- View items call the `onViewChange` prop
- Help > Documentation opens the about view, Keyboard Shortcuts shows a dialog, Report a Bug opens a mailto or toast

**Styling:**
- Full-width bar, `h-8`, `bg-background border-b`, sits above the TopHeader
- Uses existing Menubar component classes, matching app theme
- Desktop only (`hidden md:flex`)

## 2. Update `src/pages/Index.tsx`

- Import and render `<AppMenuBar>` at the very top of the main content column (above `<TopHeader>`), passing `onViewChange` and `navigate` as props

## 3. Update `src/components/about/AboutView.tsx`

- Add a "Created by" card at the bottom (before QA section) with:
  - "Created & Developed by Charukrishna Sahu"
  - Dynamic copyright: `(c) {new Date().getFullYear()} EDAS. All rights reserved.`

## Technical Notes
- Zero new dependencies -- uses existing `menubar.tsx` UI primitives and `dialog.tsx`
- The menu bar only renders on desktop (md+ breakpoint) to avoid mobile conflicts
- All year references use `new Date().getFullYear()`
- File operations are stubbed with toast notifications since there's no file system

## Files Changed
1. **Create** `src/components/AppMenuBar.tsx` -- the full menu bar component with About dialog and Update check
2. **Edit** `src/pages/Index.tsx` -- add menu bar above TopHeader
3. **Edit** `src/components/about/AboutView.tsx` -- add creator credit section

