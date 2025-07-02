function setHeaderColorDirect() {
  const header = document.querySelector('.w-asV.bbg.aiw');
  if (!header) return;
  let hash = window.location.hash;
  if (isInBundle()) hash = '#inbox';
  else hash = hash.split('/')[0].split('?')[0];

  // Map hash/page to color
const colorMap = {
  inbox: "#4285f4",
  starred: "#f1c40f",
  snoozed: "#ef6c00",
  archive: "#0f9d58",
  sent: "#fb8c00",
  drafts: "#ffd600",
  all: "#78909c",
  spam: "#d32f2f",
  trash: "#757575",
  chat: "#00c853",
  onboarding: "#00AC47",
  calls: "#DB4437"
};
  // Default color
  let color = "#898984";
  if (hash) {
    const key = hash.replace('#', '');
    if (colorMap[key]) color = colorMap[key];
  }
  header.style.setProperty('background-color', color, 'important');
  header.setAttribute('pageTitle', hash.replace('#', ''));
}

(function persistHeaderColor() {
  let lastHash = "";
  const observer = new MutationObserver(() => setHeaderColorDirect());
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(() => {
    if (window.location.hash !== lastHash) {
      lastHash = window.location.hash;
      setHeaderColorDirect();
    }
    setHeaderColorDirect();
  }, 500);
  setHeaderColorDirect();
  window.addEventListener('hashchange', setHeaderColorDirect);
})();

// ---- Replace Gmail logo with Inbox text ----
function replaceGmailLogoWithInbox() {
  const logoImg = document.querySelector('img.gb_Pd');
  if (logoImg && !logoImg.dataset.replaced) {
    const textElem = document.createElement('span');
    textElem.textContent = 'Inbox';
    textElem.style.display = 'inline-block';
    textElem.style.fontSize = '1.375rem';           // ~22px
    textElem.style.fontWeight = '400';              // Regular Roboto
    textElem.style.color = '#fff';
    textElem.style.verticalAlign = 'middle';
    textElem.style.fontFamily = 'Roboto, Arial, sans-serif';
    textElem.style.letterSpacing = '0.01em';
    textElem.style.lineHeight = '40px';
    textElem.style.marginLeft = '4px';
    textElem.style.userSelect = 'none';
    textElem.style.textShadow = '0 1px 0 rgba(0,0,0,0.04)';

    logoImg.style.display = 'none';
    logoImg.dataset.replaced = 'true';
    logoImg.parentNode.insertBefore(textElem, logoImg.nextSibling);
  }
}
const logoObserver = new MutationObserver(replaceGmailLogoWithInbox);
logoObserver.observe(document.body, { childList: true, subtree: true });
replaceGmailLogoWithInbox();