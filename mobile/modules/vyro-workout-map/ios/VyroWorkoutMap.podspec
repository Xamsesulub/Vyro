Pod::Spec.new do |s|
  s.name = 'VyroWorkoutMap'
  s.version = '1.0.0'
  s.summary = 'Private MapKit snapshots for an active VYRO workout'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'VYRO'
  s.homepage = 'https://expo.dev'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'MapKit', 'ActivityKit'
  s.source_files = '**/*.swift'
end
