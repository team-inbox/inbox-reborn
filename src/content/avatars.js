// Sender avatars on rows and in open conversations
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// AVATAR PICTURES
// =============================================================================

/* Each sender gets the first picture found, in this order:
   1. a profile photo Gmail has already shown (open conversations, compose
      chips) - stored locally, nothing extra leaves the browser
   2. the brand's BIMI logo
   3. Gravatar, when the user opts in (sends a hash of the address)
   4. the company site's icon, for non-webmail domains
   and keep the colored letter otherwise. */

/**
 * Webmail providers - addresses here belong to people, so no company logo
 * or site icon applies
 */
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'fastmail.com',
  'hey.com',
  'comcast.net',
  'att.net',
  'verizon.net',
]);

const CONTACT_PHOTOS_KEY = 'contactPhotos';
const MAX_CONTACT_PHOTOS = 2000;

/** email -> profile photo URL, mirrored from local storage */
const contactPhotos = new Map();

/** email -> Promise of {url, source} or null, so each sender is looked up once */
const avatarLookups = new Map();

/* Lookup results are remembered across page loads, so a reload paints
   pictures straight away instead of repeating every network check */
const AVATAR_CACHE_KEY = 'avatarCache';
const MAX_CACHED_AVATARS = 2000;
const AVATAR_FOUND_TTL = 14 * 24 * 60 * 60 * 1000;
const AVATAR_MISSING_TTL = 3 * 24 * 60 * 60 * 1000;

/** email -> {url, source, at} (url null when nothing was found) */
const cachedAvatars = new Map();
const pendingAvatarCacheWrites = new Map();
let avatarCacheFlushTimer;

/* Few senders at a time - a full inbox firing every lookup at once queues
   in the browser long enough for checks to time out */
const MAX_PARALLEL_AVATAR_LOOKUPS = 6;
const IMAGE_CHECK_TIMEOUT_MS = 6000;
let activeAvatarLookups = 0;
const queuedAvatarLookups = [];

/**
 * Checks for a real Google profile photo - Gmail's generated letter
 * circles live under /cm/ and are skipped
 * @param {string} url - Image URL
 * @returns {boolean} True for a profile photo
 */
const isProfilePhotoUrl = (url) => /^https:\/\/lh\d\.googleusercontent\.com\/a-?\//.test(url || '');

/**
 * Stores profile photos for later avatars, newest last (oldest are dropped
 * past MAX_CONTACT_PHOTOS)
 * @param {Array<[string, string]>} entries - [email, photo URL] pairs
 */
const rememberContactPhotos = (entries) => {
  const fresh = entries
    .map(([email, url]) => [email?.toLowerCase(), url])
    .filter(([email, url]) => email && isProfilePhotoUrl(url) && contactPhotos.get(email) !== url);
  if (!fresh.length) return;

  fresh.forEach(([email, url]) => contactPhotos.set(email, url));
  chrome.storage.local.get(CONTACT_PHOTOS_KEY, (result) => {
    const stored = result[CONTACT_PHOTOS_KEY] || {};
    fresh.forEach(([email, url]) => {
      delete stored[email]; // re-insert so it counts as newest
      stored[email] = url;
    });
    const emails = Object.keys(stored);
    emails.slice(0, Math.max(0, emails.length - MAX_CONTACT_PHOTOS)).forEach((email) => {
      delete stored[email];
    });
    chrome.storage.local.set({ [CONTACT_PHOTOS_KEY]: stored });
  });
};

/**
 * Syncs sender pictures in open conversations - Gmail tags each one with
 * the sender's address in data-hovercard-id. Real profile photos are saved
 * for the list avatars; Gmail's generated letter circles (/cm/) are swapped
 * for the picture the list shows, when there is one.
 */
const syncConversationAvatars = () => {
  const senderImages = Array.from(document.querySelectorAll('img.ajn[data-hovercard-id]'));
  rememberContactPhotos(
    senderImages.map((img) => [img.getAttribute('data-hovercard-id'), img.src]),
  );

  if (options.showAvatar !== 'enabled') return;
  senderImages
    .filter((img) => img.src.includes('googleusercontent.com/cm/') && !img.dataset.avatarSource)
    .forEach((img) => {
      img.dataset.avatarSource = 'pending';
      resolveAvatar(img.getAttribute('data-hovercard-id').toLowerCase()).then((avatar) => {
        if (!avatar) return;
        img.src = avatar.url;
        img.dataset.avatarSource = avatar.source;
      });
    });
};

/**
 * Loads stored photos, and upgrades on-screen avatars whenever a photo is
 * learned (in this tab or another)
 */
const watchContactPhotos = () => {
  avatarStoresLoaded = new Promise((resolve) =>
    chrome.storage.local.get([CONTACT_PHOTOS_KEY, AVATAR_CACHE_KEY], (result) => {
      Object.entries(result[CONTACT_PHOTOS_KEY] || {}).forEach(([email, url]) =>
        contactPhotos.set(email, url),
      );
      Object.entries(result[AVATAR_CACHE_KEY] || {}).forEach(([email, entry]) =>
        cachedAvatars.set(email, entry),
      );
      resolve();
    }),
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[CONTACT_PHOTOS_KEY] || !instanceActive()) return;
    const oldPhotos = changes[CONTACT_PHOTOS_KEY].oldValue || {};
    Object.entries(changes[CONTACT_PHOTOS_KEY].newValue || {}).forEach(([email, url]) => {
      contactPhotos.set(email, url);
      if (oldPhotos[email] === url) return;

      avatarLookups.delete(email);
      document.querySelectorAll(`[data-avatar-email="${CSS.escape(email)}"]`).forEach((wrapper) => {
        const name =
          wrapper.closest('.zA')?.querySelector('.yW [name]')?.getAttribute('name') || '';
        replaceAvatarWithWeb(wrapper, { url, source: 'photo' }, name);
      });
    });
  });
};

/**
 * SHA-256 hex digest, as Gravatar expects
 * @param {string} text - Text to hash
 * @returns {Promise<string>} Hex digest
 */
const sha256Hex = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Looks up a Gravatar - d=404 makes addresses without one fail to load
 * @param {string} email - Lowercased address
 * @returns {Promise<string|null>} Image URL or null
 */
const fetchGravatar = async (email) =>
  testImageUrl(
    `https://gravatar.com/avatar/${await sha256Hex(email.trim())}?s=80&d=404`,
    0,
    IMAGE_CHECK_TIMEOUT_MS,
  );

/**
 * Looks up a site's icon. Unknown sites get a 16px placeholder, which the
 * 32px minimum rejects along with icons too small to fill an avatar.
 * @param {string} domain - Site domain
 * @returns {Promise<string|null>} Icon URL or null
 */
const fetchSiteIcon = (domain) =>
  testImageUrl(
    `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`,
    32,
    IMAGE_CHECK_TIMEOUT_MS,
  );

/** Resolves once saved photos and cached lookups are loaded from storage */
let avatarStoresLoaded = Promise.resolve();

/**
 * Runs a lookup once a slot is free (at most MAX_PARALLEL_AVATAR_LOOKUPS)
 * @param {Function} task - Returns a promise
 * @returns {Promise} The task's result
 */
const runAvatarLookup = (task) =>
  new Promise((resolve, reject) => {
    const run = () => {
      activeAvatarLookups++;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeAvatarLookups--;
          queuedAvatarLookups.shift()?.();
        });
    };
    if (activeAvatarLookups < MAX_PARALLEL_AVATAR_LOOKUPS) run();
    else queuedAvatarLookups.push(run);
  });

/**
 * Remembers a lookup result; writes are batched into one storage update
 * @param {string} email - Lowercased address
 * @param {Object|null} avatar - {url, source} or null for nothing found
 * @param {boolean} withGravatar - Whether Gravatar was part of the check
 */
const cacheAvatar = (email, avatar, withGravatar) => {
  const entry = {
    url: avatar?.url || null,
    source: avatar?.source || null,
    withGravatar,
    at: Date.now(),
  };
  cachedAvatars.set(email, entry);
  pendingAvatarCacheWrites.set(email, entry);

  clearTimeout(avatarCacheFlushTimer);
  avatarCacheFlushTimer = setTimeout(() => {
    const writes = new Map(pendingAvatarCacheWrites);
    pendingAvatarCacheWrites.clear();
    chrome.storage.local.get(AVATAR_CACHE_KEY, (result) => {
      const stored = result[AVATAR_CACHE_KEY] || {};
      writes.forEach((value, key) => {
        delete stored[key]; // re-insert so it counts as newest
        stored[key] = value;
      });
      const keys = Object.keys(stored);
      keys.slice(0, Math.max(0, keys.length - MAX_CACHED_AVATARS)).forEach((key) => {
        delete stored[key];
      });
      chrome.storage.local.set({ [AVATAR_CACHE_KEY]: stored });
    });
  }, 1000);
};

/**
 * Returns a remembered lookup result that is still fresh
 * @param {string} email - Lowercased address
 * @returns {Object|null|undefined} {url, source}, null for "nothing found",
 *   or undefined when it has to be looked up
 */
const getCachedAvatar = (email) => {
  const entry = cachedAvatars.get(email);
  if (!entry) return undefined;
  // A remembered Gravatar only counts while the option is on
  if (entry.source === 'gravatar' && options.gravatar !== 'enabled') return undefined;
  // "Nothing found" was decided without Gravatar - recheck once it is on
  if (!entry.url && options.gravatar === 'enabled' && !entry.withGravatar) return undefined;
  const ttl = entry.url ? AVATAR_FOUND_TTL : AVATAR_MISSING_TTL;
  if (Date.now() - entry.at > ttl) return undefined;
  return entry.url ? { url: entry.url, source: entry.source } : null;
};

/**
 * Checks every network source for a sender at once and picks the best hit
 * in priority order (see the order above)
 * @param {string} email - Lowercased address
 * @returns {Promise<Object|null>} {url, source} or null for the letter avatar
 */
const lookupAvatarOnline = async (email) => {
  const domain = extractDomain(email);
  const isCompany =
    domain && !PERSONAL_EMAIL_DOMAINS.has(domain) && !SKIP_DOMAINS.has(getMainDomain(domain));
  const withGravatar = options.gravatar === 'enabled';

  const [logo, gravatar, icon] = await Promise.all([
    isCompany ? fetchBrandLogo(domain) : null,
    withGravatar ? fetchGravatar(email) : null,
    isCompany ? fetchSiteIcon(getMainDomain(domain)) : null,
  ]);

  const avatar =
    (logo && { url: logo, source: 'logo' }) ||
    (gravatar && { url: gravatar, source: 'gravatar' }) ||
    (icon && { url: icon, source: 'icon' }) ||
    null;

  // A timed-out check proves nothing, so only remember definite answers
  const timedOut = gravatar === undefined || icon === undefined;
  if (avatar || !timedOut) cacheAvatar(email, avatar, withGravatar);
  return avatar;
};

/**
 * Finds the picture for a sender: a saved photo, then a remembered result,
 * then the network (queued). Waits for storage and options first - the
 * speed dial asks before either has loaded. One lookup per sender per page
 * load.
 * @param {string} email - Lowercased address
 * @returns {Promise<Object|null>} {url, source} or null
 */
const resolveAvatar = (email) => {
  if (!avatarLookups.has(email)) {
    avatarLookups.set(
      email,
      Promise.all([avatarStoresLoaded, optionsLoaded]).then(() => {
        if (contactPhotos.has(email)) return { url: contactPhotos.get(email), source: 'photo' };
        const cached = getCachedAvatar(email);
        if (cached !== undefined) return cached;
        return runAvatarLookup(() => lookupAvatarOnline(email));
      }),
    );
  }
  return avatarLookups.get(email);
};

/**
 * Sets a custom favicon
 */
const setFavicon = () => {
  const faviconLink = document.querySelector('link[rel*="shortcut icon"]');
  if (faviconLink) {
    faviconLink.href = chrome.runtime.getURL('images/favicon.png');
  }
};
