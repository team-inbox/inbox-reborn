# Inbox Reborn theme for Gmail™
#### *Formerly known as Inbox in Gmail*

Web extension which modifies Gmail™ to bring back the features and uncluttered design you knew and loved from Google's discontinued Inbox

![inbox screenshot](https://github.com/team-inbox/inbox-reborn/blob/master/screenshots/inbox%20v0.4.8-3.png?raw=true)

## Installing

### Chrome & Microsoft Edge Install

https://chrome.google.com/webstore/detail/inbox-reborn-theme-for-gm/bkphmihkdbdgedlaflnkhnmnmibffomf


### Firefox Install

https://addons.mozilla.org/en-GB/firefox/addon/inbox-reborn-theme-gmail/

## Features

- Bundle emails by label and category
- Group emails by date (today, yesterday, this month, etc)
- Clean interface to return to the simplicity of Inbox
- Display emails sent to yourself with the subject "Reminder" as reminders
- Colored avatars based on the sender's name
- Calendar events displayed on a small card, with inline responses


## Extension Options

![options popup screenshot](https://github.com/team-inbox/inbox-reborn/blob/master/screenshots/options%20v0.4.8-2.png?raw=true)

Click the extension's icon at the top right of your browser to adjust the behavior of some features:

#### Reminders
This option is used to determine how to treat emails sent to yourself.

- All are treated as reminders. 
- Only emails with a subject containing the word "reminder" are treated as reminders. 
- Leave the emails as they are. (Disable)

#### Email Bundling
This option is used to bundle emails by label in the inbox.

- Toggle Enable/Disable

#### Avatars
This option will show a circle with the first letter initial of the sender, to the left of the email in your folder.
- Toggle Enable/Disable

#### Hide Priority Inbox Headings
This option provides a cleaner inbox UI if the "Priority Inbox" type is enabled via the settings
- Toggle Enable/Disable


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

Disable inbox category tabs:
- Settings Dropdown/Configure Inbox -> Leave only Primary ticked -> Save

Allow default category labels (Promotions, Social, Updates, Forums) to be bundled:
- Settings/Labels/Categories/Show in message List -> Click Show for each category

If you'd like a specific label not to be bundled, create a label called 'Unbundled', and nest that label within it.


## Known Issues

- This extension works best in English because it relies on specific date formats.
- This currently only supports Gmail™'s default theme. You will experience white/invisible text and icons if you enable the Dark theme.


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
