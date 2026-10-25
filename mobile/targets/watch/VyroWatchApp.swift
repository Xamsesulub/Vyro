import SwiftUI
import WatchKit

final class WorkoutDelegate: NSObject, WKExtensionDelegate {
  func handleActiveWorkoutRecovery() { DispatchQueue.main.async { WorkoutRecorder.shared.recover() } }
}

@main
struct VyroWatchApp: App {
  @WKExtensionDelegateAdaptor(WorkoutDelegate.self) var delegate
  @Environment(\.scenePhase) private var scenePhase
  var body: some Scene {
    WindowGroup { WorkoutView() }
      .onChange(of: scenePhase) { phase in
        if phase == .active { PhoneConnection.shared.sendPending() }
      }
  }
}

private struct WorkoutView: View {
  @StateObject private var recorder = WorkoutRecorder.shared
  @StateObject private var phone = PhoneConnection.shared
  @State private var sport = "Løping"
  @State private var confirmEnd = false
  private let lime = Color(red: 178 / 255, green: 1, blue: 120 / 255)
  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 12) {
          if recorder.phase == .idle && !recorder.recovering {
            if phone.ownerId.isEmpty {
              Image(systemName: "applewatch").font(.largeTitle).foregroundStyle(lime)
              Text("Koble til iPhone").font(.headline)
              Text("Åpne VYRO på iPhone, logg inn og velg Innstillinger → Apple Watch.").font(.footnote)
            } else {
              Picker("Aktivitet", selection: $sport) {
                ForEach(["Løping", "Gange", "Sykling", "Fottur"], id: \.self) { Text($0).tag($0) }
              }.pickerStyle(.navigationLink)
              Button { recorder.start(sport: sport) } label: { Label("Start", systemImage: "play.fill") }
                .tint(lime).foregroundStyle(.black).buttonStyle(.borderedProminent)
              Text("Utendørs · GPS").font(.footnote).foregroundStyle(.secondary)
            }
            if phone.pending > 0 { Text("\(phone.pending) økter venter på iPhone").font(.footnote) }
            Button("Synkroniser") { phone.sendPending() }.font(.footnote)
            if !phone.message.isEmpty { Text(phone.message).font(.footnote).foregroundStyle(.secondary) }
          } else if recorder.phase == .saving || recorder.phase == .starting || recorder.recovering {
            ProgressView(recorder.recovering ? "Gjenoppretter …" : recorder.phase == .saving ? "Lagrer …" : "Starter …")
          } else {
            TimelineView(.periodic(from: .now, by: 1)) { context in
              VStack(alignment: .leading, spacing: 6) {
                Text(recorder.phase == .paused ? "Pauset" : recorder.sport).font(.caption).foregroundStyle(lime)
                Text(recorder.formatTime(recorder.elapsed)).font(.system(size: 38, weight: .bold, design: .rounded)).monospacedDigit().minimumScaleFactor(0.6).lineLimit(1)
                  .accessibilityLabel("Tid \(recorder.formatTime(recorder.elapsed))")
                HStack(alignment: .firstTextBaseline) {
                  Text(String(format: "%.2f", recorder.distance / 1000)).font(.title2).bold().monospacedDigit()
                  Text("km").font(.caption).foregroundStyle(.secondary)
                  Spacer()
                }
                HStack {
                  VStack(alignment: .leading) { Text(recorder.pace).bold().monospacedDigit(); Text("min/km").font(.caption2).foregroundStyle(.secondary) }
                  Spacer()
                  VStack(alignment: .trailing) {
                    let fresh = recorder.heartRateAt.map { context.date.timeIntervalSince($0) < 30 } ?? false
                    Text(fresh ? String(format: "%.0f ♥", recorder.heartRate ?? 0) : "— ♥").bold().foregroundStyle(.red).monospacedDigit()
                    Text("slag/min").font(.caption2).foregroundStyle(.secondary)
                  }
                }
              }.frame(maxWidth: .infinity, alignment: .leading)
            }
            Button { recorder.phase == .paused ? recorder.resume() : recorder.pause() } label: {
              Label(recorder.phase == .paused ? "Fortsett" : "Pause", systemImage: recorder.phase == .paused ? "play.fill" : "pause.fill")
            }.tint(lime).foregroundStyle(.black).buttonStyle(.borderedProminent)
              .disabled(recorder.phase == .paused && !recorder.canResume)
            Button("Avslutt") { recorder.pause(); confirmEnd = true }
            Text(recorder.gpsMessage).font(.caption2).foregroundStyle(.secondary)
          }
          if !recorder.message.isEmpty { Text(recorder.message).font(.footnote).foregroundStyle(.secondary) }
        }.padding(.horizontal, 4)
      }
      .navigationTitle("VYRO")
      .confirmationDialog("Avslutte økten?", isPresented: $confirmEnd, titleVisibility: .visible) {
        Button("Lagre økt") { recorder.finish(save: true) }
        Button("Forkast økt", role: .destructive) { recorder.finish(save: false) }
        Button("Tilbake", role: .cancel) {}
      }
    }
  }
}
