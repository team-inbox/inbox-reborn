# Privacy Policy

_Inbox Reborn theme for Gmail™ — effective October 31, 2026_

Inbox Reborn is a browser extension that restyles Gmail™ and adds features from Google's
discontinued Inbox. It runs entirely in your browser. We have no servers, no accounts, and no
analytics, and we never receive any of your data.

## What the extension reads

To do its job, the extension reads parts of the Gmail page you have open: the email list
(senders, subjects, dates and labels), sender pictures Gmail already shows you, and the
recipients of emails you send. That's how it groups mail by date, builds bundles, shows
reminders and avatars, and fills the speed dial. This information is processed in your browser
and is not sent to us.

With **Bundle Purchases**, **Bundle Travel** or **Bundle Finance** turned on, the extension also
asks Gmail itself which inbox emails are in those categories, using the same searches Gmail's
Purchases, Travel and Finance pages run. These requests go only to Gmail
(`mail.google.com`), from your browser, with your existing Gmail session. The extension keeps
the email ids that come back in memory while Gmail is open, and saves the shape of Gmail's list
request (its display settings, without your search words) in Gmail's own site storage so the
bundles appear right away next time.

To fill the speed dial, the extension likewise asks Gmail for your newest sent conversations
(the same search as Gmail's Sent page) once each time Gmail loads, and keeps the names and
addresses of your three most recent contacts in extension storage, as described below. This
request also goes only to Gmail.

## What is stored on your device

The extension keeps a small amount of data in your browser's extension storage
(`chrome.storage.local`). It never leaves your device:

- **Your options** — the settings you choose in the extension popup.
- **Recent contacts** — the name, email address and Gmail profile picture of your three most
  recent recipients, for the speed dial.
- **Saved sender pictures** — up to 2,000 sender email addresses with the link to the picture
  Gmail showed for them.
- **Avatar lookup cache** — up to 2,000 sender email addresses with the result of the last
  picture lookup, so the same lookup isn't repeated.

Older entries are removed automatically when a list is full. Uninstalling the extension deletes
all of it.

## What is sent to third parties

The only network requests the extension makes are to find **sender pictures**, and only while
**Avatars** is turned on in the options:

| Service                                     | What is sent                                             | Why                                                                                                                                           |
| ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Google, Cloudflare or DNSPod DNS-over-HTTPS | The sender's domain (e.g. `example.com`)                 | To look up the domain's published BIMI logo                                                                                                   |
| The sender's logo host                      | A request for the logo address found in that BIMI record | To display the brand logo                                                                                                                     |
| Google's site icon service (`gstatic.com`)  | The sender's domain                                      | To display the company's site icon                                                                                                            |
| Gravatar                                    | A SHA-256 hash of the sender's email address             | To display their Gravatar photo — **off by default**; only with _Gravatar photos_ on, which turning _Stock Inbox_ on in the options also does |

These requests come from your browser, so as with any web request the service also sees your
IP address and browser user agent. Each service's own privacy policy applies to what it receives.
The content and subjects of your emails are never sent anywhere.

Turning **Avatars** off stops all of these requests.

## What we don't do

- We don't collect, store or transmit your data on any server of ours.
- We don't sell or transfer user data to anyone, or use it for advertising, credit checks or
  any purpose unrelated to the extension's features.
- No person ever reads your data.

The use of information received from this extension complies with the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/),
including the Limited Use requirements.

## Changes and contact

Changes to this policy are tracked in this file's history on GitHub. Questions? Open an issue at
[github.com/team-inbox/inbox-reborn/issues](https://github.com/team-inbox/inbox-reborn/issues).
