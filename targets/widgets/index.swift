// Multitask widgets — home screen (small/medium/large) + lock screen
// (rectangular/circular). A dumb renderer by design: the app writes a
// ready-to-show JSON snapshot into the App Group (lib/widgets/snapshot-data.ts
// does the thinking); this file decodes and lays it out.
//
// The check button TOGGLES (complete ⇄ un-complete), queueing {id, done} in
// the App Group; the app consumes the queue on foreground through its normal
// optimistic mutation path. Events render distinct from tasks and aren't
// completable. iOS widgets can't scroll (static snapshots), so "more" means a
// larger family — and when nothing's due today the small widget falls back to
// upcoming-urgent, then the next day with tasks.
import AppIntents
import SwiftUI
import WidgetKit

let appGroup = "group.com.abuljean.multitask"
let snapshotKey = "widget.snapshot"
let pendingKey = "widget.pendingCompletions"

let eventColor = Color(red: 0.145, green: 0.388, blue: 0.922) // #2563EB

// MARK: - Snapshot model (mirrors lib/widgets/snapshot-data.ts)

struct WidgetTaskItem: Decodable, Identifiable {
  let id: Int
  let title: String
  let dueLabel: String
  let status: String
  let done: Bool
}

struct WidgetEventItem: Decodable, Identifiable {
  let id: Int
  let title: String
  let timeLabel: String
}

struct WidgetFallback: Decodable {
  let kind: String
  let count: Int?
  let title: String?
  let dueLabel: String?
  let dayLabel: String?
}

struct SnapshotPayload: Decodable {
  let dateLabel: String
  let today: [WidgetTaskItem]
  let events: [WidgetEventItem]
  let openCount: Int
  let fallback: WidgetFallback?
}

func loadSnapshot() -> SnapshotPayload? {
  guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
        let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(SnapshotPayload.self, from: data)
}

/// The widget's own optimistic view of check-offs the user just tapped, before
/// the app has processed them: id -> desired done state.
func pendingToggles() -> [Int: Bool] {
  guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: pendingKey),
        let data = raw.data(using: .utf8),
        let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
  else { return [:] }
  var map: [Int: Bool] = [:]
  for item in arr {
    if let id = item["id"] as? Int { map[id] = (item["done"] as? Bool) ?? true }
  }
  return map
}

// Status accents from lib/theme/tokens.ts (light-mode values; the system
// dims them acceptably in dark widgets for a first scaffold).
func statusColor(_ status: String) -> Color {
  switch status {
  case "overdue":
    return Color(red: 0.863, green: 0.149, blue: 0.149) // #DC2626
  case "urgent":
    return Color(red: 0.918, green: 0.345, blue: 0.047) // #EA580C
  case "ongoing":
    return Color(red: 0.086, green: 0.639, blue: 0.290) // #16A34A
  default:
    return .secondary
  }
}

// MARK: - Timeline

struct TaskEntry: TimelineEntry {
  let date: Date
  let snapshot: SnapshotPayload?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> TaskEntry {
    TaskEntry(date: Date(), snapshot: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> Void) {
    completion(TaskEntry(date: Date(), snapshot: loadSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TaskEntry>) -> Void) {
    let entry = TaskEntry(date: Date(), snapshot: loadSnapshot())
    let refresh = Date().addingTimeInterval(30 * 60)
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }
}

// MARK: - Toggle intent (queued; the app applies on foreground)

struct ToggleTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "Toggle Task"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Task ID") var taskId: Int
  @Parameter(title: "Complete") var complete: Bool

  init() {}

  init(taskId: Int, complete: Bool) {
    self.taskId = taskId
    self.complete = complete
  }

  func perform() async throws -> some IntentResult {
    let defaults = UserDefaults(suiteName: appGroup)
    var items: [[String: Any]] = []
    if let raw = defaults?.string(forKey: pendingKey),
       let data = raw.data(using: .utf8),
       let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
      items = arr
    }
    items.removeAll { ($0["id"] as? Int) == taskId }
    items.append(["id": taskId, "done": complete])
    if let data = try? JSONSerialization.data(withJSONObject: items),
       let str = String(data: data, encoding: .utf8) {
      defaults?.set(str, forKey: pendingKey)
    }
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}

// MARK: - Rows

struct TaskRow: View {
  let task: WidgetTaskItem
  let pendingMap: [Int: Bool]

  var effectiveDone: Bool { pendingMap[task.id] ?? task.done }

  var body: some View {
    HStack(spacing: 8) {
      RoundedRectangle(cornerRadius: 1.5)
        .fill(effectiveDone ? Color.secondary : statusColor(task.status))
        .frame(width: 3, height: 26)
      VStack(alignment: .leading, spacing: 1) {
        Text(task.title)
          .font(.system(size: 13, weight: .semibold))
          .lineLimit(1)
          .strikethrough(effectiveDone)
          .foregroundStyle(effectiveDone ? .secondary : .primary)
        Text(task.dueLabel)
          .font(.system(size: 10, design: .monospaced))
          .foregroundStyle(!effectiveDone && task.status == "overdue" ? statusColor("overdue") : Color.secondary)
      }
      Spacer(minLength: 0)
      Button(intent: ToggleTaskIntent(taskId: task.id, complete: !effectiveDone)) {
        Image(systemName: effectiveDone ? "checkmark.circle.fill" : "circle")
          .font(.system(size: 18))
          .foregroundStyle(effectiveDone ? Color.secondary : statusColor(task.status))
      }
      .buttonStyle(.plain)
    }
  }
}

struct EventRow: View {
  let event: WidgetEventItem

  var body: some View {
    HStack(spacing: 8) {
      Image(systemName: "calendar")
        .font(.system(size: 12))
        .foregroundStyle(eventColor)
        .frame(width: 14)
      Text(event.title)
        .font(.system(size: 13, weight: .medium))
        .lineLimit(1)
      Spacer(minLength: 0)
      Text(event.timeLabel)
        .font(.system(size: 10, design: .monospaced))
        .foregroundStyle(eventColor)
    }
  }
}

struct FallbackView: View {
  let fallback: WidgetFallback?

  var body: some View {
    if let f = fallback {
      switch f.kind {
      case "urgent":
        VStack(alignment: .leading, spacing: 2) {
          Text("\(f.count ?? 0) urgent soon")
            .font(.system(size: 13, weight: .semibold))
          if let t = f.title {
            Text(t).font(.system(size: 12)).lineLimit(1).foregroundStyle(.secondary)
          }
          if let d = f.dueLabel {
            Text(d).font(.system(size: 10, design: .monospaced)).foregroundStyle(.secondary)
          }
        }
      case "nextDay":
        VStack(alignment: .leading, spacing: 2) {
          Text("Next: \(f.dayLabel ?? "")")
            .font(.system(size: 12, weight: .medium)).foregroundStyle(.secondary)
          if let t = f.title {
            Text(t).font(.system(size: 13, weight: .semibold)).lineLimit(1)
          }
          if let c = f.count, c > 1 {
            Text("+\(c - 1) more that day").font(.system(size: 10)).foregroundStyle(.secondary)
          }
        }
      default:
        Text("Nothing scheduled").font(.system(size: 12, weight: .medium)).foregroundStyle(.secondary)
      }
    } else {
      Text("Nothing due today").font(.system(size: 12, weight: .medium)).foregroundStyle(.secondary)
    }
  }
}

// MARK: - Main view

struct MultitaskWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: TaskEntry

  var snapshot: SnapshotPayload? { entry.snapshot }
  var tasks: [WidgetTaskItem] { snapshot?.today ?? [] }
  var events: [WidgetEventItem] { snapshot?.events ?? [] }
  var openCount: Int { snapshot?.openCount ?? 0 }
  var dateLabel: String { snapshot?.dateLabel ?? "Today" }
  var pendingMap: [Int: Bool] { pendingToggles() }

  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          Text("\(openCount)").font(.system(size: 20, weight: .bold, design: .rounded))
          Text("due").font(.system(size: 9)).foregroundStyle(.secondary)
        }
      }
    case .accessoryRectangular:
      rectangular
    case .systemMedium:
      listWidget(taskLimit: 3, eventLimit: 2)
    case .systemLarge:
      listWidget(taskLimit: 7, eventLimit: 4)
    default: // .systemSmall
      small
    }
  }

  // Lock-screen rectangular: one line — top task, else event, else fallback.
  @ViewBuilder private var rectangular: some View {
    if openCount > 0, let top = tasks.first {
      VStack(alignment: .leading, spacing: 1) {
        Text(top.title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
        Text(top.dueLabel).font(.system(size: 11, design: .monospaced))
        if openCount > 1 {
          Text("+\(openCount - 1) more today").font(.system(size: 10)).foregroundStyle(.secondary)
        }
      }
    } else if let ev = events.first {
      VStack(alignment: .leading, spacing: 1) {
        Text(ev.title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
        Text(ev.timeLabel).font(.system(size: 11, design: .monospaced))
      }
    } else {
      FallbackView(fallback: snapshot?.fallback)
    }
  }

  // Home small: date + the single most important thing, with smart fallback.
  @ViewBuilder private var small: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(dateLabel).font(.system(size: 10, design: .monospaced)).foregroundStyle(.secondary)
      Spacer(minLength: 0)
      if openCount > 0, let top = tasks.first {
        RoundedRectangle(cornerRadius: 1.5).fill(statusColor(top.status)).frame(width: 24, height: 3)
        Text(top.title).font(.system(size: 14, weight: .semibold)).lineLimit(2)
        Text(top.dueLabel)
          .font(.system(size: 11, design: .monospaced))
          .foregroundStyle(top.status == "overdue" ? statusColor("overdue") : Color.secondary)
        if openCount > 1 {
          Text("+\(openCount - 1) more").font(.system(size: 10)).foregroundStyle(.secondary)
        }
      } else if let ev = events.first {
        Image(systemName: "calendar").font(.system(size: 12)).foregroundStyle(eventColor)
        Text(ev.title).font(.system(size: 14, weight: .semibold)).lineLimit(2)
        Text(ev.timeLabel).font(.system(size: 11, design: .monospaced)).foregroundStyle(eventColor)
        if events.count > 1 {
          Text("+\(events.count - 1) more event\(events.count - 1 == 1 ? "" : "s")")
            .font(.system(size: 10)).foregroundStyle(.secondary)
        }
      } else {
        FallbackView(fallback: snapshot?.fallback)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  // Home medium/large: header + task rows (with toggle) then event rows.
  @ViewBuilder private func listWidget(taskLimit: Int, eventLimit: Int) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text(dateLabel).font(.system(size: 11, design: .monospaced)).foregroundStyle(.secondary)
        Spacer()
        if openCount > 0 {
          Text("\(openCount) due").font(.system(size: 11, weight: .medium)).foregroundStyle(.secondary)
        }
      }
      if tasks.isEmpty && events.isEmpty {
        Spacer()
        FallbackView(fallback: snapshot?.fallback)
        Spacer()
      } else {
        ForEach(tasks.prefix(taskLimit)) { task in
          TaskRow(task: task, pendingMap: pendingMap)
        }
        if !events.isEmpty {
          ForEach(events.prefix(eventLimit)) { event in
            EventRow(event: event)
          }
        }
        Spacer(minLength: 0)
      }
    }
  }
}

func deepLink(for entry: TaskEntry) -> URL? {
  if let top = entry.snapshot?.today.first {
    return URL(string: "multitask:///task/\(top.id)")
  }
  if let ev = entry.snapshot?.events.first {
    return URL(string: "multitask:///event/\(ev.id)")
  }
  return URL(string: "multitask:///")
}

// MARK: - Widget declaration

struct MultitaskWidget: Widget {
  let kind: String = "MultitaskWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      MultitaskWidgetView(entry: entry)
        .containerBackground(.background, for: .widget)
        .widgetURL(deepLink(for: entry))
    }
    .configurationDisplayName("Today's tasks")
    .description("Overdue first, then events and what's next.")
    .supportedFamilies([
      .systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryCircular,
    ])
  }
}

@main
struct MultitaskWidgets: WidgetBundle {
  var body: some Widget {
    MultitaskWidget()
  }
}
