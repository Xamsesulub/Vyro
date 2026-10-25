import Foundation
import Combine
import WatchConnectivity

final class PhoneConnection: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = PhoneConnection()
  @Published private(set) var ownerId = UserDefaults.standard.string(forKey: "vyro.owner") ?? ""
  @Published private(set) var pending = 0
  @Published var message = ""
  var ownerChanged: (() -> Void)?

  override private init() {
    super.init()
    WCSession.default.delegate = self
    WCSession.default.activate()
    refresh()
  }
  func refresh() {
    do {
      pending = try WorkoutFiles.outbox().filter { try WorkoutFiles.read($0).ownerId == ownerId }.count
    } catch { message = "Kunne ikke lese lagrede økter. Kopiene er beholdt." }
  }
  func sendPending() {
    refresh()
    let session = WCSession.default
    guard !ownerId.isEmpty, session.activationState == .activated, session.isCompanionAppInstalled else { return }
    do {
      let transferring = Set(session.outstandingFileTransfers.compactMap { $0.file.metadata?["id"] as? String })
      for file in try WorkoutFiles.outbox() {
        let workout = try WorkoutFiles.read(file)
        guard workout.ownerId == ownerId, !transferring.contains(workout.id) else { continue }
        session.transferFile(file, metadata: ["id": workout.id, "ownerId": workout.ownerId])
      }
      message = pending > 0 ? "Åpne VYRO på iPhone for å fullføre synkroniseringen." : "Alle økter er overført."
    } catch { message = "Kunne ikke sende øktene. Kopiene er beholdt på klokken." }
  }
  private func apply(_ context: [String: Any]) {
    guard context["version"] as? Int == 1, let owner = context["ownerId"] as? String,
      owner.isEmpty || UUID(uuidString: owner) != nil else { return }
    if ownerId != owner {
      ownerId = owner
      UserDefaults.standard.set(owner, forKey: "vyro.owner")
      ownerChanged?()
    }
    sendPending()
  }
  func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
    DispatchQueue.main.async { self.apply(session.receivedApplicationContext); self.sendPending() }
  }
  func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
    DispatchQueue.main.async { self.apply(context) }
  }
  func sessionReachabilityDidChange(_ session: WCSession) { DispatchQueue.main.async { self.sendPending() } }
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    guard userInfo["kind"] as? String == "stored", let id = userInfo["id"] as? String,
      let owner = userInfo["ownerId"] as? String, let uuid = UUID(uuidString: id) else { return }
    DispatchQueue.main.async {
      do {
        let file = try WorkoutFiles.folder("outbox").appendingPathComponent(uuid.uuidString.lowercased() + ".json")
        if FileManager.default.fileExists(atPath: file.path), try WorkoutFiles.read(file).ownerId == owner {
          // Only the durable phone receipt can remove an outbox file.
          try FileManager.default.removeItem(at: file)
        }
        self.refresh()
        if self.pending == 0 { self.message = "Alle økter er overført." }
      } catch { self.message = "Kunne ikke rydde den overførte kopien. Prøv synkronisering igjen." }
    }
  }
  func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
    if error != nil { DispatchQueue.main.async { self.message = "Overføring venter. Økten er beholdt på klokken." } }
  }
}
