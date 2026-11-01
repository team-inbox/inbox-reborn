// Runs in <head>, before the first paint: applies the dark theme the last
// visit saved, so the popup doesn't flash light while the stored options load
// (script.js keeps this copy in step with the Dark mode switch).
try {
  if (localStorage.getItem('inboxReborn.darkMode') === 'enabled') {
    document.documentElement.classList.add('dark-mode');
  }
} catch {
  // Storage blocked - script.js applies the theme once options load
}
