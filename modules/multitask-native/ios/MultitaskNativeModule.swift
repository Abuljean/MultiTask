// Local Expo module compiled INTO the main app binary (required home for
// Spotlight indexing and Siri App Shortcuts — extensions can't provide
// either). JS reaches it through the guarded gateway lib/native/system.ts;
// on any build lacking this module the gateway soft-fails and features
// report unavailable.
import CoreSpotlight
import ExpoModulesCore

public class MultitaskNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MultitaskNative")

    // Replace the whole task index (reconcile-style, like notifications):
    // delete our domain, re-add current open tasks. Items: {id, title, due}.
    AsyncFunction("indexTasks") { (items: [[String: Any]]) in
      let index = CSSearchableIndex.default()
      try await index.deleteSearchableItems(withDomainIdentifiers: ["tasks"])
      var searchable: [CSSearchableItem] = []
      for item in items {
        guard let id = item["id"] as? Int, let title = item["title"] as? String else { continue }
        let attrs = CSSearchableItemAttributeSet(contentType: .content)
        attrs.title = title
        attrs.contentDescription = item["due"] as? String
        searchable.append(
          CSSearchableItem(
            uniqueIdentifier: "task-\(id)",
            domainIdentifier: "tasks",
            attributeSet: attrs
          )
        )
      }
      try await index.indexSearchableItems(searchable)
    }

    // Sign-out hygiene: a signed-out device must not keep offering the
    // previous user's tasks in system search.
    AsyncFunction("clearIndex") {
      try await CSSearchableIndex.default().deleteSearchableItems(withDomainIdentifiers: ["tasks"])
    }
  }
}

/// Tapping a task in Spotlight hands the app an NSUserActivity, not a URL —
/// convert it to the task deep link so expo-router takes over.
public class SpotlightAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    guard userActivity.activityType == CSSearchableItemActionType,
          let raw = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String,
          raw.hasPrefix("task-"),
          let url = URL(string: "multitask:///task/\(raw.dropFirst(5))")
    else { return false }
    UIApplication.shared.open(url)
    return true
  }
}
