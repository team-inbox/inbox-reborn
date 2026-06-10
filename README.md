# Inbox Reborn theme for Gmail™

#### _Formerly known as Inbox in Gmail_

Web extension which modifies Gmail™ to bring back the features and uncluttered design you knew and loved from Google's discontinued Inbox

![inbox screenshot](https://github.com/team-inbox/inbox-reborn/blob/master/screenshots/light_dark.gif)

## Installing

### Chrome & Microsoft Edge Install

https://chrome.google.com/webstore/detail/inbox-reborn-theme-for-gm/bkphmihkdbdgedlaflnkhnmnmibffomf

### Firefox Install

https://addons.mozilla.org/en-GB/firefox/addon/inbox-reborn-theme-gmail/

## Features

- Dark Mode Support
- Group emails by date (today, yesterday, this month, etc)
- Clean interface to return to the simplicity of Inbox
- Display emails sent to yourself with the subject "Reminder" as reminders
- Colored avatars based on the sender's name
- Calendar events displayed on a small card, with inline responses

## Extension Options

<img src="https://github.com/team-inbox/inbox-reborn/blob/master/screenshots/options.png?raw=true" alt="options popup screenshot" width="400">

Click the extension's icon at the top right of your browser to adjust the behavior of some features:

#### Dark Mode

This option toggles the extension's built-in dark theme. It works out of the box — no need to change Gmail's own theme setting.

#### Reminders

This option is used to determine how to treat emails sent to yourself.

- All messages in Inbox are treated as reminders.
- Subject (reminder) only are treated as reminders.
- None (no reminders) is set to disabled.

#### Email Bundling

This option is used to bundle emails by label in the inbox.

- Toggle On/Off
- Bundle if only one email
- Move Bundles to the top of your Inbox

#### Avatars

This option will show a circle with the first letter initial of the sender, to the left of the email in your folder.

- Toggle On/Off

#### Hide Priority Inbox Headings

This option provides a cleEnable/Disableaner inbox UI if the "Priority Inbox" type is enabled via the settings

- Toggle On/Off

## Recommended Gmail™ Settings

Using these settings will more closely replicate the visual style of Inbox:

- Settings/Inbox/Categories -> Leave only Primary ticked
- Settings/Inbox/Inbox Type -> Default or Starred First
- Settings/Advanced/Multiple Inbox -> Disabled
- Settings/Advanced/Preview Pane -> Disabled
- Settings/General/Maximum Page Size -> Show 100 conversations per page
- Settings/General/Personal level indicators -> No indicators
- Settings/Inbox/Importance markers -> No markers

## Email Bundling Tips

Bundles are built from the labels shown on your inbox emails: any label shared by two or more
inbox emails collapses into a bundle row (tick "Show bundle if only one email" in the extension
options to bundle single emails too). Starred emails always stay out of bundles.

### Recreate Inbox's default bundles (Purchases, Social, Updates, Forums, Promotions)

Follow this checklist to get Google Inbox's classic default bundles back. The five names above
are special — bundles with these names get their original Inbox colored icons automatically.

- [ ] **Disable inbox category tabs** — bundles only form in the inbox itself:
  - Settings/Inbox/Categories -> Leave only Primary ticked -> Save
- [ ] **Optionally show Social, Promotions, and Forums in the message list** — this makes Gmail
      tag inbox emails with those category chips, which the extension bundles like any label:
  - Settings/Labels/Categories/Show in message list -> Click "show" per category
  - Leave **Updates** hidden: Gmail classifies almost all automated mail as Updates, so showing
    it would collapse most of your inbox into a single bundle.
- [ ] **Purchases (and any other bundle you want)** — Gmail's smarter sections (Purchases,
      Subscriptions, Trips) are classified server-side and expose no label the extension can
      read, so recreate them with a label and a filter:
  1. Create a label named `Purchases`.
  2. Settings/Filters and Blocked Addresses -> Create a new filter -> in "From", list your
     common store/receipt senders, e.g.
     `auto-confirm@amazon.com OR shipment-tracking@amazon.com OR service@paypal.com OR transaction@etsy.com OR tracking@shipstation.com`
  3. Choose "Apply the label: Purchases" and tick "Also apply to matching conversations".
     Do **not** tick "Skip the Inbox" — bundles only form from inbox mail.

  The same recipe works for any custom bundle (Shipping, Receipts, Newsletters, ...) — filters
  apply the label as mail arrives, so bundles maintain themselves.

If you'd like a specific label not to be bundled, create a label called 'Unbundled', and nest that label within it.

## Known Issues

- This extension works best in English because it relies on specific date formats.

## Privacy

- This extension does not make any external network requests.
- This extension does not use any analytics platforms.
- The code is open source, ready for you to audit.

In other words, you are not being tracked, and your data is not leaving the page to be processed or stored anywhere else. This extension just sits as a layer on top of Gmail™, modifying the style and behavior of the page.

## Build and Test Locally

You can easily build Inbox Reborn for Chrome or Firefox and create test versions for local development using Node.js.

### 1. Install Node.js

#### macOS

Using [Homebrew](https://brew.sh):

```sh
brew install node
```

Or, download the macOS installer from [nodejs.org](https://nodejs.org/).

#### Linux (Debian/Ubuntu)

```sh
sudo apt update
sudo apt install nodejs npm
```

Or, for the latest version, follow instructions on [nodejs.org](https://nodejs.org/).

#### Windows

- Download the Windows installer from [nodejs.org](https://nodejs.org/) and run it.
- Follow the prompts to complete installation.

**Verify installation** with:

```sh
node --version
npm --version
```

### 2. Install Build Dependencies

Inside your project folder, install dependencies (required only once):

```sh
npm install fs-extra archiver
```

### 3. Build for Chrome or Firefox

#### Create Zipped Build

- **For Chrome:**

  ```sh
  node build.js chrome zip
  ```

  This creates `zip-chrome.zip` with all extension files and the correct manifest.

- **For Firefox:**

  ```sh
  node build.js firefox zip
  ```

  This creates `zip-firefox.zip` with the correct manifest.

#### Create Unpacked Folder for Manual Testing

This will copy all extension files (with the correct manifest) to a folder on your Desktop, ready for loading as an unpacked extension.

- **For Chrome:**

  ```sh
  node build.js chrome unpacked
  ```

  Look for a new folder on your Desktop called `inbox-reborn-chrome`.

- **For Firefox:**

  ```sh
  node build.js firefox unpacked
  ```

  Look for a new folder on your Desktop called `inbox-reborn-firefox`.

### 4. Load Unpacked Extension in Browser

- **Chrome/Edge:**
  - Go to `chrome://extensions/`
  - Enable "Developer mode"
  - Click "Load unpacked" and select your Desktop folder (`inbox-reborn-chrome`)

- **Firefox:**
  - Go to `about:debugging#/runtime/this-firefox`
  - Click "Load Temporary Add-on"
  - Select the `manifest.json` inside your Desktop folder (`inbox-reborn-firefox`)

---

**If you need more help, see [Node.js Documentation](https://nodejs.org/en/docs/) or reach out on GitHub Issues!**
