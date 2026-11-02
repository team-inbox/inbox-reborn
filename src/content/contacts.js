// Recent contacts (speed dial) learned from sent mail
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// RECENT CONTACTS (SPEED DIAL)
// =============================================================================

/* Inbox's speed dial: hovering the compose button shows the last people you
   wrote to above the reminder button. Gmail exposes no recent-recipients
   list, so the extension keeps its own in local storage - recorded at Send,
   re-synced from Gmail's Sent search on each page load (src/gmail-categories.js
   runs it), and from the Sent list whenever that list is on screen. */
const RECENT_CONTACTS_KEY = 'recentContacts';
const MAX_RECENT_CONTACTS = 3;

/**
 * Merges recipients into the stored recent contacts, newest first
 * @param {Object[]} recipients - {email, name, photo} objects, newest first
 * @param {boolean} replace - Treat recipients as the complete new order
 *   (from the Sent list) instead of adding them in front of the stored ones
 */
const rememberRecentContacts = (recipients, replace = false) => {
  rememberContactPhotos(recipients.map(({ email, photo }) => [email, photo]));

  const myEmail = getMyEmailAddress()?.toLowerCase();
  const fresh = recipients.filter(({ email }) => email && email.toLowerCase() !== myEmail);
  if (!fresh.length) return;

  chrome.storage.local.get(RECENT_CONTACTS_KEY, (result) => {
    const stored = result[RECENT_CONTACTS_KEY] || [];
    const merged = [];

    for (const contact of replace ? fresh : [...fresh, ...stored]) {
      const email = contact.email.toLowerCase();
      if (merged.some((c) => c.email === email)) continue;
      // Keep a photo or name learned earlier (Sent rows carry neither photo)
      const known = stored.find((c) => c.email === email);
      merged.push({
        email,
        name: contact.name || known?.name || email,
        photo: contact.photo || known?.photo || '',
      });
      if (merged.length === MAX_RECENT_CONTACTS) break;
    }

    if (JSON.stringify(merged) !== JSON.stringify(stored)) {
      chrome.storage.local.set({ [RECENT_CONTACTS_KEY]: merged });
    }
  });
};

/**
 * Reads the recipients of a compose window (new message or inline reply)
 * @param {Element} compose - The compose root
 * @returns {Object[]} {email, name, photo} for each recipient chip
 */
/* A recipient chip in the To/Cc/Bcc fields: the address is in
   data-hovercard-id, the display name in data-name */
const RECIPIENT_CHIP = '[role=option][data-hovercard-id*="@"]';

const getComposeRecipients = (compose) =>
  Array.from(compose.querySelectorAll(RECIPIENT_CHIP)).map((chip) => {
    const photo = chip.querySelector('img')?.src || '';
    return {
      email: chip.getAttribute('data-hovercard-id'),
      name: chip.getAttribute('data-name') || chip.innerText.split('\n')[0].trim(),
      photo: photo.startsWith('https://') ? photo : '',
    };
  });

/**
 * Finds the compose window an element belongs to
 * @param {Element} el - An element inside a compose window
 * @returns {Element|null} The nearest ancestor holding a recipient chip -
 *   not just any listbox: the toolbar's font picker is one too, and stopping
 *   there found no recipients
 */
const findComposeRoot = (el) => {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node.querySelector(RECIPIENT_CHIP)) return node;
  }
  return null;
};

/**
 * Records recipients whenever a message is sent - by the Send button or
 * Cmd/Ctrl+Enter. Capture phase, so the compose is read before Gmail closes it.
 */
const watchSentMessages = () => {
  const record = (el) => {
    const compose = findComposeRoot(el);
    if (compose) rememberRecentContacts(getComposeRecipients(compose));
  };

  document.addEventListener(
    'mousedown',
    (e) => {
      const sendButton = e.target.closest?.('.T-I.aoO');
      if (sendButton) record(sendButton);
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      if (e.target.isContentEditable || e.target.matches?.('input, textarea')) record(e.target);
    },
    true,
  );
};

let sentListSynced = false;

/**
 * Re-syncs recent contacts from the Sent list's top rows (most recent
 * first), so a fresh install starts with the right people. Runs once per
 * visit to Sent, as soon as its rows are on screen.
 */
const syncRecentContactsFromSent = () => {
  if (getViewHash() !== '#sent') {
    sentListSynced = false;
    return;
  }
  if (sentListSynced) return;

  // Sent rows lead their participant column with a bare "To: " text node
  // (inbox rows start with a span) - this keeps the inbox rows still on
  // screen right after the hash changes from being read as recipients
  const rows = Array.from(select.emails()).filter(
    (row) =>
      row.getClientRects().length &&
      row.querySelector('.yW')?.firstChild?.nodeType === Node.TEXT_NODE,
  );
  if (!rows.length) return;
  sentListSynced = true;
  const recipients = rows.flatMap((row) =>
    Array.from(select.emailParticipants(row)).map((span) => ({
      email: span.getAttribute('email'),
      name: span.getAttribute('name'),
    })),
  );

  rememberRecentContacts(recipients, true);
};

/**
 * Builds one avatar button of the speed dial
 * @param {Object} contact - {email, name, photo}
 * @returns {Element} The avatar button
 */
const buildRecentContact = (contact) => {
  const button = document.createElement('div');
  button.className = 'recent-contact';
  button.setAttribute('role', 'button');
  // Shown instantly by CSS beside the avatar (a title tooltip waits ~1s)
  const label =
    contact.name === contact.email ? contact.email : `${contact.name}\n${contact.email}`;
  button.dataset.label = label;
  button.setAttribute('aria-label', label.replace('\n', ', '));

  const showPicture = ({ url, source }) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.dataset.source = source;
    button.replaceChildren(img);
    button.style.backgroundColor = '';
  };

  if (contact.photo) {
    showPicture({ url: contact.photo, source: 'photo' });
  } else {
    // Same letter + color scheme as the thread list avatars, until the same
    // picture lookup the list uses finds something better
    const letter = (contact.name || contact.email)[0].toUpperCase();
    const code = letter.charCodeAt(0);
    button.textContent = letter;
    button.style.backgroundColor =
      code >= 65 && code <= 90 ? '#' + NAME_COLORS[code - 65] : '#616161';
    // Picture lookups follow the Avatars option, like the thread list
    optionsLoaded
      .then(() => options.showAvatar === 'enabled' && resolveAvatar(contact.email))
      .then((avatar) => avatar && showPicture(avatar))
      .catch(() => {
        // Keep the letter
      });
  }

  button.addEventListener('click', () => openCompose({ to: contact.email }));
  return button;
};

/**
 * Adds the recent-contacts speed dial, shown while the pointer is over the
 * compose button, the reminder button, or the contacts themselves
 */
const addRecentContacts = () => {
  if (document.querySelector('.recent-contacts')) return;

  const container = document.createElement('div');
  container.className = 'recent-contacts';
  document.body.appendChild(container);

  const render = (contacts = []) => container.replaceChildren(...contacts.map(buildRecentContact));

  chrome.storage.local.get(RECENT_CONTACTS_KEY, (result) => render(result[RECENT_CONTACTS_KEY]));
  // Ask the page script for the newest Sent recipients (answered below the
  // category bundles' message listener)
  window.postMessage({ source: CATEGORIES_MESSAGE_SOURCE, type: 'wantSent' }, location.origin);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[RECENT_CONTACTS_KEY]) {
      render(changes[RECENT_CONTACTS_KEY].newValue);
    }
  });

  // A short grace period lets the pointer cross the gaps between buttons
  let closeTimer;
  const open = () => {
    clearTimeout(closeTimer);
    addClassToBody('speed-dial-open');
  };
  const close = () => {
    closeTimer = setTimeout(() => removeClassFromBody('speed-dial-open'), 300);
  };

  [container, document.querySelector('.floating-compose'), document.querySelector('.add-reminder')]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener('mouseenter', open);
      el.addEventListener('mouseleave', close);
    });
};

/**
 * Moves floating buttons to the left to accommodate side panel
 */
const moveFloatersLeft = () => {
  const reminderButton = document.querySelector('.add-reminder');
  const composeButton = document.querySelector('.floating-compose');
  const recentContacts = document.querySelector('.recent-contacts');

  if (reminderButton) reminderButton.classList.add('moved');
  if (composeButton) composeButton.classList.add('moved');
  if (recentContacts) recentContacts.classList.add('moved');
};

/**
 * Moves floating buttons back to the right
 */
const moveFloatersRight = () => {
  const reminderButton = document.querySelector('.add-reminder');
  const composeButton = document.querySelector('.floating-compose');
  const recentContacts = document.querySelector('.recent-contacts');

  if (reminderButton) reminderButton.classList.remove('moved');
  if (composeButton) composeButton.classList.remove('moved');
  if (recentContacts) recentContacts.classList.remove('moved');
};

/* Gmail is actively restructuring the right side panel (mid-2026); every hook
   here is a fallback chain: stable landmark/role anchors first, the pre-2026
   build-hashed classes second. Open/closed state is derived from measured
   width instead of the .br3 class, which only exists on the old markup. */
const SIDE_PANEL_SELECTORS = [
  'div[role="complementary"][aria-label="Side panel"]',
  'div[aria-label="Side panel"]',
];
const ADDONS_FRAME_SELECTORS = ['.buW', 'div.aUx'];

// The collapsed rail is ~56px; an open panel is ~300px+. The add-ons content
// frame (.buW) is 0 when closed, so one threshold covers both anchors.
const isSidePanelOpen = (el) => el.getBoundingClientRect().width > 100;

/**
 * Handles side panel interactions
 */
const sidePanelHandler = () => {
  const sidePanel = queryFirst(...SIDE_PANEL_SELECTORS);
  if (!sidePanel) return;

  // Calendar/Keep/Tasks buttons; exclude the "+" get-add-ons button. Old
  // markup exposes them via build-hashed classes, new markup via roles.
  let sidePanelBtns = sidePanel.querySelectorAll('.bse-bvF-I.aT5-aOt-I:not(#qJTzr)');
  if (!sidePanelBtns.length) {
    sidePanelBtns = sidePanel.querySelectorAll(
      '[role="tab"]:not([aria-label^="Get "]), [role="button"]:not([aria-label^="Get "])',
    );
  }
  const addOnsFrame = queryFirst(...ADDONS_FRAME_SELECTORS);

  // Add click handlers to side panel buttons
  for (let b = 0; b < sidePanelBtns.length; b++) {
    sidePanelBtns[b].addEventListener('click', function () {
      moveFloatersLeft();
      sidePanelMutationHandler();
    });
  }

  // Check if add-on panel is open at page load
  if (addOnsFrame) {
    if (isSidePanelOpen(addOnsFrame)) {
      moveFloatersLeft();
    } else {
      moveFloatersRight();
    }
    sidePanelMutationHandler();
  }
};

/** The one observer of the add-ons panel's width (sidePanelMutationHandler) */
let sidePanelResizeObserver = null;

/**
 * Watches the add-ons panel's width. Runs on every side-panel click, so it
 * keeps a single observer and just points it at the current panel element.
 */
const sidePanelMutationHandler = () => {
  waitForElement(ADDONS_FRAME_SELECTORS.join(', '), () => {
    const addOnsPanel = queryFirst(...ADDONS_FRAME_SELECTORS);
    if (!addOnsPanel) return;

    if (!sidePanelResizeObserver) {
      sidePanelResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 100) {
            moveFloatersLeft();
          } else {
            moveFloatersRight();
          }
        }
      });
    } else {
      sidePanelResizeObserver.disconnect();
    }
    sidePanelResizeObserver.observe(addOnsPanel);
  });
};

/**
 * Fetch brand logo - tries BIMI first, then favicon as fallback
 * @param {string} domain - Domain name
 * @returns {Promise<string|null>} Logo URL or null if failed
 */
const fetchBrandLogo = async (domain) => {
  // Check cache first
  if (avatarCache.has(domain)) {
    return avatarCache.get(domain);
  }

  // Skip known problematic domains
  if (SKIP_DOMAINS.has(domain) || SKIP_DOMAINS.has(getMainDomain(domain))) {
    return null;
  }

  // Use the exact domain from the email (don't strip subdomains)
  const emailDomain = domain;

  // Try BIMI/VMC logo from DNS TXT records - highest quality
  try {
    // Query DNS for BIMI TXT record using default selector
    const bimiSelector = 'default._bimi';
    const bimiRecord = `${bimiSelector}.${emailDomain}`;

    // Use multiple DNS-over-HTTPS services for better compatibility
    const dnsServices = [
      `https://dns.google/resolve?name=${bimiRecord}&type=TXT`,
      `https://cloudflare-dns.com/dns-query?name=${bimiRecord}&type=TXT`,
      `https://doh.pub/dns-query?name=${bimiRecord}&type=TXT`,
    ];

    // Try each DNS service until one works
    for (const dnsUrl of dnsServices) {
      try {
        const response = await fetch(dnsUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/dns-json',
            'User-Agent': navigator.userAgent,
          },
        });

        if (response.ok) {
          const dnsData = await response.json();
          if (dnsData.Answer && dnsData.Answer.length > 0) {
            // Parse the BIMI TXT record
            const txtRecord = dnsData.Answer[0].data.replace(/"/g, '');

            // Parse for logo URL (l= parameter)
            const logoMatch = txtRecord.match(/l=([^\s;]+)/);
            if (logoMatch) {
              const logoUrl = logoMatch[1];

              // Test if the logo loads
              const result = await testImageUrl(logoUrl);
              if (result) {
                avatarCache.set(domain, result);
                return result;
              }
            }
          }
          break; // Found working service, exit loop
        }
      } catch {
        // Try next service
        continue;
      }
    }
  } catch {
    // Silently handle errors
  }

  // No BIMI logo available - fall back to letter avatar
  return null;
};

/**
 * Creates a web avatar element (photo, brand logo, or site icon)
 * @param {Object} avatar - {url, source} from resolveAvatar
 * @param {string} name - Name for alt text
 * @returns {Element} Avatar element
 */
const createWebAvatar = ({ url, source }, name) => {
  const avatarElement = document.createElement('img');
  avatarElement.className = `${CSS_CLASSES.AVATAR} ${CSS_CLASSES.WEB_AVATAR}`;
  avatarElement.dataset.source = source;
  avatarElement.src = url;
  avatarElement.alt = name;
  avatarElement.title = name;
  avatarElement.style.objectFit = 'cover';
  return avatarElement;
};

/**
 * Replaces a letter (or earlier web) avatar with a web avatar
 * @param {Element} targetElement - The avatar wrapper element
 * @param {Object} avatar - {url, source} from resolveAvatar
 * @param {string} name - Name for alt text
 */
const replaceAvatarWithWeb = (targetElement, avatar, name) => {
  // Remove existing avatar
  const existingAvatar = targetElement.querySelector(`.${CSS_CLASSES.AVATAR}`);
  if (existingAvatar) {
    existingAvatar.remove();
  }

  // Create and add web avatar
  const webAvatar = createWebAvatar(avatar, name);
  targetElement.appendChild(webAvatar);
};
