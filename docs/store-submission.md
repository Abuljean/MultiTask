# App Store submission pack — Multitask Manager v1.0

Everything App Store Connect asks for, written out so it can be pasted in.
Written 2026-08-15. **iPhone only for v1** (iPad decision below).

---

## 0. Decisions locked for this release

| Thing | Decision |
|---|---|
| Platforms | **iPhone only.** iPad code is written and merged but `ios.supportsTablet` is `false`, because App Store Connect requires 13-inch iPad screenshots and no iPad was available to verify on or shoot with. Flipping the flag back to `true` is the whole v1.1 iPad release. |
| iOS version reach | **iOS 15.1 and up** — the floor of Expo SDK 54 / React Native 0.81, pinned explicitly in `app.json` via `expo-build-properties`. Nothing in the native stack requires more. |
| Widgets / Siri on old iOS | Widgets need iOS 17, Siri intents need iOS 16. Both are availability-guarded, so on iOS 15 and 16 they are simply absent and the app is otherwise complete. |
| Google Play | Deferred to v2 (CLAUDE.md decision 2026-07-26). |

---

## 1. App information

- **Name:** `Multitask Manager` (17 of 30 characters)
- **Subtitle:** `Tasks that work offline` (23 of 30)
- **Primary category:** Productivity
- **Secondary category:** Utilities
- **Bundle ID:** `com.abuljean.multitask`
- **SKU:** `multitask-ios-1`
- **Age rating:** 4+ — no objectionable content, no user-generated content shared between users, no unrestricted web access, no gambling, no ads.
- **Content rights:** contains no third-party content.

### URLs

| Field | Value |
|---|---|
| Support URL (required) | `https://multitask-web.onrender.com/support` |
| Privacy Policy URL (required) | `https://multitask-web.onrender.com/privacy` |
| Marketing URL (optional) | `https://multitask-web.onrender.com` |
| Terms (EULA) | Standard Apple EULA. `https://multitask-web.onrender.com/terms` also applies and is linked in-app. |

All three pages render without an account — verified signed out.

---

## 2. Listing copy

### Promotional text (170 max, editable without a new build)

```
Add a task in seconds, on a plane or on the subway. Everything syncs to your other devices the moment you are back online.
```

### Description

```
Multitask Manager is a task manager you'll actually keep using.

Adding a task takes about five seconds. Type the title, pick a time, done. Category, subject, priority and notes are all there if you want them, but they stay out of your way until you go looking.

WORKS OFFLINE

Everything saves to your device first, so you can add tasks on a plane and check them off on the subway. When you get a signal back it syncs to your other devices. It's the same app either way.

SEE WHAT'S URGENT

Every task has a status: ongoing, urgent, or overdue. As a deadline gets closer the card changes colour, weight and icon, so you can tell where things stand at a glance. You decide how many hours ahead counts as urgent.

FOUR VIEWS

Tasks groups everything by due date. Daily covers your repeating tasks plus whatever's due today. Calendar zooms from a year to a month to a single day on a real timeline. And there's search and filtering for when you just need to find one thing.

SMALLER STUFF

Swipe right to complete, left to delete. Undo works on both.
Notifications when a task turns urgent, and another shortly before it's due.
Home screen and lock screen widgets, and you can check a task off without opening the app.
Ask Siri to add a task.
Your tasks can show up in the iPhone Calendar app.
Import a schedule from CSV as either events or tasks.
Dark mode, with a light/dark toggle on every screen.
Full VoiceOver labels, Dynamic Type and reduced motion support.

YOUR DATA

No ads, no tracking, nothing sold. Ever. You can delete your account and everything in it from inside the app whenever you want.

Multitask Manager is free. I'm one developer, working on it on my own.
```

### Keywords (100 character limit, no spaces after commas)

```
todo,to-do,task list,planner,reminders,offline,due date,checklist,daily,productivity,deadline
```

(93 characters. Do not repeat words already in the app name or subtitle — Apple indexes those separately.)

### What's New (first release)

```
First release.
```

---

## 3. App Privacy answers (the nutrition label)

Answer **Yes** to "Do you or your third-party partners collect data from this app?", then declare exactly these. Everything below is **linked to the user's identity** except the diagnostics, and **nothing** is used for tracking.

| Data type | Collected | Linked to user | Purpose | Why |
|---|---|---|---|---|
| Contact Info → Email Address | Yes | Yes | App Functionality | The account identifier. |
| User Content → Photos or Videos | Yes | Yes | App Functionality | Optional profile picture only. |
| User Content → Other User Content | Yes | Yes | App Functionality | Task and event titles, notes, categories. |
| Identifiers → User ID | Yes | Yes | App Functionality | The Supabase auth user id that owns every row. |
| Diagnostics → Crash Data | Yes | **No** | App Functionality | Sentry. `delete event.user`, `sendDefaultPii: false`, console breadcrumbs stripped, so crashes arrive with no identity and no task text attached. |

**Not collected** — say No to all of these: location, contacts, health, financial info, browsing history, search history, purchases, usage data, advertising data, sensitive info, and any other diagnostics beyond crash data.

**Tracking:** No. The app has no advertising identifier, no ad networks, no analytics SDK, and shares nothing with data brokers. Answer "No" to the tracking question, which produces the "Data Not Used to Track You" section.

Two disclosures the privacy policy already makes honestly, in case a reviewer cross-checks: profile photos live in a **public** storage bucket (anyone with the exact URL can view one, which is why the app says so before you upload), and deleted data can persist in encrypted database backups until those backups expire.

---

## 4. App Review information

### Demo account (required — the app is behind sign-in)

```
Email:    multitask.uitest.claude@gmail.com
Password: uitest-2026-multitask
```

Verified working 2026-08-15. It is email-confirmed and carries sample tasks.
**Do not delete this account until the app is approved.**

### Notes for the reviewer

```
Sign-in is required because the app's core purpose is keeping one person's
tasks in sync across their iPhone, other devices and the web app. There is
no per-device local-only mode; the account IS the sync.

The demo account above is ready to use and already contains sample tasks.

Account deletion: Settings tab, at the bottom, "Delete account". It asks for
confirmation twice and then permanently removes the account and all of its
data, with no waiting period and no need to contact us.

Optional permissions, all requested in context and all declinable without
losing core functionality:
- Notifications: reminders when a task becomes urgent and shortly before it
  is due.
- Calendar: OFF by default. Settings has a toggle that writes your tasks into
  a separate "Multitask" calendar and removes them when tasks are completed.
- Photos: only when choosing a profile picture.

There are no in-app purchases, no subscriptions, no ads, and no third-party
login providers, so Sign in with Apple does not apply.
```

### Export compliance

`ITSAppUsesNonExemptEncryption` is already `false` in `app.json`, so App Store Connect will not ask again. The app uses only standard HTTPS.

---

## 5. Screenshots

**iPhone 6.9-inch is the only required size** now that iPad is off. Apple scales these down for smaller iPhones automatically.

Six are ready in `store-assets/screenshots/` at exactly 1320x2868:

1. `01-tasks` — the task list with live statuses
2. `02-quick-add` — quick add open
3. `03-daily` — the Daily view
4. `04-calendar` — month calendar
5. `05-day-timeline` — a single day on the timeline
6. `06-week-list` — the week view

Upload in that order; the first two are what most people ever see.

---

## 6. The actual submission, in order

1. **Create the app record.** `eas submit` can do it, but doing it by hand at appstoreconnect.apple.com is clearer the first time: My Apps → + → New App → iOS → name, primary language, bundle ID `com.abuljean.multitask`, SKU `multitask-ios-1`.
2. **Fill in everything from sections 1 to 5 above.**
3. **Build for production:**
   ```bash
   npx eas build --platform ios --profile production
   ```
   `autoIncrement` is on and `appVersionSource` is `remote`, so the build number takes care of itself.
4. **Upload it:**
   ```bash
   npx eas submit --platform ios --latest
   ```
   It will ask for the Apple ID and, the first time, create the App Store Connect API key.
5. **TestFlight first.** Install on the developer's own iPhone from TestFlight and use it for a few real days. Everything in this repo has been verified on a dev build, never on a release build, and release builds differ (minified JS, no dev client, real notification entitlements).
6. **Submit for review** once TestFlight looks right.

### Before pressing submit — sanity checks

- [ ] `supabase/11-delete-account.sql` has been run (done 2026-08-15) and Delete account has been tried once on a throwaway account
- [ ] "Confirm email" is still ON in Supabase Auth — it is a security invariant, see REVIEW-REPORT.md
- [ ] PowerSync instance is running (it silently stopped once, on 2026-07-28)
- [ ] The Render site is live, since the store links to /support and /privacy
- [ ] Sign up as a brand-new user on a clean install and confirm the first-run tour works

---

## 7. Known review risks, and the honest answer to each

| Risk | Likelihood | Answer if it comes up |
|---|---|---|
| **5.1.1(v)** account deletion missing | Low — it is built | Point to Settings → Delete account. It is in the review notes. |
| **5.1.1** requiring sign-up for a task app | Low to medium | Cross-device sync is the product. The review note above says this up front. |
| **2.1** reviewer cannot get in | Low | The demo account is verified. Keep it alive. |
| **4.2** minimum functionality | Very low | It is a complete app with widgets, Siri, offline sync and import. |
| **2.3.10** screenshots showing non-app content | Very low | Every screenshot is the real app on real data. |
