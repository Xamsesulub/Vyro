import Foundation

struct WatchPoint: Codable {
  let latitude: Double
  let longitude: Double
  let timestamp: Double
  let accuracy: Double
  var breakBefore: Bool
}
struct WatchWorkout: Codable {
  var version = 1
  let id: String
  let ownerId: String
  let sport: String
  let startedAt: Double
  var endedAt: Double
  var activeSeconds: Double
  var points: [WatchPoint]
}

enum WorkoutFiles {
  static func folder(_ name: String = "") throws -> URL {
    var url = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
      appropriateFor: nil, create: true).appendingPathComponent("VYRO", isDirectory: true)
    if !name.isEmpty { url.appendPathComponent(name, isDirectory: true) }
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
    var values = URLResourceValues(); values.isExcludedFromBackup = true
    try url.setResourceValues(values)
    return url
  }
  static func write(_ workout: WatchWorkout, to url: URL) throws {
    try JSONEncoder().encode(workout).write(to: url,
      options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
  static func checkpoint(_ workout: WatchWorkout) throws { try write(workout, to: folder().appendingPathComponent("draft.json")) }
  static func draft() throws -> WatchWorkout? {
    let url = try folder().appendingPathComponent("draft.json")
    guard FileManager.default.fileExists(atPath: url.path) else { return nil }
    return try JSONDecoder().decode(WatchWorkout.self, from: Data(contentsOf: url))
  }
  static func clearDraft() throws {
    let url = try folder().appendingPathComponent("draft.json")
    if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
  }
  static func outbox() throws -> [URL] {
    try FileManager.default.contentsOfDirectory(at: folder("outbox"), includingPropertiesForKeys: nil)
      .filter { $0.pathExtension == "json" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
  }
  static func enqueue(_ workout: WatchWorkout) throws {
    let url = try folder("outbox").appendingPathComponent(workout.id + ".json")
    guard try outbox().count < 50 || FileManager.default.fileExists(atPath: url.path) else {
      throw NSError(domain: "VYRO", code: 1, userInfo: [NSLocalizedDescriptionKey: "Synkroniser lagrede økter med iPhone før du lagrer flere."])
    }
    // Atomically move the durable draft into the outbox on the same volume.
    // A crash leaves either a resumable draft or a completed outgoing workout.
    try checkpoint(workout)
    try FileManager.default.moveItem(at: folder().appendingPathComponent("draft.json"), to: url)
  }
  static func read(_ url: URL) throws -> WatchWorkout { try JSONDecoder().decode(WatchWorkout.self, from: Data(contentsOf: url)) }
}
