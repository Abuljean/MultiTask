// Siri App Intents ("add a task by voice" — the roadmap's voice MUST, v1).
// Same delivery pattern the widget check-off proved out: the intent writes a
// request into the App Group, the app drains it on foreground through the
// normal optimistic mutation path (hooks/use-siri-actions.ts). No direct DB
// writes from intent processes — sync/RLS stay the single write path.
import AppIntents
import Foundation

let siriAppGroup = "group.com.abuljean.multitask"
let pendingTasksKey = "siri.pendingTasks"
let openQuickAddKey = "siri.openQuickAdd"

@available(iOS 16.0, *)
struct AddTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "Add a Task"
  static var description = IntentDescription("Adds a task to Multitask. It appears the next time the app opens and syncs everywhere.")
  static var openAppWhenRun = false

  @Parameter(title: "Task", requestValueDialog: "What's the task?")
  var text: String

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let defaults = UserDefaults(suiteName: siriAppGroup)
    var pending: [[String: Any]] = []
    if let raw = defaults?.string(forKey: pendingTasksKey),
       let data = raw.data(using: .utf8),
       let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
      pending = arr
    }
    pending.append(["title": text])
    if let data = try? JSONSerialization.data(withJSONObject: pending),
       let str = String(data: data, encoding: .utf8) {
      defaults?.set(str, forKey: pendingTasksKey)
    }
    return .result(dialog: "Added “\(text)” to Multitask.")
  }
}

@available(iOS 16.0, *)
struct QuickAddIntent: AppIntent {
  static var title: LocalizedStringResource = "Quick Add"
  static var description = IntentDescription("Opens Multitask straight to the quick-add sheet.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    UserDefaults(suiteName: siriAppGroup)?.set(true, forKey: openQuickAddKey)
    return .result()
  }
}

// Phrases cannot embed free-text parameters (String isn't an AppEnum), so
// the phrase opens the flow and Siri asks "What's the task?" via the
// parameter dialog.
@available(iOS 16.0, *)
struct MultitaskShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddTaskIntent(),
      phrases: [
        "Add a task in \(.applicationName)",
        "New task in \(.applicationName)",
      ],
      shortTitle: "Add task",
      systemImageName: "plus.circle"
    )
    AppShortcut(
      intent: QuickAddIntent(),
      phrases: ["Quick add in \(.applicationName)"],
      shortTitle: "Quick add",
      systemImageName: "square.and.pencil"
    )
  }
}
