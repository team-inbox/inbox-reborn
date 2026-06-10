# Inbox Reborn theme for Gmail™

#### _Formerly known as Inbox in Gmail_

Web extension which modifies Gmail™ to bring back the features and uncluttered design you knew and loved from Google's discontinued Inbox.

![inbox screenshot](https://github.com/team-inbox/inbox-reborn/blob/master/screenshots/light_dark.gif)

## Install

- **Chrome & Microsoft Edge:** [Chrome Web Store](https://chrome.google.com/webstore/detail/inbox-reborn-theme-for-gm/bkphmihkdbdgedlaflnkhnmnmibffomf)
- **Firefox:** [Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/inbox-reborn-theme-gmail/)

## Features

- Built-in dark mode — works with any Gmail theme setting
- Emails grouped by date (Today, Yesterday, This month, …)
- Email bundling by label, with Inbox's classic colored bundle icons
- Clean interface returning to the simplicity of Inbox
- Emails sent to yourself displayed as reminders
- Colored avatars based on the sender's name (with BIMI brand logos where available)
- Calendar events displayed on a small card, with inline responses

## Extension Options

<img src="https://github.com/team-inbox/inbox-reborn/blob/master/screenshots/options.png?raw=true" alt="options popup screenshot" width="400">

Click the extension's icon at the top right of your browser to adjust its behavior.
Changes apply immediately — the page refreshes itself when needed.

| Option                           | What it does                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Dark Mode**                    | Toggles the extension's built-in dark theme. No need to change Gmail's own theme setting. Applies instantly, no refresh.                 |
| **Reminders**                    | How emails sent to yourself are treated: every self-sent email, only those with the subject "Reminder", or none.                         |
| **Email Bundling**               | Groups inbox emails by label (see [Email Bundling](#email-bundling) below). Sub-options: bundle even single emails; move bundles to top. |
| **Avatars**                      | Shows a colored circle with the sender's first initial next to each email.                                                               |
| **Hide Priority Inbox Headings** | Cleans up the section headings when Gmail's "Priority Inbox" type is enabled.                                                            |

## Recommended Gmail™ Settings

Using these settings will more closely replicate the visual style of Inbox:

- Settings → Inbox → Categories → Leave only **Primary** ticked
- Settings → Inbox → Inbox Type → **Default** or **Starred First**
- Settings → Advanced → Multiple Inbox → **Disabled**
- Settings → Advanced → Preview Pane → **Disabled**
- Settings → General → Maximum Page Size → **100** conversations per page
- Settings → General → Personal level indicators → **No indicators**
- Settings → Inbox → Importance markers → **No markers**

## Email Bundling

### How bundling works

Bundles are built from the **labels on your inbox emails**:

- Any label shared by **two or more inbox emails** collapses into a single bundle row.
  Tick _"Show bundle if only one email"_ in the options to bundle single emails too.
- Clicking a bundle row opens that label's view, just like Inbox did.
- **Starred emails always stay out of bundles**, so important mail never gets hidden.
- Only mail that is actually **in the inbox** can be bundled — labels applied to archived
  mail don't create bundles.
- Bundles named **Purchases, Social, Updates, Forums, Promotions, Finance, Trips**
  automatically get their original Inbox colored icons. Any other label gets a neutral
  bundle icon.
- To keep a label out of bundling entirely, create a label called `Unbundled` and nest
  the label underneath it.

### Recreate Inbox's default bundles

Google Inbox shipped with default bundles (Purchases, Social, Updates, Forums,
Promotions). Here's how to get them back:

1. **Disable inbox category tabs** — bundles only form in the inbox itself:
   - Settings → Inbox → Categories → leave only **Primary** ticked → Save

2. **Show Social, Promotions, and Forums in the message list** — this makes Gmail tag
   inbox emails with those category chips, which the extension bundles like any label:
   - Settings → Labels → Categories → click **show** next to Social, Promotions, Forums
   - Leave **Updates** hidden: Gmail classifies almost all automated mail as Updates,
     so showing it would collapse most of your inbox into one giant bundle.

3. **Recreate Purchases with a label + filter.** Gmail's smarter sections (Purchases,
   Subscriptions, Trips) are classified on Google's servers and expose nothing the
   extension can read, so build your own:
   1. Create a label named `Purchases`.
   2. Settings → Filters and Blocked Addresses → **Create a new filter** → in "From",
      list your common store/receipt senders, e.g.
      `auto-confirm@amazon.com OR shipment-tracking@amazon.com OR service@paypal.com OR transaction@etsy.com`
   3. Choose **Apply the label: Purchases** and tick **Also apply to matching
      conversations**. Do **not** tick "Skip the Inbox" — bundles only form from
      inbox mail.

### Make your own bundles

The same label + filter recipe works for any bundle you want — Shipping, Receipts,
Newsletters, work projects, family. Filters apply the label as mail arrives, so your
bundles maintain themselves. Name a bundle `Finance` or `Trips` and it even gets the
matching Inbox icon.

### Bundling troubleshooting

- **No bundles appearing?** Check that the label is visible in the message list
  (Settings → Labels → "Show in message list") and that at least two inbox emails
  carry it (or enable "Show bundle if only one email").
- **An email isn't joining its bundle?** Starred emails are excluded by design.
- **A Gmail category won't bundle?** Categories like Purchases only exist server-side;
  use the label + filter recipe above.

## Known Issues

- This extension works best in English because it relies on specific date formats.

## Privacy

- No external network requests.
- No analytics platforms.
- The code is open source, ready for you to audit.

In other words, you are not being tracked, and your data is not leaving the page to be processed or stored anywhere else. This extension just sits as a layer on top of Gmail™, modifying the style and behavior of the page.

## Build and Test Locally

Requires [Node.js](https://nodejs.org/). Then:

```sh
npm install        # once, to install build/lint dependencies
```

### Build

```sh
npm run build:chrome:unpacked    # unpacked folder on your Desktop: inbox-reborn-chrome
npm run build:firefox:unpacked   # unpacked folder on your Desktop: inbox-reborn-firefox
npm run build                    # store-ready zips for both browsers
```

### Load the unpacked extension

- **Chrome/Edge:** go to `chrome://extensions/`, enable "Developer mode",
  click "Load unpacked", and select `inbox-reborn-chrome` on your Desktop.
- **Firefox:** go to `about:debugging#/runtime/this-firefox`, click
  "Load Temporary Add-on", and select the `manifest.json` inside
  `inbox-reborn-firefox` on your Desktop.

### Lint

```sh
npm run lint       # ESLint + Stylelint + Prettier check
npm run format     # auto-format
```

---

**If you need more help, reach out on [GitHub Issues](https://github.com/team-inbox/inbox-reborn/issues)!**
