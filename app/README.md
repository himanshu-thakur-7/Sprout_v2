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

## What's built (pass 1)

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

Not yet built: the weekly recap stories and dark recap card, and the lock screen and widgets (17–23).

## How it works

- **Data** lives on the device (AsyncStorage, `src/state/store.tsx`). Each day stores a count per habit plus the time it was logged.
- **Schedules** are the three "How often?" options: specific days (streak in days), N times a week (streak in weeks), and throughout the day (a reminder every N hours between 8 am and 10 pm; the day's target is the reminder count, so every 2 hours gives 8).
- **Streaks** (`src/state/logic.ts`): today counts once it's done but never breaks a streak while unfinished. Rest days are skipped. A shielded day holds the streak without adding to it.
- **The daily badge** counts only habits due today. Rest days, weeks that are already met, and paused habits sit in the dashed rows below the cards.
- **Shields**: everyone starts with one and earns another every 14 perfect days. When the most recent due day (or week) was missed with a live streak behind it, Today offers the Streak slipped sheet.
- **Reminders** (`src/state/reminders.ts`) are local notifications, scheduled only after the person says yes on step 04 or turns Reminders on in You.
- **Interaction**: tap a card to log it, and hold a card for its detail page. Progress rows also open the detail page.

## Notes on the design

- The hard ledge (`Ledge`) is a solid layer under the face, which moves down by the ledge height when pressed. Nothing uses a blurred shadow.
- Pip is ported part by part from `Pip.dc.html` (200 × 240 artboard, same named parts), so the art can move to Rive later. The idle breathe, blinks and the spring on mood changes are done in Reanimated.
- The prototype fakes the iOS status bar and home indicator. Here the real ones are used, with safe-area insets.
