# Inbox Reborn theme for Gmail™

#### _Formerly known as Inbox in Gmail_

![Inbox Reborn: Google Inbox, back in Gmail](https://github.com/team-inbox/inbox-reborn/blob/master/screenshots/marquee.png?raw=true)

Web extension which modifies Gmail™ to bring back the features and uncluttered design you knew and loved from Google's discontinued Inbox.

## Install

- **Chrome & Microsoft Edge:** [Chrome Web Store](https://chrome.google.com/webstore/detail/inbox-reborn-theme-for-gm/bkphmihkdbdgedlaflnkhnmnmibffomf)
- **Firefox:** [Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/inbox-reborn-theme-gmail/)

## Features

- **Stock Inbox** — one switch, on for new installs, that sets everything to Inbox's own
  behavior (see [Extension Options](#extension-options))
- Built-in dark mode — works with any Gmail theme setting
- Emails grouped by date (Today, Yesterday, This week, This month, …), optionally with no
  date or time on each email, like Inbox
- **Hover actions** — hovering an email shows Inbox's Pin, Snooze, Trash and Done, plus a ⋮
  with the rest of Gmail's actions
- **Sweep** — the ✓ button on each date heading marks the whole group done (archives it),
  leaving pinned emails in place. Gmail's _Undo_ brings them back.
- **Pinned switch** in the header — shows only your pinned (starred) inbox mail and
  reminders, like Inbox's pin toggle
- **Speed dial** — hover the red compose button to see your three most recent contacts and
  write to them in one click (see [Speed dial](#speed-dial) below)
- Email bundling by label, with Inbox's classic colored bundle icons — plus Purchases,
  Travel and Finance bundles from Gmail's own sorting. Hover a bundle to sweep it (mark it
  done, pinned emails stay) or open ⋮ for Gmail's actions on every email in it
- Clean interface returning to the simplicity of Inbox — Inbox, Snoozed and Done at the
  top of the menu, colored category icons, bold selected row
- Inbox's categories in the left menu, in Inbox's order: **Travel, Purchases, Finance,
  Social, Updates, Forums, Promotions**. Gmail sorts mail into Travel and Finance but
  never lists them; the extension adds them
- Inbox's two label sections in the left menu, **Bundled in the inbox** and
  **Unbundled** — drag a label between them to choose whether its emails bundle (see
  [How bundling works](#how-bundling-works))
- Labels in the left menu use Inbox's icons (see
  [Label names and icons](#label-names-and-icons))
- **Drag emails onto Social, Updates, Forums or Promotions** in the left menu to re-file
  them there; they stay in your inbox, like Inbox's bundles
- Emails sent to yourself displayed as reminders
- Avatars with real pictures where available — photos Gmail has shown you, brand logos,
  company site icons, and optionally Gravatar — or a colored initial
- Calendar events displayed on a small card, with inline responses

## Extension Options

<img src="https://github.com/team-inbox/inbox-reborn/blob/master/screenshots/options.png?raw=true" alt="options popup screenshot" width="400">

Click the extension's icon at the top right of your browser to adjust its behavior.
Changes save as you make them, and open Gmail tabs refresh themselves when needed.

**Up front:**

| Setting             | What it does                                                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stock Inbox**     | On by default for new installs: Inbox's own settings — bundling with Purchases, Travel and Finance bundles, single-email bundles, bundles in their own date group, avatars, no dates in the list, AI Inbox and All Mail hidden. Changing one of those turns it off and keeps your change; turning it back on restores them. Turning it on also turns on Gravatar photos. |
| **Dark mode**       | The extension's built-in dark theme. No need to change Gmail's own theme setting. Applies instantly, no refresh.                                                                                                                                                                                                                                                         |
| **Reminders**       | Which emails you send yourself show as reminders: all of them, only those with the subject "Reminder", or none.                                                                                                                                                                                                                                                          |
| **Gravatar photos** | Also looks up sender pictures on Gravatar. Off by default — it shares a hashed copy of each sender's address with Gravatar. Needs Avatars on.                                                                                                                                                                                                                            |

**Under Customize** (open by itself when Stock Inbox is off):

| Section        | Settings                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bundles**    | Bundle emails by label (see [Email Bundling](#email-bundling) below); also bundle Purchases, Travel and Finance; bundle single emails; show bundles in Today instead of their own date group. |
| **Email list** | Avatars (a picture when one is found, otherwise a colored initial); dates on emails (Inbox showed none — the date headings carried them); Gmail's Priority Inbox headings.                    |
| **Left menu**  | Show or hide AI Inbox, All Mail, Travel and Finance.                                                                                                                                          |

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

Bundles are built from the **labels on your inbox emails**, the way Inbox built them:

- The left menu is split like Inbox's: **Bundled in the inbox** lists Travel, Purchases,
  Finance, Social, Updates, Forums and Promotions plus every label that bundles;
  **Unbundled** lists the labels whose emails show one by one. **Drag a label from
  Unbundled up into Bundled in the inbox** to bundle it, and back down to stop. The
  label's mail goes with it: dragged up, its archived mail is moved back into the inbox
  (where the bundle forms); dragged down, its inbox mail is archived. Gmail does the
  moving through its own list, a page at a time, and its Undo works as usual. The
  categories drag too: pull Promotions (or any of the seven) down to Unbundled and its
  bundle leaves the inbox, its emails showing as ordinary rows; drag it back up and the
  bundle returns. A category's mail stays where it is (its archive would be thousands of
  emails). As in Inbox, every label starts out in Unbundled and every category in
  Bundled in the inbox; your choices are saved per account. A nested label goes with the
  label it is nested under (drag the top-level label).
- A bundled label shared by **two or more inbox emails** collapses into a single bundle
  row. Tick _"Show bundle if only one email"_ in the options to bundle single emails too.
- Clicking a bundle row opens that label's view, just like Inbox did.
- **Starred emails always stay out of bundles**, so important mail never gets hidden.
- Only mail that is actually **in the inbox** can be bundled — labels applied to archived
  mail don't create bundles.
- The categories carry their original Inbox colored icons; your own labels get Inbox's
  stacked-envelopes bundle icon, on the bundle and in the left menu (see
  [Label names and icons](#label-names-and-icons)).
- A label nested under a label called `Unbundled` (the original way to keep a label out
  of bundling) never bundles, and keeps its emails out of other bundles too.

### Recreate Inbox's default bundles

Google Inbox shipped with default bundles (Travel, Purchases, Finance, Social, Updates,
Forums, Promotions). Here's how to get them back:

1. **Disable inbox category tabs** — bundles only form in the inbox itself:
   - Settings → Inbox → Categories → leave only **Primary** ticked → Save

2. **Show the categories you want bundled in the message list** — this makes Gmail tag
   inbox emails with those category chips, which the extension bundles like any label:
   - Settings → Labels → Categories → click **show** next to Social, Promotions, Forums
     (and Updates, if you want it - see below)
   - **This step is required.** Without it, Gmail sorts the mail into the category but
     draws nothing on the inbox row to say so, and the extension can only bundle what's
     on the row. Clicking Updates (or Social...) in the left menu still lists that
     category's mail, but those emails stay unbundled in the inbox until the category
     is set to **show**.
   - **Updates is optional.** Gmail files almost all automated mail under Updates, so
     showing it can collapse a large part of your inbox into one big Updates bundle.
     Show it if that's what you want; leave it hidden to keep that mail loose.

3. **Purchases, Travel and Finance** bundle on their own with **Stock Inbox** on (the
   default for new installs). Otherwise tick Purchases, Travel and Finance under
   Customize → Bundles in the options. Gmail has no chip for these, so
   the extension runs the same searches Gmail's Purchases, Travel and Finance pages do
   (`in:inbox category:purchases` and so on) and bundles the inbox emails they find.
   Each email lands in one bundle: a Finance email Gmail also files under Updates goes
   to Finance. Clicking the bundle opens that search.
   - The bundles appear as soon as Gmail opens — no need to visit those pages first.
   - The searches go to Gmail itself, every minute and a half while Gmail is open
     and after Gmail reloads a list. Nothing goes anywhere else.
   - They rely on how Gmail asks for its email lists internally. If Google changes
     that, these three bundles stop appearing (with a note in the browser console)
     until the extension is updated; everything else keeps working.

   Prefer to pick the mail yourself? A label + filter does that:
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
bundles maintain themselves.

### Label names and icons

Travel, Purchases, Finance, Social, Updates, Forums and Promotions have Inbox's own
colored icons. Every label of yours gets Inbox's stacked-envelopes bundle icon, on its
bundle and in the left menu, whatever it is called. Labels you've given a color in Gmail
keep that color on their icon.

**Travel-named labels also show up under Travel.** The Travel item in the left menu
opens the mail Google files as travel, plus the mail in every label of yours with the
whole word trip(s), travel, cruise(s), flight(s), vacation(s) or hotel(s) in its name
(`Cruise`, `Trips/Japan`, `Summer Vacation`; not `Cruising`). Without such a label,
Travel shows only Google's sorting. Gmail won't let you create a label named `Travel`
(it's reserved), so use `Trips`, `Cruise`, `Flights` or `Vacation`.

### Bundling troubleshooting

- **No bundles appearing?** Check that the label is visible in the message list
  (Settings → Labels → "Show in message list") and that at least two inbox emails
  carry it (or enable "Show bundle if only one email").
- **An email isn't joining its bundle?** Starred emails are excluded by design.
- **A Gmail category won't bundle, even though its page in the left menu lists the
  email?** Set that category to **show** in the message list (Settings → Labels →
  Categories). Social, Updates, Forums and Promotions only bundle once Gmail draws
  their chip on the inbox row. Purchases, Travel and Finance have no chip - turn on
  them under Customize → Bundles in the options instead.

## Speed Dial

Hover the red compose button and the reminder button fans out above it, followed by your
three most recent contacts. Hover one to see their name and address; click to start an email to them.

**Getting started:** the speed dial learns your contacts from your sent mail. Each time Gmail
loads, the extension asks Gmail for your newest sent conversations and fills the speed dial
from them — nothing to set up, in every browser you use. Sending an email also moves its
recipients to the top straight away.

## Known Issues

- This extension works best in English because it relies on specific date formats.

## Privacy

- No analytics platforms, and no servers of our own — nothing is collected about you.
- Your recent contacts and saved sender pictures stay in your browser's extension storage.
- The code is open source, ready for you to audit.

Two features ask **Gmail itself** for data, from your browser with your existing Gmail
session — nothing goes anywhere else:

- **Purchases, Travel and Finance bundles** — Gmail's own category searches for your inbox.
- **Speed dial** — Gmail's Sent search, once per load, for your newest sent conversations.

The only requests to anyone else are for **sender pictures**:

- **Brand logos** — a DNS lookup of the sender's domain (via Google, Cloudflare, or DNSPod
  DNS-over-HTTPS) for its published BIMI logo.
- **Company site icons** — loaded from Google's icon service using the sender's domain.
- **Gravatar** — only with _Gravatar photos_ on (off by default; turning Stock Inbox on
  turns it on); sends a hashed copy of the sender's address to Gravatar.

Turning **Avatars** off in the options stops all of them. Beyond that, this extension just sits
as a layer on top of Gmail™, modifying the style and behavior of the page.

Full details are in the [Privacy Policy](PRIVACY.md).

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

### Lint and test

```sh
npm run lint          # ESLint + Stylelint + Prettier + version and image checks
npm test              # unit tests (date grouping, label titles)
npm run lint:firefox  # Mozilla's addons-linter on the Firefox package
npm run verify        # all of the above - what CI runs on every pull request
npm run format        # auto-format
```

---

**If you need more help, reach out on [GitHub Issues](https://github.com/team-inbox/inbox-reborn/issues)!**
