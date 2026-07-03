# Changelog

All notable changes to the Inbox Reborn theme for Gmail™, grouped by release era.
PR numbers reference [pull requests on GitHub](https://github.com/team-inbox/inbox-reborn/pulls).

## 2.2.0 — July 2026

### Dark mode live-testing polish (`fix/gmail-2026-wiz-churn`)

- Thread list contrast pass: row separators no longer glow (the light-mode
  card edge leaked into dark mode), and row text moved off pure white onto
  a gray ladder that keeps read/unread hierarchy visible
- Compose color-picker headings, the add-reaction button, and the
  formatting-toolbar dropdown arrows are now legible in dark mode
- Avatar circles are muted on dark rows (30% saturation, 80% brightness)
  and the three loudest palette fills were softened in both themes
- Avatar/checkbox hover swap no longer reflows the row: the checkbox
  overlays the avatar slot and the two trade visibility, hardening rows
  against hover stutter when other Gmail extensions are installed (#112)
- Six dark-mode defects from the DOM-dump audit: reply pills, the
  emoji-react button, the band under the thread list, the compose titlebar,
  the header search field, and Quick Settings selection borders

### Gmail mid-2026 DOM churn fixes (`fix/gmail-2026-wiz-churn`)

- Restored all sidebar icons after Gmail replaced its icon divs with inline
  SVGs: a normalizer re-tags the new markup so every existing icon rule keeps
  painting (structure-based, resilient to Gmail's hashed class renames)
- New spark icon for Gmail's AI Inbox row; restored the Purchases sidebar
  icon on Chrome (its rule was accidentally Firefox-only)
- Dark mode now also covers Gmail's rebuilt reply pills, message 3-dot
  button, action menus, and side panel (new markup styled alongside the old)
- Floating compose/reminder buttons re-anchored to the side panel's stable
  landmark markup, with width-based open/close detection
- Header retitling, compose To-field autofill, and the label-color observer
  re-anchored with stable-selector fallback chains
- Selector health check: the extension now verifies its Gmail hooks after
  load and names any broken ones in the console; a standalone DevTools
  checklist lives in `docs/selector-health-check.js`, and a full selector
  risk audit in `docs/gmail-selector-audit-2026-07.md`

### Standalone dark mode & options polish (`feat/dark-mode-and-options-polish`)

- Dark mode no longer depends on Gmail's own dark theme — the extension now themes
  menus, dialogs, the search overlay, toolbars, and the reading pane itself,
  using a palette inspired by Outlook Web's dark mode
- Fixed dark mode randomly turning off after a page refresh
- Replaced Gmail's sprite-based toolbar icons (archive, delete, report spam,
  mark read/unread, snooze, move to, labels, refresh, more, back arrow) with
  Google Material Symbols in a consistent light fill
- Replaced row hover action icons and the list-toolbar controls (select
  checkbox, dropdown arrows, pagination, split-pane toggle) with Material
  Symbols masks
- Fixed the message header star, Reply/Reply all/Forward pills, "Label as"
  menu text, and right-click context menu icons in dark mode
- Sidebar polish: monochrome Purchases icon in both themes, consistent icons
  for Manage subscriptions / Manage labels / Create new label
- Options now apply instantly — changing any option auto-refreshes Gmail
  (dark mode applies live without a refresh)
- Restored the missing bundle avatar images and fixed bundle icon colors for
  labels using Gmail's default chip color
- Documented how to recreate Inbox's default bundles in the README

### Tooling & CI (`chore/tooling-and-ci`)

- Added ESLint, Stylelint, and Prettier with an `npm run lint` entry point
- Added a GitHub Actions CI workflow
- npm scripts for zipped and unpacked Chrome/Firefox builds
- Slimmed the store zip and removed dead code

## 2.x — 2025

- **Dark Mode Avatar Email Fix** (#107) — fixed avatars in dark mode
- **BIMI avatars** (#106) — show senders' verified brand logos as avatars
- **Avatar fixes** (#100, #102, #104) — alignment, icon colors, and selector updates
- **Dark Mode Beta** (#98) — first built-in dark theme
- **Bundles to top** (#97) — option to move bundles to the top of the inbox
- **Unified Chrome + Firefox repo** (#95, #96) — single codebase with a build
  script (`build.js`) producing either browser's package
- **Color updates** (#92, #93) — top bar colors, label/bundle color fixes that
  respect user-defined label colors, old Inbox styling restored

## 1.x — 2024

- **Manifest V3** (#88) — migrated the extension off the deprecated MV2 platform
- Scoped the extension to the mail UI only (no more leaking into Chat/Meet pages)
- Toolbar centering and layout fixes for ultra-wide viewports
- Bundle and avatar selector fixes after Gmail class changes
- Option to hide Priority Inbox section headings (now off by default)

## 0.5.x–0.6.x — 2021–2023

- Returned to the Chrome Web Store (2021) and Firefox Add-ons (2023)
- Survived several rounds of Gmail DOM changes: email address selectors,
  bundle wrapper classes, compose button variants (#75, #76, and many hotfixes)
- Styled the new Gmail Mail/Chat/Spaces sidebar instead of hiding it
- Label/bundle color overhaul; finance-related label icons (`bank`, etc.)
- Reminders feature fixed repeatedly as Gmail changed underneath it
- Floating compose button made to coexist with the add-ons side panel
- "Bundle if only one email" option (2020)

## 0.4.x–0.5.x — 2019 (the foundation)

- **Email bundling linked to labels** (#37/#68) — the signature Inbox feature
- **Category bundle icons and colors** (#70) — colored icons for Purchases,
  Social, Updates, Forums, Promotions, Finance, Trips
- **Colored letter avatars** (#22) and avatar/checkbox alignment work
- **Options popup** (#76) — settings via the toolbar icon
- **Floating compose button** (#29), collapsible left menu
- **Dynamic header color/title per page** (#10)
- **Multiple inbox tabs support** (#83)
- Renamed to **Inbox Reborn** (v0.5.0, May 2019)
- First Chrome Web Store release (#82)

## 0.1–0.4 — 2018–2019 (inbox-in-gmail)

- Initial release (November 2018): group emails by date (Today, Yesterday,
  This month, …), reminders from self-sent emails, clean Inbox-style layout
- Calendar event cards with inline RSVP
- Reminder treatment options
