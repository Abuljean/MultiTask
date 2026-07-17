/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'widgets',
  displayName: 'Multitask',
  // Appended to the main bundle id -> com.abuljean.multitask.widgets
  bundleIdentifier: '.widgets',
  // iOS 17: interactive widgets (Button(intent:)) + containerBackground.
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'AppIntents'],
  entitlements: {
    'com.apple.security.application-groups': ['group.com.abuljean.multitask'],
  },
};
