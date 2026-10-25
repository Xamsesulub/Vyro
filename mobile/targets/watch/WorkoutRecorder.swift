import Foundation
import Combine
import HealthKit
import CoreLocation

final class WorkoutRecorder: NSObject, ObservableObject, CLLocationManagerDelegate, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
  static let shared = WorkoutRecorder()
  enum Phase { case idle, starting, running, paused, saving }
  @Published private(set) var phase: Phase = .idle
  @Published private(set) var distance = 0.0
  @Published private(set) var heartRate: Double?
  @Published private(set) var heartRateAt: Date?
  @Published var message = ""
  @Published private(set) var gpsMessage = "Venter på GPS"
  private let health = HKHealthStore()
  private let location = CLLocationManager()
  private var session: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?
  private var draft: WatchWorkout?
  private var segmentStarted: Date?
  private var breakNext = true
  private var checkpointTimer: Timer?
  private var requestedSport: String?
  private var requestingOwner: String?
  private var wantsRecording = false
  private var lastGpsAt: Date?
  private var ending = false
  @Published private(set) var recovering = false
  var canResume: Bool { !recovering && session != nil && draft?.ownerId == PhoneConnection.shared.ownerId }
  var sport: String { draft?.sport ?? "Løping" }
  var elapsed: TimeInterval {
    (draft?.activeSeconds ?? 0) + (segmentStarted.map { max(0, Date().timeIntervalSince($0)) } ?? 0)
  }
  var pace: String { distance > 0 ? formatTime(elapsed / (distance / 1000)) : "—" }
  func formatTime(_ value: TimeInterval) -> String {
    let seconds = Int(max(0, value))
    return seconds >= 3600 ? String(format: "%d:%02d:%02d", seconds / 3600, seconds / 60 % 60, seconds % 60)
      : String(format: "%02d:%02d", seconds / 60, seconds % 60)
  }

  override private init() {
    super.init()
    location.delegate = self
    location.desiredAccuracy = kCLLocationAccuracyBest
    location.distanceFilter = 3
    location.activityType = .fitness
    PhoneConnection.shared.ownerChanged = { [weak self] in
      guard let self, let draft = self.draft, draft.ownerId != PhoneConnection.shared.ownerId else { return }
      self.pause()
      self.message = "Kontoen er endret. Økten tilhører kontoen den ble startet med."
    }
    do {
      if let saved = try WorkoutFiles.draft() {
        draft = saved
        phase = .paused
        distance = routeDistance(saved.points)
        message = "Økten er gjenopprettet og pauset."
        recover()
      }
    } catch {
      phase = .paused
      message = "Kunne ikke lese økten. Behold appen installert og prøv igjen etter omstart."
    }
  }

  func recover() {
    guard !recovering, session == nil else { return }
    recovering = true
    health.recoverActiveWorkoutSession { recovered, error in
      DispatchQueue.main.async {
        self.recovering = false
        guard let recovered else {
          if self.draft != nil { self.message = "Økten er gjenopprettet. Lagre den før du starter en ny tur." }
          return
        }
        guard self.draft != nil else { recovered.end(); return }
        self.session = recovered
        self.builder = recovered.associatedWorkoutBuilder()
        recovered.delegate = self
        self.builder?.delegate = self
        // Recovery always pauses; never silently restart GPS after a crash.
        let now = Date()
        if var restored = self.draft {
          restored.activeSeconds = max(restored.activeSeconds, self.builder?.elapsedTime(at: now) ?? 0)
          restored.endedAt = now.timeIntervalSince1970 * 1000
          self.draft = restored
        }
        self.wantsRecording = false
        recovered.pause()
        self.startCheckpoints()
        self.phase = .paused
        self.checkpoint()
      }
    }
  }

  func start(sport: String) {
    guard phase == .idle, !recovering else { return }
    guard HKHealthStore.isHealthDataAvailable() else { message = "Helse er ikke tilgjengelig på denne klokken."; return }
    let owner = PhoneConnection.shared.ownerId
    guard UUID(uuidString: owner) != nil else { message = "Åpne VYRO på iPhone og koble til kontoen under Innstillinger → Apple Watch."; return }
    phase = .starting; message = ""; requestedSport = sport; requestingOwner = owner
    if location.authorizationStatus == .notDetermined { location.requestWhenInUseAuthorization() }
    else { authorizeAndStart() }
  }
  private func authorizeAndStart() {
    guard let sport = requestedSport, let owner = requestingOwner else { return }
    guard location.authorizationStatus == .authorizedWhenInUse || location.authorizationStatus == .authorizedAlways else {
      requestedSport = nil; requestingOwner = nil; phase = .idle
      message = "Gi VYRO tilgang til posisjon i Innstillinger på klokken for å ta opp en GPS-tur."
      return
    }
    requestedSport = nil; requestingOwner = nil
    let workout = HKObjectType.workoutType()
    let heart = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    let energy = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!
    let travel = HKQuantityType.quantityType(forIdentifier: sport == "Sykling" ? .distanceCycling : .distanceWalkingRunning)!
    health.requestAuthorization(toShare: [workout, energy, travel], read: [heart]) { success, error in
      DispatchQueue.main.async {
        guard success, self.health.authorizationStatus(for: workout) == .sharingAuthorized else {
          self.phase = .idle; self.message = "Gi VYRO tilgang til treningsøkter i Helse for å starte."; return
        }
        guard PhoneConnection.shared.ownerId == owner else {
          self.phase = .idle; self.message = "Kontoen er endret. Prøv Start igjen."; return
        }
        self.begin(sport: sport, owner: owner)
      }
    }
  }
  private func begin(sport: String, owner: String) {
    let configuration = HKWorkoutConfiguration()
    configuration.activityType = sport == "Sykling" ? .cycling : sport == "Gange" ? .walking : sport == "Fottur" ? .hiking : .running
    configuration.locationType = .outdoor
    do {
      let newSession = try HKWorkoutSession(healthStore: health, configuration: configuration)
      let newBuilder = newSession.associatedWorkoutBuilder()
      let now = Date()
      draft = WatchWorkout(id: UUID().uuidString.lowercased(), ownerId: owner, sport: sport,
        startedAt: now.timeIntervalSince1970 * 1000, endedAt: now.timeIntervalSince1970 * 1000, activeSeconds: 0, points: [])
      try WorkoutFiles.checkpoint(draft!)
      session = newSession; builder = newBuilder
      newSession.delegate = self; newBuilder.delegate = self
      newBuilder.dataSource = HKLiveWorkoutDataSource(healthStore: health, workoutConfiguration: configuration)
      distance = 0; heartRate = nil; heartRateAt = nil; breakNext = true; gpsMessage = "Venter på GPS"; ending = false
      wantsRecording = true
      newSession.startActivity(with: now)
      newBuilder.beginCollection(withStart: now) { success, error in
        DispatchQueue.main.async {
          guard self.session === newSession else { return }
          if !success {
            self.pause(); self.message = "Helse kunne ikke starte opptaket. Avslutt og prøv igjen."
          }
        }
      }
      startCheckpoints()
    } catch {
      phase = .idle; draft = nil; session = nil; builder = nil
      message = "Kunne ikke starte opptaket. Sjekk tillatelser og ledig lagringsplass."
    }
  }
  private func startCheckpoints() {
    checkpointTimer?.invalidate()
    checkpointTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
      guard let self, self.phase == .running else { return }
      self.gpsMessage = self.lastGpsAt.map { Date().timeIntervalSince($0) < 30 } == true ? "GPS aktiv" : "Venter på GPS"
      if self.elapsed >= 86400 {
        self.pause(); self.message = "Økten har nådd 24 timer. Avslutt og lagre."
      } else { self.checkpoint() }
    }
  }
  func pause() {
    wantsRecording = false
    if phase == .running || phase == .starting {
      freeze()
      session?.pause()
      phase = .paused
      checkpoint()
    }
  }
  private func freeze(at date: Date = Date()) {
    let seconds = (draft?.activeSeconds ?? 0) + (segmentStarted.map { max(0, date.timeIntervalSince($0)) } ?? 0)
    draft?.activeSeconds = seconds
    draft?.endedAt = date.timeIntervalSince1970 * 1000
    segmentStarted = nil
    location.stopUpdatingLocation()
    breakNext = true
  }
  func resume() {
    guard phase == .paused, canResume else { return }
    guard location.authorizationStatus == .authorizedWhenInUse || location.authorizationStatus == .authorizedAlways else {
      message = "Gi VYRO tilgang til posisjon før du fortsetter."; return
    }
    message = ""; wantsRecording = true; phase = .starting; session?.resume()
  }
  private func checkpoint() {
    guard var value = draft else { return }
    value.activeSeconds = elapsed; value.endedAt = Date().timeIntervalSince1970 * 1000
    do { try WorkoutFiles.checkpoint(value) }
    catch {
      wantsRecording = false; freeze(); session?.pause(); phase = .paused
      message = "Lagring feilet. Økten er pauset. Frigjør plass før du fortsetter."
    }
  }
  func finish(save: Bool) {
    guard (phase == .paused || phase == .running), !ending, !recovering, let value = draft else { return }
    pause()
    var completed = value
    completed.activeSeconds = elapsed
    completed.endedAt = draft?.endedAt ?? completed.endedAt
    if save && (completed.points.count < 2 || distance <= 0 || completed.activeSeconds < 1) {
      message = "Ingen GPS-rute med bevegelse ennå. Fortsett turen, eller velg Forkast."; return
    }
    do {
      if save { try WorkoutFiles.enqueue(completed) }
      try WorkoutFiles.clearDraft()
    } catch { message = error.localizedDescription; return }
    ending = true; phase = .saving
    checkpointTimer?.invalidate(); checkpointTimer = nil
    if save { PhoneConnection.shared.sendPending() }
    guard let session, let builder else { reset(message: save ? "Økten er lagret og venter på iPhone." : "Økten er forkastet."); return }
    session.end()
    if !save { builder.discardWorkout(); reset(message: "Økten er forkastet."); return }
    builder.endCollection(withEnd: Date()) { success, error in
      guard success else {
        DispatchQueue.main.async { self.reset(message: "Økten er lagret for VYRO. Apple Helse kunne ikke lagre den.") }
        return
      }
      builder.finishWorkout { workout, error in
        DispatchQueue.main.async {
          self.reset(message: workout != nil ? "Økten er lagret. Åpne VYRO på iPhone for å synkronisere." : "Økten er lagret for VYRO. Apple Helse kunne ikke lagre den.")
        }
      }
    }
  }
  private func reset(message: String) {
    checkpointTimer?.invalidate(); checkpointTimer = nil
    location.stopUpdatingLocation(); segmentStarted = nil; draft = nil
    session = nil; builder = nil; ending = false; wantsRecording = false; distance = 0; heartRate = nil; heartRateAt = nil
    phase = .idle; self.message = message
  }
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if requestedSport != nil && manager.authorizationStatus != .notDetermined { authorizeAndStart() }
    if phase == .running && manager.authorizationStatus != .authorizedWhenInUse && manager.authorizationStatus != .authorizedAlways {
      pause(); message = "GPS-tilgangen er avslått. Økten er pauset."
    }
  }
  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    gpsMessage = "Venter på GPS. Distanse legges til når signalet er tilbake."
  }
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard phase == .running, session?.state == .running, var value = draft, let segmentStarted else { return }
    for fix in locations.sorted(by: { $0.timestamp < $1.timestamp }) {
      guard fix.horizontalAccuracy >= 0, fix.horizontalAccuracy <= 30,
        CLLocationCoordinate2DIsValid(fix.coordinate), fix.timestamp >= segmentStarted,
        fix.timestamp <= Date(), abs(fix.timestamp.timeIntervalSinceNow) <= 15 else { continue }
      lastGpsAt = fix.timestamp; gpsMessage = "GPS aktiv"
      guard value.points.count < 20000 else { draft = value; pause(); message = "Ruten er full. Avslutt og lagre økten."; return }
      var point = WatchPoint(latitude: fix.coordinate.latitude, longitude: fix.coordinate.longitude,
        timestamp: fix.timestamp.timeIntervalSince1970 * 1000, accuracy: fix.horizontalAccuracy, breakBefore: breakNext)
      if let last = value.points.last {
        let seconds = (point.timestamp - last.timestamp) / 1000
        guard seconds > 0 else { continue }
        if seconds > 30 { point.breakBefore = true }
        if !point.breakBefore {
          let step = Self.meters(last, point)
          guard step >= 3, step / seconds <= 15 else { continue }
          distance += step
        }
      }
      value.points.append(point); breakNext = false; gpsMessage = "GPS aktiv"
    }
    draft = value
  }
  private static func meters(_ a: WatchPoint, _ b: WatchPoint) -> Double {
    let rad = Double.pi / 180
    let h = pow(sin((b.latitude - a.latitude) * rad / 2), 2) + cos(a.latitude * rad) * cos(b.latitude * rad) * pow(sin((b.longitude - a.longitude) * rad / 2), 2)
    return 6371000 * 2 * asin(min(1, sqrt(h)))
  }
  private func routeDistance(_ points: [WatchPoint]) -> Double {
    zip(points, points.dropFirst()).reduce(0) { sum, pair in
      sum + (pair.1.breakBefore ? 0 : Self.meters(pair.0, pair.1))
    }
  }
  func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo state: HKWorkoutSessionState, from old: HKWorkoutSessionState, date: Date) {
    DispatchQueue.main.async {
      guard self.session === workoutSession, !self.ending else { return }
      if state == .running {
        guard self.wantsRecording, self.draft?.ownerId == PhoneConnection.shared.ownerId else { self.pause(); return }
        if self.segmentStarted == nil { self.segmentStarted = date }
        self.phase = .running; self.breakNext = true; self.location.startUpdatingLocation()
      } else if state == .paused { self.wantsRecording = false; self.freeze(at: date); self.phase = .paused; self.checkpoint() }
      else if state == .ended { self.freeze(at: date); self.phase = .paused; self.session = nil; self.message = "Opptaket er stoppet. Lagre økten eller forkast den."; self.checkpoint() }
    }
  }
  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    DispatchQueue.main.async {
      guard self.session === workoutSession, !self.ending else { return }
      self.pause(); self.message = "Opptaket ble avbrutt. Økten er beholdt; prøv å lagre."
    }
  }
  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
  func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf types: Set<HKSampleType>) {
    let heart = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    guard types.contains(heart), let quantity = workoutBuilder.statistics(for: heart)?.mostRecentQuantity() else { return }
    let bpm = quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
    DispatchQueue.main.async {
      guard self.builder === workoutBuilder, self.phase == .running, bpm.isFinite, bpm > 0 else { return }
      self.heartRate = bpm; self.heartRateAt = Date()
    }
  }
}
