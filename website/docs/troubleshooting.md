---
sidebar_position: 8
title: Troubleshooting
description: Bundles that won't form, categories that won't bundle, drags that didn't move mail, and where to get help.
---

# Troubleshooting

## Bundles

**No bundles at all.** Check that bundling is on: Stock Inbox, or **Bundle emails** under
Customize in the [settings](/settings). Then check the label is in **Bundled in the inbox** in
the left menu; every label of yours starts in Unbundled until you drag it up.

**A label is in Bundled in the inbox but no bundle forms.**

- The label needs **two or more emails in the inbox**, unless Bundle single emails is on.
  Labeled mail that's archived doesn't count; open the label's page and move what you want
  into the inbox, or drag the label down and up again and answer Move to inbox.
- Gmail must **show the label in the message list** (Settings → Labels → the label's
  _show in message list_). The extension bundles by the chip on the row.
- **Starred emails never bundle.** That's by design.

**A Gmail category won't bundle even though its page lists the mail.** Set the category to
**show** in Settings → Labels → Categories. Social, Updates, Forums and Promotions bundle only
once Gmail draws their chip on the row. Purchases, Travel and Finance have no chip; turn them
on under Customize → Bundles (Stock Inbox has them on). More in
[Gmail's categories](/bundles/gmail-categories).

**An email is in the wrong bundle, or shows in two tabs in plain Gmail.** Gmail gave it two
categories. The extension picks one, in Inbox's order; see
[One bundle per email](/bundles/how-bundles-work#one-bundle-per-email). To change where that
sender goes, use Gmail's **Move to tab** on the email and say yes to future messages.

**Everything lands in Updates or Forums.** That's Gmail's classifier at work, not a setting
of yours. [Gmail's categories](/bundles/gmail-categories#why-does-all-my-new-mail-land-in-updates-or-forums)
explains the three ways to steer it.

**Purchases, Travel and Finance bundles disappeared.** They depend on Gmail's internal list
requests. If Google changes those, these three stop until the extension is updated; the
browser console says so. Everything else keeps working.

## Dragging between the sections

**I dragged a label up and nothing showed in the inbox.** A bundle needs inbox mail. If you
chose **Cancel** in the dialog, nothing moved, and the bundle fills with new mail only. Drag
the label down and up again to get the dialog back.

**The move stopped partway.** A move stops after 5,000 conversations and says so; drag again
to continue. If it stopped with "Couldn't finish", Gmail probably showed a list the extension
didn't expect; open the label's page and use Gmail's select-all with Archive or Move to Inbox
for the rest.

**I want my mail back the way it was.** The extension only archives (dragging down) and moves
to inbox (dragging up); nothing is deleted or relabeled. Gmail's **Undo** reverses each step
right after it happens. Later, the label's page lists all its mail, archived or not, and
Gmail's own Move to Inbox puts back whatever you want.

**I can't drag a nested label.** Drag the label it's nested under; nested labels follow it.
Labels under an `Unbundled` label never bundle and can't be dragged.

## Everything else

**Dates are wrong, or groups look odd.** The extension reads Gmail's dates in **English**.
With Gmail in another language the grouping can be off.

**Reminders don't show.** The Reminders setting is **"Reminder" only** by default: the email
to yourself needs the subject _Reminder_. Choose **All** to count every email you send yourself.

**The speed dial is empty.** It fills from your sent mail each time Gmail loads. Send an
email, or wait for Gmail to finish loading, then hover the compose button again.

**Gmail changed and something looks broken.** Google updates Gmail's page often. Check for an
extension update first; then report it (below) with a screenshot and your browser's name.

## Getting help

- **Report a problem:** [GitHub Issues](https://github.com/team-inbox/inbox-reborn/issues).
  Say what you expected, what happened, your browser, and whether Stock Inbox is on.
- **What changed in each version:** the
  [changelog](https://github.com/team-inbox/inbox-reborn/blob/master/CHANGELOG.md).
- **Source code:** [github.com/team-inbox/inbox-reborn](https://github.com/team-inbox/inbox-reborn).
