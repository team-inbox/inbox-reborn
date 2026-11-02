// Dark mode: applies the stored theme at document_start and follows changes
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// DARK MODE SYNCHRONIZATION
// =============================================================================
/**
 * Handles dark mode synchronization with Chrome storage
 * Applies stored settings on page load and listens for changes
 */
(function initDarkMode() {
  let darkEnabled = false;

  // Google's own popups - the apps launcher ("Your favorites") and other
  // OneGoogle widgets - are ogs.google.com iframes our stylesheet can't reach,
  // and they follow Gmail's own (light) theme. Their URL takes dm=1 for
  // Google's native dark rendering, so set it to match our dark mode.
  //
  // dm=1 alone isn't enough on the widget's first load: Gmail hands the
  // widget its (light) theme during that load's setup, overriding the URL.
  // Reloading the frame right after that first load keeps dm=1, and it sticks
  // from then on. Until the reload lands, the frame carries a pending
  // attribute that style.css hides, so the light first load never shows.
  const WIDGET_PENDING_ATTR = 'data-inbox-reborn-dark-pending';
  // Never leave a widget hidden if a load event goes missing
  const WIDGET_REVEAL_FALLBACK_MS = 5000;
  const reloadedWidgets = new WeakSet();

  const reloadWidgetAfterFirstLoad = (frame) => {
    if (reloadedWidgets.has(frame)) return;
    reloadedWidgets.add(frame);
    frame.setAttribute(WIDGET_PENDING_ATTR, '');
    const fallback = setTimeout(
      () => frame.removeAttribute(WIDGET_PENDING_ATTR),
      WIDGET_REVEAL_FALLBACK_MS,
    );
    const reveal = () => {
      clearTimeout(fallback);
      frame.removeAttribute(WIDGET_PENDING_ATTR);
    };
    frame.addEventListener(
      'load',
      () => {
        if (!darkEnabled || !frame.isConnected) {
          reveal();
          return;
        }
        frame.addEventListener('load', reveal, { once: true });
        const { src } = frame;
        frame.src = src; // re-assigning src reloads the frame
      },
      { once: true },
    );
  };

  const isGoogleWidget = (frame) => {
    try {
      const url = new URL(frame.src);
      return url.hostname === 'ogs.google.com' && url.pathname.includes('/widget/');
    } catch {
      return false;
    }
  };

  const syncGoogleWidget = (frame) => {
    if (!isGoogleWidget(frame)) return;
    if (darkEnabled) reloadWidgetAfterFirstLoad(frame);
    const url = new URL(frame.src);
    if ((url.searchParams.get('dm') === '1') === darkEnabled) return;
    if (darkEnabled) {
      url.searchParams.set('dm', '1');
    } else {
      url.searchParams.delete('dm');
    }
    frame.src = url.toString();
  };

  const syncAllGoogleWidgets = () => {
    for (const frame of document.getElementsByTagName('iframe')) syncGoogleWidget(frame);
  };

  const watchGoogleWidgets = () => {
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if (mutation.target.tagName === 'IFRAME') syncGoogleWidget(mutation.target);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName === 'IFRAME') {
            syncGoogleWidget(node);
          } else {
            for (const frame of node.getElementsByTagName('iframe')) syncGoogleWidget(frame);
          }
        }
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  };

  // The content script runs at document_start, so <body> may not exist yet
  // when the storage callback fires - defer applying the class until it does
  const applyDarkMode = (enabled) => {
    darkEnabled = enabled;
    const apply = () => {
      document.body.classList.toggle('dark-mode', enabled);
      syncAllGoogleWidgets();
    };
    if (document.body) {
      apply();
    } else {
      document.addEventListener('DOMContentLoaded', apply, { once: true });
    }
  };

  if (document.body) {
    watchGoogleWidgets();
  } else {
    document.addEventListener('DOMContentLoaded', watchGoogleWidgets, { once: true });
  }

  // Apply stored dark-mode setting on page load
  chrome.storage?.local.get('options', ({ options }) => {
    applyDarkMode(!!options && options.darkMode === 'enabled');
  });

  // Listen for changes to options and toggle class dynamically
  chrome.storage?.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.options && instanceActive()) {
      applyDarkMode(changes.options.newValue?.darkMode === 'enabled');
    }
  });
})();
