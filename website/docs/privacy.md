---
sidebar_position: 7
title: Privacy
description: What the extension stores, what it asks Gmail for, and the only requests that go anywhere else.
---

# Privacy

Inbox Reborn has **no servers and no analytics**. Nothing about you or your mail is collected.
The code is open source on [GitHub](https://github.com/team-inbox/inbox-reborn), and the full
[privacy policy](https://github.com/team-inbox/inbox-reborn/blob/master/PRIVACY.md) is kept
there too.

## What stays in your browser

Everything the extension remembers lives in your browser's extension storage:

- your settings from the popup
- per Gmail account, which labels you've dragged to Bundled in the inbox and which categories
  to Unbundled
- per Gmail account, which conversations a drag down archived, so a drag up can bring back
  exactly those (see [what moves when you drag](/bundles/bundled-and-unbundled#what-moves-when-you-drag))
- your recent contacts for the speed dial, and sender pictures it has already found

## What it asks Gmail for

Two features ask **Gmail itself**, from your browser with your own Gmail session:

- **Purchases, Travel and Finance bundles** run the same searches Gmail's own Purchases,
  Travel and Finance pages run (`in:inbox category:purchases` and so on), to learn which inbox
  conversations belong in them.
- **The speed dial** asks for your newest sent conversations once per load, to know who you
  write to.

Moving mail when you drag a label between the sections is done through Gmail's own list and
toolbar, in your tab; nothing is sent anywhere.

## The only requests to anyone else

They are all for **sender pictures**, and turning **Avatars** off stops every one of them:

| Request                | Where it goes                                                        | What it carries                          |
| ---------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| Brand logos            | A DNS-over-HTTPS lookup (Google, Cloudflare or DNSPod) for the sender's domain's published logo | the sender's **domain**                  |
| Company site icons     | Google's icon service                                                | the sender's **domain**                  |
| Gravatar photos        | Gravatar, only with **Gravatar photos** on (off by default)          | a **hashed** copy of the sender's address |

No request ever carries the contents of an email, a subject, or your own address.
