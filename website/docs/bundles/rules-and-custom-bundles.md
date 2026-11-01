---
sidebar_position: 4
title: Rules and custom bundles
description: Build your own bundles the way Inbox did, with a label and a Gmail filter as the rule.
---

# Rules and custom bundles

Inbox let you make a bundle of your own and give it **rules**: "add emails from this sender",
"add emails with these words". Under the hood those rules were Gmail filters that applied a
label, and the bundle was that label. Inbox Reborn works the same way, with Gmail's own
filters as the rules.

## The recipe

1. **Create a label** in Gmail for the bundle: _Receipts_, _Newsletters_, _School_, a project
   name. Gmail's left menu → **More** → **Create new label**.
2. **Create a filter that applies the label.** Settings → **Filters and Blocked Addresses** →
   **Create a new filter**. Describe the mail: a sender, several senders joined with `OR`, a
   subject, words in the body, a list address.

   ```text
   From: auto-confirm@amazon.com OR service@paypal.com OR transaction@etsy.com
   ```

   Click **Create filter**, tick **Apply the label** and choose yours, tick **Also apply
   filter to matching conversations** to label what's already there, and **Create filter**.

   :::caution Don't tick "Skip the Inbox"
   Bundles are built from inbox mail. A filter that archives the mail keeps it out of the
   bundle. Leave it in the inbox and let the bundle fold it away.
   :::

3. **Drag the label up** from Unbundled into **Bundled in the inbox** in the left menu. When
   asked, choose **Move to inbox** to bring the label's archived mail into the bundle, or
   **Cancel** to start the bundle with new mail only. See
   [what moves when you drag](/bundles/bundled-and-unbundled#what-moves-when-you-drag).

From then on the filter labels mail as it arrives and the bundle takes care of itself, on
every device: the label and the filter are Gmail's, so your phone shows the same labeled mail,
just as rows.

## Rules for an Unbundled label

Rules and bundling are independent. A label in **Unbundled** can have as many filters feeding
it as you like; its mail simply shows one email at a time, with the label's chip, instead of
folding into a bundle. The drag between the sections is the only thing that decides which of
the two happens.

So "rules for an Unbundled label" is just a Gmail filter whose action is **Apply the label**,
set up exactly as in step 2 above. The common patterns:

| You want…                                               | Filter                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A sender's mail under a label, shown as rows            | From: the sender → Apply the label                                                      |
| A sender's mail under a label, out of the inbox entirely | From: the sender → Apply the label **and** Skip the Inbox (it will never bundle)        |
| A sender out of Updates or Forums, shown as a plain row | From: the sender → **Categorize as: Primary** (see [Gmail's categories](/bundles/gmail-categories)) |
| A sender into a different category's bundle             | From: the sender → **Categorize as: Updates** (or Social, Promotions, Forums)           |

## Recreating Inbox's own bundles

Travel, Purchases, Finance, Social, Updates, Forums and Promotions are already there; Gmail
sorts into them for you (see [Gmail's categories](/bundles/gmail-categories)). If you'd rather decide
yourself what counts as a purchase, make a label with a different name, such as _Receipts_,
feed it with a filter as above, and drag it up. Gmail reserves the names `Travel`,
`Purchases` and the other category names, and your own labels always get the stacked-envelopes
bundle icon.

## Tips

- **Several senders, one rule:** join addresses with `OR` in the From field, or use a domain:
  `@amazon.com`.
- **Filter on the list address** for mailing lists: `list:` in Has the words, for example
  `list:news.example.com`.
- **Test before you commit:** type the same words in Gmail's search box first. The filter
  matches exactly what the search finds.
- **Edit later:** Settings → Filters and Blocked Addresses lists every rule, with edit and
  delete next to each.
