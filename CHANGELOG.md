# Changelog

All notable changes to the Inbox Reborn theme for Gmail™, grouped by release era.
PR numbers reference [pull requests on GitHub](https://github.com/team-inbox/inbox-reborn/pulls).

## Unreleased

- Each label's ⋮ menu in the left menu (Label color, Show/Hide, Edit,
  Remove label) can be reached again. It sat past the edge of the menu,
  and in dark mode it was black on black.

- The options' hide switches now share one "Hide" section: Priority Inbox
  headings, AI Inbox, and a new All Mail switch.
- The left menu has a Reminders row, with Inbox's pointing-finger icon. It
  opens your starred inbox mail plus emails to yourself with "reminder" in
  the subject.
- The menu now reads Drafts, Sent, Reminders, Trash, Spam, then All Mail.
  The old reorder had stopped working when Gmail changed its menu markup.
  The new one uses CSS, because moving Gmail's rows made it draw All Mail
  twice. The divider under the group follows the last row shown.

- The Archive check mark didn't match the icons next to it, in the toolbar
  and in the buttons that appear when you hover an email: it was a lighter
  gray, Gmail dims it to 43% in the toolbar and (on search pages such as
  Travel or an open bundle) on hover, and in dark mode the toolbar one
  vanished on those pages. It's now the same color and strength
  as its neighbors in both themes.
- In dark mode, category bundles (a "Cruise" bundle's plane, Finance's chart,
  and so on) keep their colors instead of all turning light gray.

- Dragging emails onto Social, Updates, Forums or Promotions in the left menu
  now files them there the way Inbox did: they stay in the inbox and change
  category, with Gmail's "Undo" toast. Gmail's own drop there archived the
  email, so it never showed up under that category. Purchases can't take
  drops; Gmail sorts it itself and offers no way to assign it by hand.
- Labels in the left menu use Inbox's icons instead of Gmail's label tag:
  the stacked envelopes, or the same travel, purchases, finance or category
  icon the label's bundle shows in the inbox (a "Taxes" label gets the green
  finance chart). Labels you've colored keep their color. Labels with a
  travel word in the name (trip, travel, cruise, flight, vacation, hotel) get
  the plane, in the menu and on their bundle.
- The left menu's categories now read like Inbox's: Travel, Purchases,
  Finance, Social, Updates, Forums, Promotions. Gmail still sorts mail into
  Travel and Finance but never listed them (and won't let you create a
  "Travel" label - it's reserved). Travel opens Gmail's hidden Travel page,
  plus the mail in any of your labels with a travel word in the name (a
  "Cruise" or "Flights" label); Finance opens a search for that category.
  Both get Inbox's icons and their own colored top bar.

## 2.4.2 — October 2026

- The top bar title read "Inbox" on Spam, Trash, Sent, Drafts and the other
  built-in pages. Gmail added a hidden copy of its logo link to the header,
  and the extension was renaming the hidden one; it now renames the one you see.
- The top bar on Social, Updates, Forums and Promotions now takes the same
  color as that category's icon in the left menu (a darker shade in dark
  mode). Purchases, which showed a gray bar titled "Inbox", gets its own
  brown bar and title.
- In dark mode, the Manage subscriptions, Manage labels and Create new label
  icons in the left menu were faint dark-gray glyphs; they now use the same
  light gray as Sent, Drafts and the rest of the menu.
- In dark mode, the New label dialog's name field and the new-message Insert
  link boxes showed a gray bar inside their outline; they're now single clean
  fields, and the Insert link popup no longer sits on a square box behind its
  rounded card.
- In dark mode, the Quick settings panel's "Theme" heading was nearly
  invisible, and its section dividers and "See all settings" outline were
  glaring white; all now match the rest of the dark palette. Its unselected
  radio buttons, close (X) and help (?) icons were black on the dark panel and
  are now light gray, the Conversation view checkbox is a clean blue box
  instead of a washed-out one, its scrollbar is a visible gray instead of
  near-black, and the selected option's label no longer sits out of line.
- In dark mode, the Google apps menu (the 9-dot "Your favorites" grid) opened
  bright white. It's a Google-hosted frame the stylesheet can't reach, so the
  extension now asks Google for its own dark version of it.
- In dark mode, the advanced search panel (the sliders button in the search
  bar) had bright white fields, dim labels, near-invisible checkboxes and black
  icons. The fields are now dark underlined inputs like Gmail's, labels,
  checkboxes and icons are readable, and the date picker it opens is dark too.
- In dark mode, the search box's suggestion list had near-black icons (recent
  searches, emails, attachment paperclips, "All search results") and bright
  white separator lines. The icons are now light and the lines muted, and a
  selected filter chip's tick is a light blue instead of near-invisible dark
  blue.
- In dark mode, the new-message formatting dropdowns (text alignment and the
  overflow formatting menu) showed faint, washed-out icons, and the font and
  text size menus' check mark was black; both are now light and readable.
- In dark mode, more of the new-message toolbar's popups now read properly:
  the emoji picker's top section is dark instead of white, the Drive and
  Insert photo pickers dim Gmail behind them instead of washing it out (the
  pickers themselves stay light, since they're Google's own pages), the
  confidential mode dialog's headings, options, date and help icon are
  readable, and the signature and ⋮ menus no longer show a black check mark
  or bright divider lines.
- In dark mode, replying in a conversation looked off: the More options
  (⋮) dots, the Send button's arrow, the reply-type arrow and the pop-out
  icon were dark and faint, and pressed buttons (Help me write, an open ⋮
  menu) showed a pale white-blue patch. The icons are now light and pressed
  buttons get a dark blue tint.
- In dark mode, the submenu arrows beside "Move to" and "Label as" in an
  email's right-click menu were black; they're now light like the menu icons.
- In dark mode, empty folders (e.g. Drafts) showed Gmail's "You don't have
  any saved drafts…" text over the moon picture; it's hidden again, as in
  light mode.
- In dark mode, the trash-can marker on each row in Trash was black; it's
  now light gray.
- In dark mode, the icon beside Scheduled's "Messages in Scheduled will be
  sent at their scheduled time." notice was black; it's now light gray.

## 2.4.1 — October 2026

- Collapsing the left menu (☰) left two stray divider lines behind; the menu now
  disappears completely, like Inbox's drawer.

## 2.4.0 — October 2026

### Inbox features (`feat/inbox-features-2.4.0`)

- **Sweep** — a ✓ button on each date heading marks the whole group done
  (archives it), leaving pinned emails in place. It presses Gmail's own
  Archive, so Gmail's Undo brings everything back; a bundle in the group is
  swept with it
- **Pinned switch** in the header, after Inbox's pin toggle — shows pinned
  (starred) inbox mail plus reminders (following the Reminders option), with
  a "Pinned" title; it tracks the view however you get there
- **Speed dial** — hovering the compose button fans out your three most
  recent recipients above the reminder button, newest nearest compose; a
  label with name and address shows instantly on hover, and a click starts
  an email to them. Contacts are learned at Send and from the Sent list
  (open Sent once on a fresh install), and stay in local storage
- **Sender pictures** on avatars — in the thread list, open conversations
  (replacing Gmail's letter circles) and the speed dial. First found wins:
  a Google profile photo Gmail has already shown, the brand's BIMI logo,
  Gravatar (new opt-in option), then the company site's icon. Results are
  remembered across reloads and lookups are queued, so pictures appear
  immediately after the first load
- **Hide AI Inbox** option removes Gmail's AI Inbox row from the menu
- Inbox-style menu: Starred removed from the top group (Inbox, Snoozed,
  Done), Purchases / Social / Updates / Forums / Promotions in their Inbox
  colors, Roboto 14px text with a bold selected row, Material grey icons,
  and the menu offset below the header like Inbox's

### Fixes

- Toolbar: Gmail's new inline-SVG mark-as-unread icon and the remove-label
  icon are light in dark mode; compose title bar minimize / full screen /
  close no longer draw two overlapping glyphs in light mode
- Unstarred pin matches the other row actions in dark mode; the "View Pull
  Request" style quick-action arrow is a blue glyph instead of a black sprite
- Starred detection updated for Gmail's markup (starred rows lost
  `.T-KT-Jp`), so starred mail stays out of bundles again
- Bundles could form in Sent (and other views) while switching views; the
  inbox is now detected from the URL, foreign rows are never bundled, and
  stray bundles are removed
- Reminders kept their icon after leaving and revisiting a view
- Dark mode: unread rows get their own divider line, so a run of unread mail
  no longer merges into one block
- Sidebar icons no longer show Gmail's sprite through the mask as a second
  tone; the open-conversation toolbar strip matches the page background
- Slow Gmail loads no longer disable features (waits up to 30s)
- Site-icon avatars fill the circle with their edge trimmed, so baked-in
  rings and soft edges don't show as a halo

### Tooling (`chore/ci-checks`, #117)

- CI runs Mozilla's addons-linter on the Firefox package, unit tests for the
  date headings, a version check across all four version files, and a
  missing-image check; `npm run verify` runs the same locally

## 2.3.0 — October 2026

### Thread list (`fix/dark-mode-polish-2026-10`)

- New "This week" date group between Yesterday and This month (weeks start
  on Sunday; the group is skipped when it would be empty)
- Yesterday now works across month and year boundaries - on the 1st,
  yesterday's mail no longer lands under last month's name (or "Last year"
  on January 1st)
- Date groups no longer collapse into a single list after a Gmail refresh:
  Gmail keeps other views' lists hidden in the DOM, and dates were being
  compared across them, so the visible inbox read as snoozed and fell under
  one label. Each list is now grouped on its own, and stale group headers
  left behind by shifted rows are removed
- Starred pins take the color of the star picked in Settings > Stars (all
  six stars and six badges, colors sampled from the Settings icons), in both
  themes; replaces the six per-color pin PNGs
- User-assigned label colors now show on sidebar label icons in both themes

### Dark mode polish (`fix/dark-mode-polish-2026-10`)

- HTML emails render through an invert filter instead of having their
  backgrounds and borders stripped, so buttons, borders, and dividers survive
  (photos are re-inverted to their true colors)
- Settings: the title/tab header is dark and full width, native buttons
  (Save Changes, Cancel, Export, Create new label, ...) are themed, and the
  outlined Workspace button and span links regain their accent color
- Icons brightened: menu checkboxes, search and snooze glyphs; the
  per-message More menu; Reply/Forward pills; compose titlebar buttons;
  Newer/Older chevrons (including disabled ones); the side panel "+" and
  hide arrow; the sidebar More chevron, Labels "+", and nested-label arrows;
  and the row checkbox shown when hovering an avatar
- AI Inbox icon sized, aligned, and colored to match the other sidebar icons
- Reading pane dividers and top edge toned down; attachment filename strip
  and dog-ear fixed; "View messages" / "delete forever" links in the
  deleted-messages notice use the link color; pager counter legible

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
