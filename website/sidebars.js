/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  manual: [
    'index',
    'getting-started',
    'the-inbox',
    {
      type: 'category',
      label: 'Bundles',
      collapsed: false,
      items: [
        'bundles/how-bundles-work',
        'bundles/bundled-and-unbundled',
        'bundles/gmail-categories',
        'bundles/rules-and-custom-bundles',
      ],
    },
    'speed-dial',
    'settings',
    'privacy',
    'troubleshooting',
  ],
};

module.exports = sidebars;
