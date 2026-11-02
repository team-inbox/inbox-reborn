// Row hover actions: Done and the reminder buttons
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// ROW HOVER ACTIONS
// =============================================================================

const ROW_MORE_CLASS = 'inbox-reborn-more';

/**
 * Opens Gmail's right-click menu for an email row, at the given point
 * @param {Element} row - The email row (tr.zA)
 * @param {number} x - Client x to open the menu at
 * @param {number} y - Client y to open the menu at
 */
const openRowContextMenu = (row, x, y) => {
  row.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
      buttons: 2,
      clientX: x,
      clientY: y,
    }),
  );
};

/**
 * Adds a More (⋮) button to a row's hover actions, after Done, that opens
 * the same menu as right-clicking the email. Gmail builds the hover actions
 * when a row is first hovered, so this runs on hover.
 * @param {Element} row - The email row (tr.zA)
 */
const addRowMoreButton = (row) => {
  const actions = row.querySelector('ul.bqY');
  if (!actions || actions.querySelector(`.${ROW_MORE_CLASS}`)) return;

  const more = createEl('li', `bqX ${ROW_MORE_CLASS}`, {
    role: 'button',
    'aria-label': 'More',
    'data-tooltip': 'More',
  });

  // Keep the row from opening the email (Gmail acts on mousedown and click)
  ['mousedown', 'mouseup', 'dblclick'].forEach((type) =>
    more.addEventListener(type, (e) => e.stopPropagation()),
  );
  more.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = more.getBoundingClientRect();
    openRowContextMenu(row, rect.left + rect.width / 2, rect.bottom);
  });

  actions.append(more);
};

/**
 * Puts the pin one step in front of the row's first hover action, so the
 * row reads Pin, Snooze, Trash, Done, More. Measured rather than fixed
 * because some views (Trash, Spam) show other actions. The pin cell is
 * placed from the row's right edge (style.css "PIN ICON STYLING").
 * @param {Element} row - The hovered email row (tr.zA)
 */
const positionRowPin = (row) => {
  const actions = [...row.querySelectorAll('ul.bqY > li')].filter(
    (li) => li.getClientRects().length,
  );
  if (!actions.length) return;
  const firstLeft = Math.min(...actions.map((li) => li.getBoundingClientRect().left));
  // One 40px step left of the first action's center (it's 20px wide); the
  // pin's icon sits 22px in from the right of its cell
  const right = `${Math.round(row.getBoundingClientRect().right - firstLeft + 8)}px`;
  if (row.style.getPropertyValue('--inbox-reborn-pin-right') !== right) {
    row.style.setProperty('--inbox-reborn-pin-right', right);
  }
};

/**
 * Clears hover actions Gmail left showing. Opening Snooze from a row marks
 * the row (buL) and the button (bz5) so the actions stay up while the picker
 * is open, but dismissing the picker by clicking elsewhere never clears
 * them - the row kept its actions, with Snooze pressed, until a reload.
 * Only runs while no Gmail menu is open, so an open picker keeps its row.
 */
const clearStaleRowActions = () => {
  const stale = document.querySelectorAll('tr.zA.buL, tr.zA li.bqX.bz5');
  if (!stale.length) return;
  const menuOpen = [...document.querySelectorAll('[role=menu]')].some(
    (menu) => menu.getClientRects().length,
  );
  if (menuOpen) return;
  stale.forEach((el) => el.classList.remove('buL', 'bz5'));
};

/**
 * Adds the More button to each email row as it's hovered, and moves its pin
 * in front of the hover actions
 */
const watchRowHoverActions = () => {
  document.addEventListener('mouseover', (e) => {
    clearStaleRowActions();
    const row = e.target.closest?.('tr.zA');
    if (!row || row.classList.contains(CSS_CLASSES.BUNDLE_WRAPPER)) return;
    addRowMoreButton(row);
    // Gmail may only build the hover actions in response to this hover
    requestAnimationFrame(() => {
      addRowMoreButton(row);
      positionRowPin(row);
    });
  });
};
