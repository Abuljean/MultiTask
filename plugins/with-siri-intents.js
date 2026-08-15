// Compiles SiriIntents.swift INTO THE MAIN APP TARGET. App Shortcuts only
// work when Xcode's appintentsmetadataprocessor finds the intents in the
// app binary itself — inside the MultitaskNative pod they compiled fine but
// produced no metadata, so Siri answered "install the app from the App
// Store" (developer report 2026-08-11). The source of truth stays in
// modules/multitask-native/appintents/ (OUTSIDE the pod's ios/ source glob);
// prebuild copies it into the generated project and registers it with the
// target.
const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSiriIntents(config) {
  return withXcodeProject(config, (config) => {
    const projectName = config.modRequest.projectName;
    const source = path.join(
      config.modRequest.projectRoot,
      'modules',
      'multitask-native',
      'appintents',
      'SiriIntents.swift'
    );
    const destination = path.join(config.modRequest.platformProjectRoot, projectName, 'SiriIntents.swift');
    fs.copyFileSync(source, destination);
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${projectName}/SiriIntents.swift`,
      groupName: projectName,
      project: config.modResults,
    });
    return config;
  });
};
