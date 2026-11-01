/* Inbox Reborn - category and Sent lookups, run in Gmail's own page (not
   the extension's isolated world).

   Gmail sorts mail into Purchases, Travel and Finance on its servers but
   draws nothing on an inbox row to say so, so the content script can't tell
   which rows belong to those bundles. Gmail's Purchases/Travel/Finance pages
   are searches (category:purchases...), and that search is the only signal
   that matches what those pages list - the per-thread category tags miss
   most Purchases and Travel mail.

   So this script sends Gmail's own thread-list request (/sync/u/N/i/bv)
   with the query "in:inbox category:<name>". It builds it from two parts:
   - the session (address and headers, incl. Gmail's anti-forgery token),
     taken from whatever /sync/ request Gmail sent last - it sends some
     right after loading, and keeps sending them
   - the list request body, copied from the last list Gmail itself loaded.
     A fresh page load brings the inbox with the page instead of asking for
     it, so the body is remembered in Gmail's localStorage - just the
     body's list settings, with the query blanked and never the session.
     Until Gmail has loaded a list once (a new install), a built-in copy of
     that body stands in, so the bundles show without opening another page.
   It only
   reads the thread ids that come back and posts them to the content script
   (src/script.js, "CATEGORY BUNDLES"). It changes nothing Gmail sends or
   receives, and stays idle until the content script asks for categories.

   The same request, with "in:sent", fills the compose speed dial: once per
   page load it reads who your newest sent threads were with, so the speed
   dial is right without a visit to the Sent page.

   Messages (window.postMessage, both directions tagged with SOURCE):
     in:  { type: 'want', categories: ['purchases', ...] }
     out: { type: 'threads', threads: { purchases: ['1a19...', ...], ... } }
          thread ids are hex, matching a row's data-legacy-thread-id
     in:  { type: 'wantSent' }
     out: { type: 'sent', recipients: [{ email, name }, ...] } newest first */
(() => {
  if (window.__inboxRebornCategories) return;
  window.__inboxRebornCategories = true;

  const SOURCE = 'inbox-reborn-categories';
  const SYNC_URL = /\/sync\/u\/\d+\/i\/(?:bv|s|fd)(?=\?|$)/;
  const LIST_URL = /\/sync\/u\/\d+\/i\/bv(?=\?|$)/;
  const BODY_KEY = 'inboxReborn.listRequestBody';
  // Gmail's list request body opens [[<view>,<page size>,null,"<query>",...
  const QUERY_IN_BODY = /^(\[\[\d+,\d+,null,)"(?:[^"\\]|\\.)*"/;
  // Only bodies of view 123 - the inbox and search lists - take a query.
  // Sent and label pages send other views (Sent is 9), which return
  // nothing for a search, so copying one would empty the bundles.
  const SEARCH_VIEW_BODY = /^\[\[123,/;
  const isSearchBody = (text) => QUERY_IN_BODY.test(text) && SEARCH_VIEW_BODY.test(text);
  const KNOWN = ['purchases', 'travel', 'finance'];
  const MIN_GAP_MS = 10 * 1000; // between refreshes triggered by Gmail's own loads
  const POLL_MS = 90 * 1000; // background refresh while the tab is visible
  const SEARCH_TIMEOUT_MS = 30 * 1000; // a search that takes longer is given up on
  // After a failed refresh the next waits twice as long as the one before,
  // up to this, so a Gmail change doesn't mean three failing requests per
  // list load for the rest of the visit
  const MAX_FAILURE_WAIT_MS = 30 * 60 * 1000;
  const SENT_THREADS = 10; // newest sent threads read for the speed dial
  // The page size inside the list request body
  const PAGE_SIZE_IN_BODY = /\[\[\[2,\d+\]\]\]/;

  let session = null; // { url, headers } of Gmail's newest /sync/ request, aimed at /i/bv
  let body = null; // body of the last list request Gmail sent

  // Gmail's inbox list request (as of Nov 2026), for when Gmail hasn't sent
  // one yet: the request time, the timezone offset (ms east of UTC) and
  // the last-sync time are filled in fresh. Gmail answers category searches
  // with it the same as with a copied body.
  const builtInBody = () => {
    const now = Date.now();
    const zone = -new Date().getTimezoneOffset() * 60000;
    return (
      `[[123,100,null,"",[null,null,null,null,0,null,null,null,null,null,null,${now},${zone},` +
      'null,null,null,null,null,null,null,null,null,null,0,0,0,0],"itemlist-ViewType(123)-2",' +
      '1,2000,null,0,null,null,null,1,null,[1,0,0,null,null,null,1,null,null,1,null,null,1,' +
      'null,1,null,null,null,null,null,0],null,null,1,null,null,0,1,0,[[[2,100]]],0,0,null,' +
      `null,null,null,null,[${now},null,null,150]],null,[0,5,null,null,1,1,1]]`
    );
  };
  let wanted = [];
  let lastRun = 0;
  let timer = null;
  let running = false;
  let pending = false; // a refresh was asked for while one was running
  let failures = 0; // refreshes failed in a row
  let warned = false;
  let sentWanted = false;
  let sentLooked = false;

  try {
    const saved = localStorage.getItem(BODY_KEY);
    if (saved && isSearchBody(saved)) body = saved;
  } catch {
    // Storage blocked - wait for Gmail to load a list
  }

  const warnOnce = (msg) => {
    if (warned) return;
    warned = true;
    console.warn(
      `[Inbox Reborn] ${msg} - Purchases, Travel and Finance bundles are paused; retrying less often.`,
    );
  };

  // When the next refresh may run: straight away, or after a failure a
  // wait that doubles with each failure in a row
  const nextAllowed = () =>
    failures ? lastRun + Math.min(MIN_GAP_MS * 2 ** failures, MAX_FAILURE_WAIT_MS) : 0;

  // ---------------------------------------------------------------------------
  // Watch Gmail's sync requests. The wrappers pass every call straight
  // through; they only copy the address, headers and (for lists) body.
  // ---------------------------------------------------------------------------
  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;
  const origSetHeader = proto.setRequestHeader;
  const origSend = proto.send;
  const OWN = Symbol('inboxRebornOwn');
  const INFO = Symbol('inboxRebornInfo');

  proto.open = function (method, url) {
    const href = String(url);
    this[INFO] = SYNC_URL.test(href) ? { method, url: href, headers: {} } : null;
    return origOpen.apply(this, arguments);
  };

  proto.setRequestHeader = function (name, value) {
    if (this[INFO]) this[INFO].headers[name] = value;
    return origSetHeader.apply(this, arguments);
  };

  proto.send = function (sent) {
    const info = this[INFO];
    if (info && !this[OWN] && String(info.method).toUpperCase() === 'POST') {
      const hadSession = !!session;
      session = {
        url: info.url.replace(SYNC_URL, (path) => path.replace(/[^/]+$/, 'bv')),
        headers: info.headers,
      };
      if (LIST_URL.test(info.url) && typeof sent === 'string' && isSearchBody(sent)) {
        body = sent;
        try {
          // Without the query - that can be anything the person searched for
          localStorage.setItem(
            BODY_KEY,
            sent.replace(QUERY_IN_BODY, (_, head) => `${head}""`),
          );
        } catch {
          // Storage blocked - keep it for this visit only
        }
        // Gmail just loaded a list (the inbox, after an archive, a new search...)
        this.addEventListener('load', () => schedule(1500));
      } else if (!hadSession) {
        // First request after the page loaded - enough to run the searches
        this.addEventListener('load', () => schedule(500));
      }
      if (!hadSession) this.addEventListener('load', () => setTimeout(lookUpSent, 500));
    }
    return origSend.apply(this, arguments);
  };

  // ---------------------------------------------------------------------------
  // Category searches
  // ---------------------------------------------------------------------------
  const search = (query, pageSize) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr[OWN] = true;
      origOpen.call(xhr, 'POST', session.url, true);
      Object.entries(session.headers).forEach(([k, v]) => origSetHeader.call(xhr, k, v));
      xhr.onload = () =>
        xhr.status === 200 ? resolve(xhr.responseText) : reject(new Error(`HTTP ${xhr.status}`));
      xhr.onerror = () => reject(new Error('network error'));
      // Without these a hung request would leave `running` set for good
      xhr.timeout = SEARCH_TIMEOUT_MS;
      xhr.ontimeout = () => reject(new Error('timed out'));
      xhr.onabort = () => reject(new Error('aborted'));
      let sent = (body || builtInBody()).replace(
        QUERY_IN_BODY,
        (_, head) => head + JSON.stringify(query),
      );
      if (pageSize) sent = sent.replace(PAGE_SIZE_IN_BODY, `[[[2,${pageSize}]]]`);
      origSend.call(xhr, sent);
    });

  const threadIds = (text) => {
    const ids = new Set();
    for (const [, id] of text.matchAll(/"thread-f:(\d+)"/g)) {
      try {
        ids.add(BigInt(id).toString(16));
      } catch {
        // Not a number - skip
      }
    }
    return [...ids];
  };

  const refresh = async () => {
    if (!session || !wanted.length) return;
    if (running) {
      // Gmail loaded a list mid-refresh: run again once this one is done
      pending = true;
      return;
    }
    running = true;
    lastRun = Date.now();
    const threads = {};
    try {
      for (const name of wanted) {
        threads[name] = threadIds(await search(`in:inbox category:${name}`));
      }
      window.postMessage({ source: SOURCE, type: 'threads', threads }, location.origin);
      failures = 0;
    } catch (e) {
      failures++;
      warnOnce(`Gmail category search failed (${e.message})`);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        schedule(0);
      }
    }
  };

  /**
   * The people of each thread in a list response, newest thread first.
   * A thread is [subject, snippet, time, "thread-a:/f:...", [messages], ...]
   * with its participants at [14][0] as [name, email] pairs (what Sent
   * shows as "To:"). Messages carry only their sender, so threads it is.
   */
  const threadPeople = (text) => {
    const people = [];
    const walk = (node) => {
      if (!Array.isArray(node)) return;
      if (typeof node[3] === 'string' && /^thread-[a-z]:/.test(node[3])) {
        const pairs = Array.isArray(node[14]?.[0]) ? node[14][0] : [];
        pairs.forEach((pair) => {
          if (Array.isArray(pair) && typeof pair[1] === 'string' && pair[1].includes('@')) {
            people.push({ email: pair[1], name: typeof pair[0] === 'string' ? pair[0] : '' });
          }
        });
        return;
      }
      node.forEach(walk);
    };
    walk(JSON.parse(text.replace(/^\)\]\}'\s*/, '')));
    return people;
  };

  // Once per page load: the speed dial's people, from Gmail's Sent search
  const lookUpSent = async () => {
    if (!sentWanted || sentLooked || !session) return;
    sentLooked = true;
    try {
      const recipients = threadPeople(await search('in:sent', SENT_THREADS));
      window.postMessage({ source: SOURCE, type: 'sent', recipients }, location.origin);
    } catch (e) {
      console.warn(
        `[Inbox Reborn] Gmail Sent lookup failed (${e.message}) - the speed dial updates when you open Sent.`,
      );
    }
  };

  const schedule = (delay) => {
    if (!wanted.length) return;
    clearTimeout(timer);
    const now = Date.now();
    const wait = Math.max(delay, lastRun + MIN_GAP_MS - now, nextAllowed() - now);
    timer = setTimeout(refresh, wait);
  };

  setInterval(() => {
    const now = Date.now();
    if (
      document.visibilityState === 'visible' &&
      now - lastRun >= POLL_MS &&
      now >= nextAllowed()
    ) {
      refresh();
    }
  }, 15 * 1000);

  // ---------------------------------------------------------------------------
  // Requests from the content script
  // ---------------------------------------------------------------------------
  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.source !== SOURCE) return;
    if (e.data.type === 'wantSent') {
      sentWanted = true;
      lookUpSent();
      return;
    }
    if (e.data.type !== 'want') return;
    const list = Array.isArray(e.data.categories) ? e.data.categories : [];
    wanted = KNOWN.filter((name) => list.includes(name));
    if (wanted.length) schedule(0);
  });

  // No sync request seen well after load: Gmail renamed or reshaped them
  setTimeout(() => {
    if (wanted.length && !session) warnOnce("Gmail's sync requests weren't found");
  }, 30 * 1000);
})();
