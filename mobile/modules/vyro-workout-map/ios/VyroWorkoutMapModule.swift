import ExpoModulesCore
import MapKit
import ActivityKit
import UIKit

// Generates actual Apple map images without mounting another MapView or
// collecting location. Only validated points from the current private workout
// enter this module. Files stay in this app's shared WidgetKit container.
public final class VyroWorkoutMapModule: Module {
  private var snapshotter: MKMapSnapshotter?
  private var pending: Promise?
  private var generation = 0
  private var fileSlot = 0

  public func definition() -> ModuleDefinition {
    Name("VyroWorkoutMap")

    Function("activitiesEnabled") {
      ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("snapshot") { (segments: [[[Double]]], promise: Promise) in
      self.makeSnapshot(segments, promise: promise)
    }.runOnQueue(.main)

    AsyncFunction("clear") {
      self.cancelSnapshot()
      let directory = try self.directory()
      // The path is a fixed, dedicated subdirectory, never supplied by JS.
      for file in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) {
        try FileManager.default.removeItem(at: file)
      }
    }.runOnQueue(.main)
  }

  private func directory() throws -> URL {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String,
          let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
      throw NSError(domain: "VyroWorkoutMap", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing widget app group"])
    }
    var folder = root.appendingPathComponent("vyro-workout-maps", isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try folder.setResourceValues(values)
    return folder
  }

  private func cancelSnapshot() {
    generation += 1
    snapshotter?.cancel()
    snapshotter = nil
    pending?.resolve(nil as String?)
    pending = nil
  }

  private func makeSnapshot(_ input: [[[Double]]], promise: Promise) {
    cancelSnapshot()
    let count = input.reduce(0) { $0 + $1.count }
    guard count > 0 && count <= 240 else {
      promise.resolve(nil as String?)
      return
    }
    let segments = input.map { segment in
      segment.compactMap { pair -> CLLocationCoordinate2D? in
        guard pair.count == 2, pair[0].isFinite, pair[1].isFinite,
              abs(pair[0]) <= 85, abs(pair[1]) <= 180 else { return nil }
        return CLLocationCoordinate2D(latitude: pair[0], longitude: pair[1])
      }
    }
    let coordinates = segments.flatMap { $0 }
    guard let last = coordinates.last else {
      promise.resolve(nil as String?)
      return
    }
    var bounds = MKMapRect.null
    for coordinate in coordinates {
      let point = MKMapPoint(coordinate)
      bounds = bounds.union(MKMapRect(x: point.x, y: point.y, width: 1, height: 1))
    }
    let minimum = 500 * MKMapPointsPerMeterAtLatitude(last.latitude)
    let height = max(bounds.size.height * 1.65, minimum / 2.6)
    let width = max(bounds.size.width * 1.4, height * 330 / 112, minimum)
    let region = MKMapRect(x: bounds.midX - width / 2, y: bounds.midY - width * 112 / 330 / 2,
      width: width, height: width * 112 / 330)
    let options = MKMapSnapshotter.Options()
    options.region = MKCoordinateRegion(region)
    options.size = CGSize(width: 330, height: 112)
    options.scale = 2
    options.mapType = .standard
    options.traitCollection = UITraitCollection(userInterfaceStyle: .light)
    options.pointOfInterestFilter = .excludingAll
    let renderer = MKMapSnapshotter(options: options)
    let token = generation
    snapshotter = renderer
    pending = promise

    // Map tiles must never delay workout controls or a later privacy cleanup.
    DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
      guard let self, self.generation == token, self.pending != nil else { return }
      self.cancelSnapshot()
    }
    renderer.start(with: .main) { [weak self] snapshot, _ in
      guard let self, self.generation == token, let promise = self.pending else { return }
      self.pending = nil
      self.snapshotter = nil
      guard let snapshot else {
        promise.resolve(nil as String?)
        return
      }
      let format = UIGraphicsImageRendererFormat()
      format.scale = 2
      let image = UIGraphicsImageRenderer(size: options.size, format: format).image { context in
        snapshot.image.draw(at: .zero)
        let cg = context.cgContext
        // Leave Apple's attribution at the bottom unobstructed.
        cg.saveGState()
        cg.clip(to: CGRect(x: 0, y: 0, width: 330, height: 92))
        cg.setLineCap(.round)
        cg.setLineJoin(.round)
        for segment in segments where segment.count > 1 {
          let path = UIBezierPath()
          path.move(to: snapshot.point(for: segment[0]))
          for point in segment.dropFirst() { path.addLine(to: snapshot.point(for: point)) }
          UIColor.white.setStroke()
          path.lineWidth = 6
          path.stroke()
          UIColor(red: 0.21, green: 0.42, blue: 0.08, alpha: 1).setStroke()
          path.lineWidth = 3
          path.stroke()
        }
        let point = snapshot.point(for: last)
        UIColor.white.setFill()
        UIBezierPath(ovalIn: CGRect(x: point.x - 6, y: point.y - 6, width: 12, height: 12)).fill()
        UIColor.systemBlue.setFill()
        UIBezierPath(ovalIn: CGRect(x: point.x - 4, y: point.y - 4, width: 8, height: 8)).fill()
        cg.restoreGState()
      }
      do {
        // Three rotating files keep storage bounded and avoid overwriting the
        // image currently presented by ActivityKit during the next update.
        self.fileSlot = (self.fileSlot + 1) % 3
        let file = try self.directory().appendingPathComponent("map-\(self.fileSlot).png")
        guard let data = image.pngData() else {
          promise.resolve(nil as String?)
          return
        }
        try data.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        promise.resolve(file.absoluteString)
      } catch {
        promise.resolve(nil as String?)
      }
    }
  }
}
