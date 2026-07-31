Pod::Spec.new do |s|
  s.name           = 'MultitaskNative'
  s.version        = '1.0.0'
  s.summary        = 'Local native pieces: Spotlight indexing, Siri App Shortcuts'
  s.description    = 'Multitask local Expo module — CoreSpotlight task indexing, App Intents for Siri, Spotlight deep-link handling.'
  s.author         = 'Multitask'
  s.homepage       = 'https://github.com/Abuljean/MultiTask'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
end
