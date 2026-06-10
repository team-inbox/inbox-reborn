# Changelog

All notable changes to the Inbox Reborn theme for Gmail™, grouped by release era.
PR numbers reference [pull requests on GitHub](https://github.com/team-inbox/inbox-reborn/pulls).

## Unreleased

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
