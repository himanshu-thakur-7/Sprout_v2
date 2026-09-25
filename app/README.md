# Sprout

A calm habit tracker with Pip, a little seed that roots for you. Built with Expo (SDK 57), Expo Router, Reanimated 4 and react-native-svg, from the Claude Design handoff in `../project`.

## Run it

```bash
cd app
npm install
npx expo start          # then press i / a, or scan with Expo Go
npx expo start --web    # quick look in a browser
```

Checks: `npm run typecheck` and `npm run lint`.

To see a lived-in account, tap **I already have an account** on the welcome screen. There are no accounts yet, so it offers to load the sample garden from the designs: Water, Gym, Read, Meditate and Walk, with a few months of history.

## What's built

| Design | Where |
| --- | --- |
| Design system: tokens, hard-edge depth, icons, Pip | `src/theme`, `src/components` |
| 01–04 Onboarding (welcome, pick, rhythm, notifications) | `src/app/onboarding` |
| 05–07 Today (mid-day, evening dusk, empty) + dark mode | `src/app/(tabs)/index.tsx` |
| 08 Check-off moment (press, tick, confetti, flame, streak flip, Pip cheer) | `HabitCard`, `Confetti`, Today |
| 09 Perfect day | Today, `PerfectDay` |
| 10 Add habit sheet (also used for Edit) | `src/screens/AddHabitSheet.tsx` |
| 11–12 Habit detail (weekly and daily) | `src/app/habit/[id].tsx` |
| 13–14 Streak slipped and Shield used | `src/screens/SlipSheet.tsx` |
| 15 Progress (Week / Month) | `src/app/(tabs)/progress.tsx` |
| 16 You | `src/app/(tabs)/you.tsx` |
| 17–21 Weekly recap stories + dark recap card | `src/app/recap.tsx`, `src/screens/StoryCard.tsx`, `src/state/recap.ts` |
| 22 Lock screen notifications | `src/state/reminders.ts`, `src/state/nudge.ts`, Pip app icon in `assets/` |
| 23 Home screen widgets (iOS, small + medium) | `src/widgets/` |

## How it works

- **Data** lives on the device (AsyncStorage, `src/state/store.tsx`). Each day stores a count per habit plus the time it was logged.
- **Schedules** are the three "How often?" options: specific days (streak in days), N times a week (streak in weeks), and throughout the day (a reminder every N hours between 8 am and 10 pm; the day's target is the reminder count, so every 2 hours gives 8).
- **Streaks** (`src/state/logic.ts`): today counts once it's done but never breaks a streak while unfinished. Rest days are skipped. A shielded day holds the streak without adding to it.
- **The daily badge** counts only habits due today. Rest days, weeks that are already met, and paused habits sit in the dashed rows below the cards.
- **Shields**: everyone starts with one and earns another every 14 perfect days. When the most recent due day (or week) was missed with a live streak behind it, Today offers the Streak slipped sheet.
- **Reminders** (`src/state/reminders.ts`) are local notifications, scheduled only after the person says yes on step 04 or turns Reminders on in You.
- **Weekly recap**: offered on Today from Sunday to Wednesday until watched, and always reachable from Progress. It shows up to four habit cards (shield saves first, then perfect weeks, growing weekly streaks, steady weeks, and ones that "could use a little love"), then the week's total. Cards auto-advance after 5 s.
- **Evening nudge**: at 8 pm, if a streak of 2+ is at risk, one notification such as "Still time to keep your 11-day streak alive 🔥 / Four glasses to go before bed." It's rescheduled whenever today's logs change and cancelled once nothing is at risk.
- **Widgets** use `expo-widgets` (SwiftUI via `@expo/ui`). The app pushes a timeline (now, 8 pm dusk, midnight) and copies Pip's mood images (`assets/widget/`) into the shared app-group folder. Widgets need a development build (`npx expo run:ios` or EAS); they don't run in Expo Go, and Android widgets aren't built.
- **Interaction**: tap a card to log it, and hold a card for its detail page. Progress rows also open the detail page.

## Notes on the design

- The hard ledge (`Ledge`) is a solid layer under the face, which moves down by the ledge height when pressed. Nothing uses a blurred shadow.
- Pip is ported part by part from `Pip.dc.html` (200 × 240 artboard, same named parts), so the art can move to Rive later. The idle breathe, blinks and the spring on mood changes are done in Reanimated.
- The prototype fakes the iOS status bar and home indicator. Here the real ones are used, with safe-area insets.

## Design review (`design-review/REVIEW.md`)

The review's fixes are applied across the app: weekly habits only appear as due when logged today or when the week is at risk, the done style (tinted card, "Done · 8:05 am"), a bigger check-off beat, undo and milestone toasts, a perfect-day sequence that waits for the last check and plays once, pause ranges, a backfill calendar on habit detail, an Add/Edit sheet with an icon picker, reminder presets and 15-minute steps, Archive in the Edit sheet, a named Progress grid with blank weekly off-days, recaps that count habits kept, archived habits and a danger zone on You, and onboarding fixes (4 steps, clearer picks, inline custom habit, "Maybe later" leaves reminders off).

The Rive items (M1, M3–M5: `pip.riv`, `fx.riv`) need hand-made `.riv` files, so they aren't included. The same moments use Reanimated for now: Pip's sad/relieved/proud moods and tap reaction, the flame flare and "+1" chip, the shield drop and glow, and the perfect-day burst.
