// Multitask widgets — home screen (small/medium) + lock screen (rectangular/
// circular). A dumb renderer by design: the app writes a ready-to-show JSON
// snapshot into the App Group (lib/widgets/snapshot-data.ts does the
// thinking); this file just decodes and lays it out. The Complete button
// queues task ids in the App Group; the app consumes the queue on foreground
// through its normal mutation path (true from-widget DB writes are v2).
import AppIntents
import SwiftUI
import WidgetKit

let appGroup = "group.com.abuljean.multitask"
let snapshotKey = "widget.snapshot"
let pendingKey = "widget.pendingCompletions"

// MARK: - Snapshot model (mirrors lib/widgets/snapshot-data.ts)

struct WidgetTaskItem: Decodable, Identifiable {
  let id: Int
  let title: String
  let dueLabel: String
  let status: String
}

struct SnapshotPayload: Decodable {
  let dateLabel: String
  let today: [WidgetTaskItem]
  let next: WidgetTaskItem?
  let openCount: Int
}

func loadSnapshot() -> SnapshotPayload? {
  guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
        let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(SnapshotPayload.self, from: data)
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

// MARK: - Check-off intent (queued; the app consumes on foreground)

struct CompleteTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "Complete Task"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Task ID")
  var taskId: Int

  init() {}

  init(taskId: Int) {
    self.taskId = taskId
  }

  func perform() async throws -> some IntentResult {
    let defaults = UserDefaults(suiteName: appGroup)
    var pending = defaults?.array(forKey: pendingKey) as? [Int] ?? []
    if !pending.contains(taskId) {
      pending.append(taskId)
    }
    defaults?.set(pending, forKey: pendingKey)
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}

// MARK: - Views

struct TaskRow: View {
  let task: WidgetTaskItem
  let pending: Bool

  var body: some View {
    HStack(spacing: 8) {
      RoundedRectangle(cornerRadius: 1.5)
        .fill(statusColor(task.status))
        .frame(width: 3, height: 26)
      VStack(alignment: .leading, spacing: 1) {
        Text(task.title)
          .font(.system(size: 13, weight: .semibold))
          .lineLimit(1)
          .strikethrough(pending)
          .foregroundStyle(pending ? .secondary : .primary)
        Text(task.dueLabel)
          .font(.system(size: 10, design: .monospaced))
          .foregroundStyle(task.status == "overdue" ? statusColor("overdue") : Color.secondary)
      }
      Spacer(minLength: 0)
      Button(intent: CompleteTaskIntent(taskId: task.id)) {
        Image(systemName: pending ? "checkmark.circle.fill" : "circle")
          .font(.system(size: 18))
          .foregroundStyle(pending ? Color.secondary : statusColor(task.status))
      }
      .buttonStyle(.plain)
    }
  }
}

struct EmptyLine: View {
  let snapshot: SnapshotPayload?

  var body: some View {
    if let next = snapshot?.next {
      VStack(alignment: .leading, spacing: 2) {
        Text("Nothing due today")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(.secondary)
        Text("Next: \(next.title)")
          .font(.system(size: 13, weight: .semibold))
          .lineLimit(1)
        Text(next.dueLabel)
          .font(.system(size: 10, design: .monospaced))
          .foregroundStyle(.secondary)
      }
    } else {
      Text("Nothing due today")
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(.secondary)
    }
  }
}

struct MultitaskWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: TaskEntry

  private var pendingIds: [Int] {
    UserDefaults(suiteName: appGroup)?.array(forKey: pendingKey) as? [Int] ?? []
  }

  private var tasks: [WidgetTaskItem] {
    entry.snapshot?.today ?? []
  }

  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          Text("\(entry.snapshot?.openCount ?? 0)")
            .font(.system(size: 20, weight: .bold, design: .rounded))
          Text("due")
            .font(.system(size: 9))
            .foregroundStyle(.secondary)
        }
      }
    case .accessoryRectangular:
      if let top = tasks.first {
        VStack(alignment: .leading, spacing: 1) {
          Text(top.title)
            .font(.system(size: 13, weight: .semibold))
            .lineLimit(1)
          Text(top.dueLabel)
            .font(.system(size: 11, design: .monospaced))
          if tasks.count > 1 {
            Text("+\((entry.snapshot?.openCount ?? tasks.count) - 1) more today")
              .font(.system(size: 10))
              .foregroundStyle(.secondary)
          }
        }
      } else {
        EmptyLine(snapshot: entry.snapshot)
      }
    case .systemMedium:
      VStack(alignment: .leading, spacing: 6) {
        HStack {
          Text(entry.snapshot?.dateLabel ?? "Today")
            .font(.system(size: 11, design: .monospaced))
            .foregroundStyle(.secondary)
          Spacer()
          if let count = entry.snapshot?.openCount, count > 0 {
            Text("\(count) due")
              .font(.system(size: 11, weight: .medium))
              .foregroundStyle(.secondary)
          }
        }
        if tasks.isEmpty {
          Spacer()
          EmptyLine(snapshot: entry.snapshot)
          Spacer()
        } else {
          ForEach(tasks.prefix(3)) { task in
            TaskRow(task: task, pending: pendingIds.contains(task.id))
          }
          Spacer(minLength: 0)
        }
      }
    default: // .systemSmall
      VStack(alignment: .leading, spacing: 4) {
        Text(entry.snapshot?.dateLabel ?? "Today")
          .font(.system(size: 10, design: .monospaced))
          .foregroundStyle(.secondary)
        if let top = tasks.first {
          Spacer(minLength: 0)
          RoundedRectangle(cornerRadius: 1.5)
            .fill(statusColor(top.status))
            .frame(width: 24, height: 3)
          Text(top.title)
            .font(.system(size: 14, weight: .semibold))
            .lineLimit(2)
          Text(top.dueLabel)
            .font(.system(size: 11, design: .monospaced))
            .foregroundStyle(top.status == "overdue" ? statusColor("overdue") : Color.secondary)
          if (entry.snapshot?.openCount ?? 0) > 1 {
            Text("+\((entry.snapshot?.openCount ?? 1) - 1) more")
              .font(.system(size: 10))
              .foregroundStyle(.secondary)
          }
        } else {
          Spacer(minLength: 0)
          EmptyLine(snapshot: entry.snapshot)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }
}

func deepLink(for entry: TaskEntry) -> URL? {
  if let top = entry.snapshot?.today.first ?? entry.snapshot?.next {
    return URL(string: "multitask:///task/\(top.id)")
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
    .description("Overdue first, then what's next.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
  }
}

@main
struct MultitaskWidgets: WidgetBundle {
  var body: some Widget {
    MultitaskWidget()
  }
}
