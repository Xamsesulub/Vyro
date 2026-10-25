import ExpoModulesCore
import WatchConnectivity
import UIKit

public final class VyroWatchAppDelegate: ExpoAppDelegateSubscriber {
  public func application(_ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    WatchBridge.shared.start()
    return true
  }
}

public final class VyroWatchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VyroWatch")
    Events("change")
    OnCreate { [weak self] in
      DispatchQueue.main.async {
        WatchBridge.shared.changed = { [weak self] in self?.sendEvent("change", [:]) }
        WatchBridge.shared.start()
      }
    }
    OnDestroy { DispatchQueue.main.async { WatchBridge.shared.changed = nil } }
    AsyncFunction("setOwner") { (owner: String) in try WatchBridge.shared.setOwner(owner) }.runOnQueue(.main)
    AsyncFunction("status") { WatchBridge.shared.status() }.runOnQueue(.main)
    AsyncFunction("pending") { (owner: String) in try WatchBridge.shared.pending(owner) }
    AsyncFunction("acknowledge") { (id: String, owner: String) in
      try WatchBridge.shared.acknowledge(id: id, owner: owner)
    }.runOnQueue(.main)
  }
}

// Receives while JS is suspended too. Never acknowledge until JS has persisted
// the validated workout and its deduplication receipt in encrypted storage.
private final class WatchBridge: NSObject, WCSessionDelegate {
  static let shared = WatchBridge()
  var changed: (() -> Void)?
  private let disk = DispatchQueue(label: "app.vyro.watch.inbox")
  private var activated = false
  private let ownerKey = "vyro.watch.owner"
  private var lastError: Error?

  func start() {
    guard WCSession.isSupported(), !activated else { return }
    activated = true
    WCSession.default.delegate = self
    WCSession.default.activate()
  }
  private func notify() { DispatchQueue.main.async { self.changed?() } }
  private func identifier(_ value: String) throws -> String {
    guard let id = UUID(uuidString: value) else { throw failure("Ugyldig klokkeøkt.") }
    return id.uuidString.lowercased()
  }
  private func failure(_ message: String) -> NSError {
    NSError(domain: "VyroWatch", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
  private func directory() throws -> URL {
    var url = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
      appropriateFor: nil, create: true).appendingPathComponent("VyroWatchInbox", isDirectory: true)
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
    var values = URLResourceValues(); values.isExcludedFromBackup = true
    try url.setResourceValues(values)
    return url
  }
  private func file(id: String, owner: String) throws -> URL {
    try directory().appendingPathComponent("\(identifier(owner))-\(identifier(id)).json")
  }
  func setOwner(_ owner: String) throws {
    guard WCSession.isSupported() else { return }
    if !owner.isEmpty { _ = try identifier(owner) }
    let previous = UserDefaults.standard.string(forKey: ownerKey) ?? ""
    UserDefaults.standard.set(owner, forKey: ownerKey)
    start()
    if previous != owner || WCSession.default.applicationContext["ownerId"] as? String != owner {
      try publishOwner()
    }
  }
  private func publishOwner() throws {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
    try WCSession.default.updateApplicationContext([
      "version": 1, "ownerId": UserDefaults.standard.string(forKey: ownerKey) ?? ""
    ])
  }
  func status() -> [String: Bool] {
    guard WCSession.isSupported() else { return ["paired": false, "installed": false, "reachable": false] }
    let session = WCSession.default
    return ["paired": session.isPaired, "installed": session.isWatchAppInstalled, "reachable": session.isReachable]
  }
  func pending(_ owner: String) throws -> [[String: Any]] {
    let prefix = try identifier(owner) + "-"
    return try disk.sync {
      if let error = lastError { lastError = nil; throw error }
      return try FileManager.default.contentsOfDirectory(at: directory(), includingPropertiesForKeys: nil)
        .filter { $0.lastPathComponent.hasPrefix(prefix) && $0.pathExtension == "json" }
        .sorted { $0.lastPathComponent < $1.lastPathComponent }.prefix(20).map {
          guard let value = try JSONSerialization.jsonObject(with: Data(contentsOf: $0)) as? [String: Any] else {
            throw failure("Kunne ikke lese klokkeøkten. Kopien på klokken er beholdt.")
          }
          return value
        }
    }
  }
  func acknowledge(id: String, owner: String) throws {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
      throw failure("Klokkeforbindelsen starter. Prøv synkronisering igjen.")
    }
    let id = try identifier(id), owner = try identifier(owner)
    WCSession.default.transferUserInfo(["kind": "stored", "id": id, "ownerId": owner])
    try disk.sync {
      let url = try file(id: id, owner: owner)
      if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
  }
  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    // WCSession deletes this temporary URL when the callback returns.
    disk.sync {
      do {
        let size = try file.fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard size > 0 && size <= 4_000_000 else { throw failure("Klokkeøkten er for stor til å leses.") }
        let data = try Data(contentsOf: file.fileURL)
        guard let value = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let owner = value["ownerId"] as? String, let id = value["id"] as? String else {
          throw failure("Klokkeøkten har ugyldig format.")
        }
        let destination = try self.file(id: id, owner: owner)
        let count = try FileManager.default.contentsOfDirectory(at: directory(), includingPropertiesForKeys: nil).count
        guard count < 100 || FileManager.default.fileExists(atPath: destination.path) else {
          throw failure("Åpne VYRO og synkroniser før flere klokkeøkter kan overføres.")
        }
        try data.write(to: destination, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
      } catch { lastError = error }
    }
    notify()
  }
  func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
    DispatchQueue.main.async { try? self.publishOwner(); self.changed?() }
  }
  func sessionReachabilityDidChange(_ session: WCSession) { notify() }
  func sessionWatchStateDidChange(_ session: WCSession) { notify() }
  func sessionDidBecomeInactive(_ session: WCSession) { notify() }
  func sessionDidDeactivate(_ session: WCSession) { session.activate(); notify() }
}
