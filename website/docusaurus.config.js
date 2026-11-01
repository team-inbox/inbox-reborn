// The online manual: https://team-inbox.github.io/inbox-reborn/
// Built by .github/workflows/manual.yml on every push to master.

const { themes } = require('prism-react-renderer');

const REPO = 'https://github.com/team-inbox/inbox-reborn';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Inbox Reborn',
  tagline: 'Google Inbox, back in Gmail — the manual',
  favicon: 'img/favicon.png',

  url: 'https://team-inbox.github.io',
  baseUrl: '/inbox-reborn/',
  organizationName: 'team-inbox',
  projectName: 'inbox-reborn',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          // No "Edit this page" links: the manual is read-only for visitors
          showLastUpdateTime: false,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/inbox-light.png',
      colorMode: { respectPrefersColorScheme: true },
      navbar: {
        title: 'Inbox Reborn',
        logo: { alt: 'Inbox Reborn', src: 'img/logo.png' },
        items: [
          { to: '/', label: 'Manual', position: 'left', activeBaseRegex: '^/inbox-reborn/' },
          {
            href: 'https://chrome.google.com/webstore/detail/inbox-reborn-theme-for-gm/bkphmihkdbdgedlaflnkhnmnmibffomf',
            label: 'Chrome Web Store',
            position: 'right',
          },
          {
            href: 'https://addons.mozilla.org/firefox/addon/inbox-reborn-theme-gmail/',
            label: 'Firefox Add-ons',
            position: 'right',
          },
          { href: REPO, label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Manual',
            items: [
              { label: 'Getting started', to: '/getting-started' },
              { label: 'Bundles', to: '/bundles/how-bundles-work' },
              { label: 'Settings', to: '/settings' },
              { label: 'Troubleshooting', to: '/troubleshooting' },
            ],
          },
          {
            title: 'Project',
            items: [
              { label: 'Report a problem', href: `${REPO}/issues` },
              { label: 'Changelog', href: `${REPO}/blob/master/CHANGELOG.md` },
              { label: 'Privacy policy', href: `${REPO}/blob/master/PRIVACY.md` },
            ],
          },
        ],
        copyright: `Inbox Reborn is an open-source project and is not affiliated with Google. Gmail™ and Google Inbox™ are trademarks of Google LLC.`,
      },
      prism: { theme: themes.github, darkTheme: themes.dracula },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    }),
};

module.exports = config;
